import * as fs from "fs"
import * as Path from "path"
import { performance } from "perf_hooks"
import { stdoutStyle } from "./termstyle"
import { inspect } from "util"

export const json = (val, pretty, showHidden) => JSON.stringify(val, showHidden, pretty)
export const clock = () => performance.now()

export function repr(val, prettyOrOptions) {
  let options = { colors: stdoutStyle.ncolors > 0 }
  if (typeof prettyOrOptions == "object") {
    options = { ...prettyOrOptions }
  } else if (prettyOrOptions !== undefined) {
    options.compact = !prettyOrOptions
  }
  return inspect(val, options)
}

export const nodejs_require = eval("require")  // workaround for esbuild bug


export function resolveModulePackageFile(moduleSpec) {
  const mainfile = require.resolve(moduleSpec)
  let dir = Path.dirname(Path.resolve(mainfile))
  let lastdir = Path.sep // lastdir approach to support Windows (not just check for "/")
  while (dir != lastdir) {
    let pfile = Path.join(dir, "package.json")
    if (fs.existsSync(pfile)) {
      return pfile
    }
    dir = Path.dirname(dir)
  }
  throw new Error(`package.json not found for module ${moduleSpec}`)
}


export function getModulePackage(moduleSpec) {
  const pfile = resolveModulePackageFile(moduleSpec)
  return jsonparseFile(pfile)
}


export function fmtDuration(ms) {
  return (
    ms >= 59500 ? (ms/60000).toFixed(0) + "min" :
    ms >= 999.5 ? (ms/1000).toFixed(1) + "s" :
    ms.toFixed(2) + "ms"
  )
}

export function fmtByteSize(bytes) {
  return (
    bytes >= 1024*1000 ? (bytes/(1024*1000)).toFixed(1) + "MB" :
    bytes >= 1000 ? (bytes/1024).toFixed(1) + "kB" :
    bytes + "B"
  )
}

export function findInPATH(executableName) {
  const testExeExtToo = process.platform.startsWith("win") && !/\.exe$/i.test(executableName)
  for (let dir of (process.env.PATH || "").split(Path.delimiter)) {
    let path = Path.join(Path.resolve(dir), executableName)
    while (true) {
      try {
        let st = fs.statSync(path)
        if (st.isSymbolicLink()) {
          path = fs.realpathSync.native(path)
          continue
        } else if (st.isFile() && st.mode & fs.constants.X_OK) {
          return path
        }
      } catch (_) {}
      break
    }
  }
  return null
}


// jsonparse parses "relaxed" JSON which can be in JavaScript format
export function jsonparse(jsonText, filename /*optional*/) {
  const vm = require("vm")
  return vm.runInNewContext(
    '(' + jsonText + ')',
    { /* sandbox */ },
    { filename, displayErrors: true }
  )
}

export function jsonparseFile(filename) {
  return jsonparse(fs.readFileSync(filename, "utf8"), filename)
}


let homedir = null

export function tildePath(path) {
  const s = Path.resolve(path)
  if (!homedir) { homedir = require("os").homedir() }
  if (s.startsWith(homedir)) {
    return "~" + s.substr(homedir.length)
  }
  return s
}
