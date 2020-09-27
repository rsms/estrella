import { Console } from "console"
import { stdoutStyle, stderrStyle } from "./termstyle"
import { memoize } from "./memoize"
import { prog } from "./cli"
import { captureStackTrace } from "./error"

import { Log as LogAPI } from "../estrella"

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

export const log = new class Log implements LogAPI {
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
      // stack traces are only useful in debug builds (not mangled)
      const stack = captureStackTrace(log_debug)
      const frames = stack.split("\n", 5)
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

    if (v.length == 0 || (v.length == 1 && (v[0] === "" || v[0] === undefined))) {
      // Nothing to be logged.
      // This is sometimes useful when logging something complex conditionally, for example:
      //   log.debug(() => {
      //     if (expensiveComputation()) {
      //       return "redirecting foobar to fuzlol"
      //     }
      //   })
      return
    }

    log_console.log(stdoutStyle.bold(stdoutStyle.blue(`[DEBUG${meta}]`)), ...v)
  }
}
