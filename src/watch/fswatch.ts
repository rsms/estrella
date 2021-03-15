import * as Path from "path"
import * as chokidar from "chokidar"

import { WatchOptions, WatchCallback, FileEvent, FileEvent1, FileEvent2 } from "../../estrella.d"

import { repr, clock, fmtDuration } from "../util"
import log from "../log"

type ChangeEvent = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'
type CancellablePromise<T> = Promise<T>&{ cancel(reason?:any):void }

export interface FSWatcherOptions extends WatchOptions {
  isChangeSelfOriginating(filename :string) :boolean
}


export class FSWatcher {
  options :FSWatcherOptions
  promise :CancellablePromise<void>
  basedir :string = ""

  onStart? :()=>{}
  onChange? :WatchCallback

  _resolve = (_?:void|PromiseLike<void>|undefined, _rejectReason?:any)=>{}
  _cancelled :boolean = false
  _watcher :chokidar.FSWatcher | null = null
  _fileset = new Set<string>()   // observed files


  constructor(options :FSWatcherOptions) {
    this.options = options
    this.promise = new Promise<void>(r => {
      this._resolve = r
    }) as CancellablePromise<void>
    this.promise.cancel = () => {
      this._cancelled = true
    }
  }


  setFiles(files :Iterable<string>) {
    const newfileset = new Set(files)

    if (!this._watcher) {
      this._fileset = newfileset
      this._start()
      return
    }

    // find files being added and removed
    let gonefiles :string[] = []
    for (let f of this._fileset) {
      if (!newfileset.has(f)) {
        gonefiles.push(f)
      }
    }
    let addfiles :string[] = []
    for (let f of newfileset) {
      if (!this._fileset.has(f)) {
        addfiles.push(f)
      }
    }

    this._fileset = newfileset

    if (gonefiles.length > 0) {
      log.debug(()=> `fswatch stop watching files ${this._relnames(gonefiles)}`)
      this._watcher.unwatch(gonefiles)
    }

    if (addfiles.length > 0) {
      log.debug(()=> `fswatch start watching files ${this._relnames(addfiles)}`)
      this._watcher.add(addfiles)
    }
  }


  close() :Promise<void> {
    if (!this._watcher) {
      return Promise.resolve()
    }
    log.debug(()=> `fswatch closing`)
    this._watcher.close()
      .then(() => this._resolve())
      .catch(err => this._resolve(undefined, err))
    this._watcher = null
    return this.promise
  }


  _relnames(filenames :string[]) :string {
    if (filenames.length == 1) {
      return this._relname(filenames[0])
    }
    return filenames.map(fn => "\n  " + this._relname(fn)).join("")
  }


  _relname(fn :string) :string {
    if (this.basedir && fn.startsWith(this.basedir)) {
      return Path.relative(this.basedir, fn)
    }
    return Path.relative(process.cwd(), fn)
  }


