import * as Path from "path"
import * as chokidar from "chokidar"

import { WatchOptions, WatchCallback } from "../../estrella.d"

import { fileWasModifiedRecentlyByUser } from "../file"
import { repr, clock, fmtDuration } from "../util"
import log from "../log"

type ChangeEvent = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'
type CancellablePromise<T> = Promise<T>&{ cancel(reason?:any):void }


export class FSWatcher {
  options :WatchOptions
  promise :CancellablePromise<void>
  basedir :string = ""

  onStart? :()=>{}
  onChange? :WatchCallback

  _resolve = (_?:void|PromiseLike<void>|undefined, _rejectReason?:any)=>{}
  _cancelled :boolean = false
  _watcher :chokidar.FSWatcher | null = null
  _fileset = new Set<string>()   // observed files


  constructor(options :WatchOptions) {
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
    if (this.basedir) {
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

    const changedFiles = new Set<string>() // changed files (to be flushed to callback)
    let timer :any = null

    const flush = () => {
      timer = null
      const p = this.onChange ? this.onChange(Array.from(changedFiles)) : null
      changedFiles.clear()
      if (p instanceof Promise) {
        // pause dispatch (just enqueue) until resolved
        p.then(() => {
          timer = null
          if (changedFiles.size > 0) {
            flush()
          }
        }).catch(err => {
          this.promise.cancel(err)
        })
        timer = 1 // this prevents flushing
      }
    }

    const onchange = (ev :ChangeEvent, file :string) => {
      if (fileWasModifiedRecentlyByUser(file)) {
        log.debug(()=> `fswatch ignoring self-originating event ${ev} ${file}`)
        return
      }
      if (filter && !filter.test(file)) {
        log.debug(()=>`fswatch ignoring ${ev} ${file} (filter)`)
        return
      }
      log.debug(()=> `fsevent ${ev} ${repr(file)}`)
      changedFiles.add(file)
      if (timer === null) {
        timer = setTimeout(flush, flushLatency)
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
      .on('error', error => log.warn(`fswatch ${error}`))
      .on('ready', () => {
        log.debug(()=>`fswatch initial scan complete (${fmtDuration(clock() - time)})`)
        this.onStart && this.onStart()
      })
  }
}
