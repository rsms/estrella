import * as fs from "fs"
import * as aux from "./aux"
import { stderrStyle } from "./termstyle"
import { getModulePackageJSON } from "./util"
import * as typeinfo from "./typeinfo"

export interface WrappedError extends Error {
  originalError :Error
}

export function wrapError(original :Error, message :string) :WrappedError {
  const e = new Error(message) as WrappedError
  e.originalError = original

  // original stack
  let ostack = original.stack || ""
  if (ostack.length > 0) {
    let i = ostack.indexOf("\n")
    if (i != -1 && ostack.indexOf("\n", i + 1) != -1) {
      // remove the message from the original stack, if there is at least two lines
      ostack = ostack.substr(i) // include LF
    } else {
      ostack = "\n" + ostack
    }
  }

  // new stack (message + function calling wrapError)
  if (e.stack) {
    const newstackv = e.stack.split("\n", 3)
    const newstack = newstackv[0] + "\n" + newstackv[2]
    e.stack = newstack + ostack
  } else {
    e.stack = ostack
  }

  return e
}


// captureStackTrace captures a stack trace, returning the formatted stack.
// If sourcemap is true, then translate locations via source map (loads debug module.)
export function captureStackTrace(cons? :Function, sourcemap? :boolean) :string {
  const Error_prepareStackTrace = Error.prepareStackTrace
  if (!sourcemap) {
    Error.prepareStackTrace = undefined
  }
  let stack = ""
  try {
    const e :any = {}
    Error.captureStackTrace(e, cons)
    // note: accessing e.stack invokes Error.prepareStackTrace so this must be done
    // before restoring Error.prepareStackTrace
    stack = e.stack as string
  } finally {
    Error.prepareStackTrace = Error_prepareStackTrace
  }
  return stack
}


export function bugReportMessage(reportContextField? :string) {
  let esbuildVersion = "(not found)"
  try { esbuildVersion = getModulePackageJSON("esbuild").version } catch (err) {}
  let msg =
    `If you think this is a bug in Estrella, please file an issue at:\n` +
    `  https://github.com/rsms/estrella/issues\n` +
    `Include the following information in the report along with the stack trace:\n` +
    `  estrella: v${VERSION} (esbuild v${typeinfo.esbuild.version})\n` +
    `  esbuild:  v${esbuildVersion}`
  if (reportContextField) {
    msg += `\n  context:  ${reportContextField}`
  }
  return msg
}


// attempt to install source-map-support just-in-time when an error occurs to avoid
// taking the startup cost of 10-20ms for loading the source-map-support module.
function Error_prepareStackTrace(error: Error, stack: NodeJS.CallSite[]) {
  Error.prepareStackTrace = undefined
  try {
    aux.debug().installSourceMapSupport()
    if (Error.prepareStackTrace !== Error_prepareStackTrace) {
      return Error.prepareStackTrace!(error, stack)
    }
  } catch(_) {}
  return error.stack || String(error)
}


function printErrorAndExit(err :any, origin :string) {
  // origin : "uncaughtException" | "unhandledRejection"
  let message = ""
  let stack = ""
  if (!err || typeof err != "object") {
    err = String(err)
  }
  const m = (err.stack||"").match(/\n\s{2,}at /)
  if (m) {
    message = err.stack.substr(0, m.index)
    stack = err.stack.substr(m.index + 1)
  } else {
    message = err.message || String(err)
  }
  let kind = origin == "unhandledRejection" ? "promise rejection" : "exception"
  let msg = stderrStyle.red(`Unhandled ${kind}: ${message}`)

  if (stack) {
    try {
      const sourceSnippet = aux.debug().getErrorSource(err)
      if (sourceSnippet) {
        msg += `\n${sourceSnippet}`
      }
    } catch(_) {}
    msg += "\n" + stack
  }

  msg += "\n" + bugReportMessage()

  fs.writeSync((process.stderr as any).fd, msg + "\n")
  process.exit(2)
}


// install process-level exception and rejection handlers
Error.prepareStackTrace = Error_prepareStackTrace
process.on("uncaughtException", printErrorAndExit)
process.on("unhandledRejection", (reason :{} | null | undefined, _promise :Promise<any>) => {
  printErrorAndExit(reason||"PromiseRejection", "unhandledRejection")
})