  _start() {
    if (this._cancelled) {
      return
    }

    const initialFiles = Array.from(this._fileset)
    if (initialFiles.length == 0) {
      // chokidar has some odd behavior (bug?) where starting a watcher in "persistent" mode
      // without initial files to watch causes it to not prevent the program runloop from ending.
      return
    }

    if (this.basedir) {
      this.basedir = Path.resolve(this.basedir)
    }

    let flushLatency = 50
    let filter :RegExp|null = null

    // copy user options and extract non-chokidar options
    const options :WatchOptions = {...this.options}
    if (typeof options.latency == "number") {
      flushLatency = options.latency
      delete options.latency
    }
    if (options.filter) {
      filter = options.filter
      delete options.filter
    }

    // build chokidar options from default options + user options + required options
    const chokidarOptions :chokidar.WatchOptions = {
      disableGlobbing: true,
      followSymlinks: false,

      // ups the reliability of change events
      awaitWriteFinish: {
        stabilityThreshold: 20,
        pollInterval: 100,
      },

      // user options may override any options listed above
      ...options,

      // required options; for guaranteeing the promised semantics of FSWatcher
      persistent: true,
      ignoreInitial: true,
    }

    let changedFiles = new Map<string,FileEvent>() // changed files (to be flushed to callback)
    let timer :any = null

    const flush = () => {
      timer = null
      const p = this.onChange ? this.onChange(Array.from(changedFiles.values())) : null
      changedFiles.clear()
      if (p instanceof Promise) {
        // pause dispatch (just enqueue) until resolved
        p.then(() => {
          timer = null
          if (changedFiles.size > 0) {
            // changes recorded while waiting for promise; flush again
            flush()
          }
        }).catch(err => {
          this.promise.cancel(err)
        })
        timer = 1 // this prevents flushing
      }
    }

    const scheduleFlush = () => {
      if (timer === null) {
        timer = setTimeout(flush, flushLatency)
      }
    }

    const maybeFilter = (file :string) => {
      if (filter && !filter.test(file)) {
        log.debug(()=>`fswatch ignoring ${file} (filter)`)
        return true
      }
      return false
    }

    // macOS issues two consecutive "move" events when a file is renamed
    // This contains state of a previous move event
    const renameState = {
      time: 0 as number, // clock() when oldname event was recorded
      oldname: "",
      newname: "INIT",
    }

    const onchange = (ev :ChangeEvent, file :string) => {
      if (this.options.isChangeSelfOriginating(file)) {
        log.debug(()=> `fswatch ignoring self-originating event ${ev} ${file}`)
        return
      }
      if (maybeFilter(file)) {
        return
      }
      log.debug(()=> `fsevent ${repr(ev)} ${repr(file)}`)
      const evmap :{[k:string]:FileEvent["type"]} = { // map chokidar event name to our event names
        'addDir':"add",
        'unlink':"delete",
        'unlinkDir':"delete",
      }
      if (ev != "unlink" || !changedFiles.has(file) || changedFiles.get(file)!.type != "move") {
        changedFiles.set(file, {
          type: evmap[ev] || ev,
          name: file,
        } as FileEvent1)
      }
      scheduleFlush()
    }

    const onRawEvent = (ev: string, file: string, details: any) => {
      if (ev != "moved") {
        // note: we only care about "moved" here; other events are handled by onchange
        return
      }
      file = this._relname(file)
      log.debug(()=> `fsevent (raw) ${repr(ev)} ${repr(file)} ${repr(details)}`)
      if (maybeFilter(file)) {
        return
      }
      const time = clock()
      const timeWindow = 100 // ms
      if (renameState.newname != "") {
        // start of a new pair of "moved" events
        renameState.oldname = file
        renameState.newname = ""
        renameState.time = time
      } else {
        // end of a pair of "moved" events
        renameState.newname = file
        renameState.time = time
        if (time - renameState.time <= timeWindow) {
          // this is the second of two move events
          log.debug(`fsevent (derived) move ${renameState.oldname} -> ${file}`)
          if (this._watcher) {
            this._watcher.add(file)
            this._fileset.add(file)
            this._watcher.unwatch(renameState.oldname)
            this._fileset.delete(renameState.oldname)
          }
          changedFiles.delete(renameState.oldname)
          changedFiles.set(renameState.oldname, {
            type: "move",
            name: renameState.oldname,
            newname: file,
          } as FileEvent2)
          scheduleFlush()
        }
      }
    }

    this.promise.cancel = (reason? :any) => {
      log.debug(`fswatcher is being cancelled`)
      clearTimeout(timer)
      if (!this._cancelled) {
        this._cancelled = true
        this.close()
      }
      if (reason) {
        this._resolve(undefined, reason)
      }
    }

    const time = clock()

    this._watcher = chokidar.watch(initialFiles, chokidarOptions)
      .on('all', onchange)
      .on('raw', onRawEvent)
      .on('error', error => log.warn(`fswatch ${error}`))
      .on('ready', () => {
        log.debug(()=>`fswatch initial scan complete (${fmtDuration(clock() - time)})`)
        this.onStart && this.onStart()
      })
  }
}
