import * as fs from "fs"
import * as Path from "path"
import * as os from "os"
import { performance } from "perf_hooks"
import { stdoutStyle } from "./termstyle"
import { inspect } from "util"

export const json = (val, pretty, showHidden) => JSON.stringify(val, showHidden, pretty)
export const clock = () => performance.now()

// generic symbols
export const TYPE = Symbol("TYPE")

// runtimeRequire(id :string) :any
export const runtimeRequire = eval("require") // eval to avoid esbuild warnings


export function repr(val, prettyOrOptions) {
  let options = {
    colors: stdoutStyle.ncolors > 0,
  }
  if (typeof prettyOrOptions == "object") {
    options = { ...prettyOrOptions }
  } else if (prettyOrOptions !== undefined) {
    options.compact = !prettyOrOptions
  }
  return inspect(val, options)
}


export function resolveModulePackageFile(moduleSpec) {
  const mainfile = runtimeRequire.resolve(moduleSpec)
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


export function getModulePackageJSON(moduleSpec) {
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


// ~/hello => /home/user/hello
export function expandTildePath(path) {
  const homedir = os.homedir()
  if (path == "~") {
    return homedir
  }
  if (path.startsWith("~" + Path.sep)) {
    return homedir + path.substr(1)
  }
  return path
}

// /home/user/hello => ~/hello
export function tildePath(path) {
  const s = Path.resolve(path)
  const homedir = os.homedir()
  if (s.startsWith(homedir)) {
    return "~" + s.substr(homedir.length)
  }
  return s
}
