import { stdoutStyle, stderrStyle } from "./termstyle"
import { memoize } from "./memoize"
import { prog } from "./cli"
import { Console } from "console"

declare const DEBUG :boolean

export interface Env {
  log :typeof log
}

export enum LogLevel {
  Error = 0,  // only log errors
  Warn,       // log errors and warnings
  Info,       // log errors, warnings and info
  Debug,      // log everything
}

let log_console = console
let log_colorMode :boolean|undefined = undefined

export const log = new class Log {
  readonly ERROR = LogLevel.Error
  readonly WARN  = LogLevel.Warn
  readonly INFO  = LogLevel.Info
  readonly DEBUG = LogLevel.Debug

  level = LogLevel.Info

  error(...v :any[]) :void {
    log_console.error(stderrStyle.red(`${prog}:`), ...v)
  }
  warn(...v :any[]) :void {
    if (log.level >= LogLevel.Warn) {
      log_console.error(stderrStyle.magenta(`${prog}:`), ...v)
    }
  }
  info(...v :any[]) :void {
    if (log.level >= LogLevel.Info) {
      log_console.log(...v)
    }
  }
  readonly infoOnce = memoize(() => log.info.bind(log))
  readonly debug = log_debug

  get colorMode() :boolean|undefined {
    return log_colorMode
  }
  set colorMode(colorMode :boolean|undefined) {
    if (log_colorMode === colorMode) {
      return
    }
    log_colorMode = colorMode
    if (colorMode === undefined) { // auto
      log_console = console
    } else {
      log_console = new Console({
        stdout: process.stdout,
        stderr: process.stderr,
        colorMode
      })
    }
  }
}

export default log

function log_debug(...v :any[]) {
  if (log.level >= LogLevel.Debug) {
    let meta = ""

    if (DEBUG) {
      // stack traces are only usefil in debug builds (not mangled)
      const e :any = {} ; Error.captureStackTrace(e, log_debug)
      const frames = (e.stack ? e.stack.split("\n",5) : [])
      const f = frames[1]  // stack frame
      let m = f && /at (\w+)/.exec(f)
      if (m) {
        meta = " " + m[1]
      } else if (!m && frames[2]) {
        if (m = frames[2] && /at (\w+)/.exec(frames[2])) {
          meta = ` ${m[1]} → ${stdoutStyle.italic("f")}`
        }
      }
    }

    // evaluate first function argument
    if (typeof v[0] == "function") {
      v[0] = v[0]()
    }

    log_console.log(stdoutStyle.bold(stdoutStyle.blue(`[DEBUG${meta}]`)), ...v)
  }
}
