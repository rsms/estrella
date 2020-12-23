import * as extra from "./extra"
import { stderrStyle } from "./termstyle"
import { getModulePackageJSON } from "./util"
import * as typeinfo from "./typeinfo"


export class UserError extends Error {
  constructor(msg :string) {
    super(msg)
    this.name = "UserError"
  }
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


export function bugReportMessage(mode :"confident"|"guess", reportContextField? :string) {
  return extra.debug().bugReportMessage(mode, reportContextField)
}


export function printErrorAndExit(err :any, origin? :string) {
  return extra.debug().printErrorAndExit(err, origin)
}


// attempt to install source-map-support just-in-time when an error occurs to avoid
// taking the startup cost of 10-20ms for loading the source-map-support module.
function Error_prepareStackTrace(error: Error, stack: NodeJS.CallSite[]) {
  Error.prepareStackTrace = undefined
  try {
    extra.debug().installSourceMapSupport()
    if (Error.prepareStackTrace !== Error_prepareStackTrace) {
      return Error.prepareStackTrace!(error, stack)
    }
  } catch(_) {}
  return error.stack || String(error)
}


// install process-level exception and rejection handlers
Error.prepareStackTrace = Error_prepareStackTrace
process.on("uncaughtException", printErrorAndExit)
process.on("unhandledRejection", (reason :{} | null | undefined, _promise :Promise<any>) => {
  printErrorAndExit(reason||"PromiseRejection", "unhandledRejection")
})
