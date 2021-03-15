import * as fs from "fs"
import * as Path from "path"
import * as os from "os"
import { performance } from "perf_hooks"
import { stdoutStyle } from "./termstyle"
import { inspect } from "util"

export const json = (val, pretty, showHidden) => JSON.stringify(val, showHidden, pretty)
export const clock = () => performance.now()

// running on Windows?
export const isWindows = process.platform.startsWith("win")

// generic symbols
export const TYPE = Symbol("TYPE")

// runtimeRequire(id :string) :any
export function runtimeRequire(id) {
  // _runtimeRequire is defined at compile time by build.js (== require)
  try { return _runtimeRequire(id) } catch { return null }
}
runtimeRequire.resolve = id => {
  try { return _runtimeRequire.resolve(id) } catch { return "" }
}

// isCLI is true if estrella is invoked directly and not imported as a module
export const isCLI = module.id == "." || process.mainModule.filename == __filename


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


let _tmpdir = ""

export function tmpdir() {
  if (!_tmpdir) {
    // Some systems return paths with symlinks.
    // esbuild does "realpath" on some pathnames and thus reporting with esbuild's metafile
    // may be incorrect if this is not canonical.
    _tmpdir = fs.realpathSync.native(os.tmpdir())
  }
  return _tmpdir
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
  const exeFileMode = isWindows ? 0xFFFFFFFF : fs.constants.X_OK
  const PATH = new Set((process.env.PATH || "").split(Path.delimiter))

  for (let dir of PATH) {
    let path = Path.join(Path.resolve(dir), executableName)
    if (isWindows) {
      path += ".cmd"
    }
    while (true) {
      try {
        let st = fs.statSync(path)
        if (st.isSymbolicLink()) {
          path = fs.realpathSync.native(path)
          continue // try again
        } else if (st.isFile() && (st.mode & exeFileMode)) {
          return path
        }
      } catch (_) {
        if (isWindows && path.endsWith(".cmd")) {
          path = Path.join(Path.resolve(dir), executableName) + ".exe"
          continue // try with .exe extension
        }
      }
      break
    }
  }
  return null
}


// jsonparse parses "relaxed" JSON which can be in JavaScript format
export function jsonparse(jsonText, filename /*optional*/) {
  try {
    return JSON.parse(json)
  } catch (err) {
    return require("vm").runInNewContext(
      '(' + jsonText + ')',
      { /* sandbox */ },
      { filename, displayErrors: true }
    )
  }
}

export function jsonparseFile(filename) {
  const json = fs.readFileSync(filename, "utf8")
  try {
    return jsonparse(json)
  } catch (err) {
    throw new Error(`failed to parse ${filename}: ${err.message || err}`)
  }
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
