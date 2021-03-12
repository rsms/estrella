import * as filepath from "path"
import { Metafile as ESBuildMetafile } from "esbuild"
import { WatchOptions, WatchCallback, CancellablePromise, FileEvent } from "../../estrella.d"
import { BuildConfig, BuildContext } from "../config"
import * as _file from "../file"
import { log, LogLevel } from "../log"
import { repr } from "../util"

import { FSWatcher, FSWatcherOptions } from "./fswatch"


type FileModule = typeof _file
let file :FileModule


export function initModule(logLevel :LogLevel, filem :FileModule) {
  log.level = logLevel
  file = filem
}

function makeFSWatcherOptions(options :WatchOptions) :FSWatcherOptions {
  return {
    ...options,
    isChangeSelfOriginating(filename :string) :boolean {
      return file.fileWasModifiedRecentlyByUser(filename)
    },
  }
}


let fswatcherMap = new Map<string,FSWatcher>() // projectID => FSWatcher


// used by estrella itself, when config.watch is enabled
export async function watchFiles(
  config         :BuildConfig,
  getESBuildMeta :()=>ESBuildMetafile|null,
  ctx            :BuildContext,
  callback       :(changes :FileEvent[]) => Promise<void>,
) :Promise<void> {
  const projectID = config.projectID
  let fswatcher = fswatcherMap.get(projectID)

  if (!fswatcher) {
    const watchOptions = config.watch && typeof config.watch == "object" ? config.watch : {}
    fswatcher = new FSWatcher(makeFSWatcherOptions(watchOptions))
    fswatcherMap.set(projectID, fswatcher)
    fswatcher.basedir = config.cwd || process.cwd()
    fswatcher.onChange = (changes) => {
      // invoke the callback, which in turn rebuilds the project and writes a fresh
      // esbuild metafile which we then read in refreshFiles.
      callback(changes).then(refreshFiles)
    }
    ctx.addCancelCallback(() => {
      fswatcher!.promise.cancel()
    })
    log.debug(`fswatch started for project#${projectID}`)
  }

  function refreshFiles() {
    // Read metadata produced by esbuild, describing source files and product files.
    // The metadata may be null or have a missing inputs prop in case esbuild failed.
    const esbuildMeta = getESBuildMeta()
    log.debug("fswatch refreshFiles with esbuildMeta", esbuildMeta)
    if (!esbuildMeta || !esbuildMeta.inputs) {
      // esbuild failed -- don't change what files are being watched
      return
    }

    // vars
    const srcfiles = Object.keys(esbuildMeta.inputs) // {[filename:string]:{<info>}} => string[]
        , outfiles = esbuildMeta.outputs || {} // {[filename:string]:{<info>}}

    if (srcfiles.length == 0) {
      // esbuild failed -- don't change what files are being watched
      return
    }

    // path substrings for filtering out nodejs files
    const nodeModulesPathPrefix = "node_modules" + filepath.sep
    const nodeModulesPathSubstr = filepath.sep + nodeModulesPathPrefix
    const isNodeModuleFile = (fn :string) => {
      return fn.startsWith(nodeModulesPathPrefix) || fn.includes(nodeModulesPathSubstr)
    }

    // log
    if (log.level >= log.DEBUG) {
      const xs = srcfiles.filter(fn => !isNodeModuleFile(fn)).slice(0,10)
      log.debug(
        `fswatch updating source files: esbuild reported` +
        ` ${srcfiles.length} inputs:` +
        xs.map(fn => `\n  ${fn}`).join("") +
        (xs.length < srcfiles.length ? `\n  ... ${srcfiles.length-xs.length} more` : "")
      )
    }

    // append output files to self-originating mod log
    for (let fn of Object.keys(outfiles)) {
      file.fileModificationLogAppend(fn)
    }

    // create list of source files
    const sourceFiles = []
    for (let fn of srcfiles) {
      // exclude output files to avoid a loop
      if (fn in outfiles) {
        continue
      }

      // exclude files from libraries. Some projects may include hundreds or thousands of library
      // files which would slow things down unncessarily.
      if (srcfiles.length > 100 && isNodeModuleFile(fn)) {  // "/node_modules/"
        continue
      }
      sourceFiles.push(fn)
    }
    fswatcher!.setFiles(sourceFiles)
  }

  refreshFiles()

  return fswatcher.promise
}


// watch is a utility function exported in the estrella API
export function watch(
  path :string|ReadonlyArray<string>,
  cb   :WatchCallback,
) :CancellablePromise<void>

export function watch(
  path    :string|ReadonlyArray<string>,
  options :WatchOptions|null|undefined,
  cb      :WatchCallback,
) :CancellablePromise<void>

export function watch(
  path    :string|ReadonlyArray<string>,
  options :WatchOptions|null|undefined | WatchCallback,
  cb?     :WatchCallback,
) :CancellablePromise<void> {
  if (!cb) { // call form: watch(path, cb)
    cb = options as WatchCallback
    options = {}
  }

  const w = new FSWatcher(makeFSWatcherOptions({
    // Defaults
    persistent: true,
    ignoreInitial: true,
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    disableGlobbing: true,
    followSymlinks: false,

    // user override
    ...(options || {})
  }))
  w.basedir = process.cwd()
  w.onChange = cb!
  w.setFiles(typeof path == "string" ? [path] : path)

  return w.promise
}
