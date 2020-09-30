import * as filepath from "path"
import { Metadata as ESBuildMetadata } from "esbuild"

import { WatchOptions, WatchCallback, CancellablePromise } from "../../estrella.d"

import { BuildConfig, BuildContext } from "../config"
import { fileModificationLogAppend } from "../file"
import { fileWasModifiedRecentlyByUser } from "../file"
import { log, LogLevel } from "../log"
import { file } from "../file"
import { repr } from "../util"

import { FSWatcher } from "./fswatch"


export function initModule(logLevel :LogLevel) {
  log.level = logLevel
}


let fswatcherMap = new Map<string,FSWatcher>() // projectID => FSWatcher


// used by estrella itself, when config.watch is enabled
export async function watchFiles(
  config         :BuildConfig,
  getESBuildMeta :()=>ESBuildMetadata,
  ctx            :BuildContext,
  callback       :(changedFiles :string[]) => Promise<void>,
) :Promise<void> {
  const projectID = config.projectID
  let fswatcher = fswatcherMap.get(projectID)

  if (!fswatcher) {
    const watchOptions = config.watch && typeof config.watch == "object" ? config.watch : {}
    fswatcher = new FSWatcher(watchOptions)
    fswatcherMap.set(projectID, fswatcher)
    fswatcher.basedir = config.cwd!
    fswatcher.onChange = (changedFiles) => {
      // invoke the callback, which in turn rebuilds the project and writes a fresh
      // esbuild metafile which we then read in refreshFiles.
      callback(changedFiles).then(refreshFiles)
    }
    ctx.addCancelCallback(() => {
      fswatcher!.promise.cancel()
    })
    log.debug(`fswatch started for project#${projectID}`)
  }

  function refreshFiles() {
    // read metadata produced by esbuild, describing source files and product files
    const esbuildMeta = getESBuildMeta()

    // vars
    const srcfiles = Object.keys(esbuildMeta.inputs) // {[filename:string]:{<info>}} => string[]
        , outfiles = esbuildMeta.outputs // {[filename:string]:{<info>}}

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
      fileModificationLogAppend(fn)
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


// TODO: convert to typescript and use fswatch.ts/FSWatch to reduce code duplication

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

  const w = new FSWatcher({
    // Defaults
    persistent: true,
    ignoreInitial: true,
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    disableGlobbing: true,
    followSymlinks: false,

    // user override
    ...(options || {})
  })
  w.basedir = process.cwd()
  w.onChange = cb!
  w.setFiles(Array.isArray(path) ? path : [path])

  return w.promise
}
