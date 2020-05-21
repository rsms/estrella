import * as fs from "fs"
import * as Path from "path"
import { performance } from "perf_hooks"

export const json = JSON.stringify
export const clock = () => performance.now()


export function fmtDuration(ms) {
  return (
    ms >= 59500 ? (ms/60000).toFixed(0) + "min" :
    ms >= 999.5 ? (ms/1000).toFixed(1) + "s" :
    ms.toFixed(2) + "ms"
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
  return require("vm").runInNewContext(
    '(()=>(' + jsonText + '))()',
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
