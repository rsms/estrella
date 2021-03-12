import * as fs from "fs"
import * as os from "os"
import * as Path from "path"
import { install, getErrorSource } from "source-map-support"
import { stderrStyle } from "../termstyle"
import { resolveModulePackageFile, tildePath } from "../util"
import * as typeinfo from "../typeinfo"
import { log, LogLevel } from "../log"
import * as _file from "../file"

export { install as installSourceMapSupport, getErrorSource }

type FileModule = typeof _file

export function initModule(logLevel :LogLevel, _ :FileModule) {
  log.level = logLevel
}


export function bugReportMessage(mode :"confident"|"guess", reportContextField? :string) {
  const props :{[name:string]:any} = {
    "platform": `${os.platform()}; ${os.arch()}; v${os.release()}`,
    "time": (new Date).toISOString(),
    "estrella": `v${VERSION} (${tildePath(__dirname)}) for esbuild v${typeinfo.esbuild.version}`,
    "esbuild":  `(not found)`,
  }

  for (let modid of ["esbuild", "chokidar", "typescript"]) {
    try {
      const packageFile = resolveModulePackageFile(modid)
      const pkg = JSON.parse(fs.readFileSync(packageFile, "utf8"))
      props[modid] = `v${pkg.version} (${Path.dirname(tildePath(packageFile))})`
    } catch (_) {}
  }

  if (reportContextField) {
    props["context"] = reportContextField
  }

  let msg = (
    mode == "guess" ?  "If you think this is a bug in Estrella, please" :
    stderrStyle.yellow("Looks like you found a bug in Estrella!") + "\nPlease"
  ) + ` file an issue at:\n` +
    `  https://github.com/rsms/estrella/issues\n` +
    `Include the following information in the report along with the stack trace:`

  const propKeyMaxlen = Object.keys(props).reduce((a, v) => Math.max(a, v.length), 0)
  for (let k of Object.keys(props)) {
    msg += `\n  ${(k + ":").padEnd(propKeyMaxlen + 1, " ")} ${props[k]}`
  }

  return msg
}


export function printErrorAndExit(err :any, origin? :string) {
  // origin : "uncaughtException" | "unhandledRejection"
  let message = ""
  let stack = ""
  if (!err || typeof err != "object") {
    err = String(err)
  }
  const isUserError = err.name == "UserError"

  const m = (err.stack||"").match(/\n\s{2,}at /)
  if (m) {
    message = err.stack.substr(0, m.index)
    stack = err.stack.substr(m.index + 1)
  } else {
    message = err.message || String(err)
  }

  let kind = origin == "unhandledRejection" ? "promise rejection" : "exception"
  let msg = stderrStyle.red(
    isUserError ? `error: ${err.message || message}` :
    `Unhandled ${kind}: ${message}`
  )

  if (stack && (!isUserError || DEBUG)) {
    // Note: no stack for UserError in release builds
    const sourceSnippet = getErrorSource(err)
    if (sourceSnippet) {
      msg += `\n${sourceSnippet}`
    }
    msg += "\n" + stack
  }

  // did the error originate in estrella rather than a user script?
  if (!DEBUG && stack && !isUserError) {
    const frame1 = stack.split("\n",2)[0]
    const filename = findFilenameInStackFrame(frame1)
    if (filename.includes("<estrella>") || Path.basename(filename).startsWith("estrella")) {
      // Note: estrella's build.js script adds "<estrella>" to the sourcemap when
      // build in release mode
      msg += "\n" + bugReportMessage("confident")
    }
  }

  fs.writeSync((process.stderr as any).fd, msg + "\n")
  process.exit(2)
}


function findFilenameInStackFrame(frame :string) :string {
  const m = frame.match(/at\s+(?:.+\s+\(([^\:]+)\:\d+(?:\:\d+)\)$|([^\:]+)\:\d)/)
  if (!m) {
    return ""
  }
  return m[1] || m[2]
}


// libuv error codes from http://docs.libuv.org/en/v1.x/errors.html
export const libuv_errors = {
  "E2BIG":        "argument list too long",
  "EACCES":          "permission denied",
  "EADDRINUSE":      "address already in use",
  "EADDRNOTAVAIL":   "address not available",
  "EAFNOSUPPORT":    "address family not supported",
  "EAGAIN":          "resource temporarily unavailable",
  "EAI_ADDRFAMILY":  "address family not supported",
  "EAI_AGAIN":       "temporary failure",
  "EAI_BADFLAGS":    "bad ai_flags value",
  "EAI_BADHINTS":    "invalid value for hints",
  "EAI_CANCELED":    "request canceled",
  "EAI_FAIL":        "permanent failure",
  "EAI_FAMILY":      "ai_family not supported",
  "EAI_MEMORY":      "out of memory",
  "EAI_NODATA":      "no address",
  "EAI_NONAME":      "unknown node or service",
  "EAI_OVERFLOW":    "argument buffer overflow",
  "EAI_PROTOCOL":    "resolved protocol is unknown",
  "EAI_SERVICE":     "service not available for socket type",
  "EAI_SOCKTYPE":    "socket type not supported",
  "EALREADY":        "connection already in progress",
  "EBADF":           "bad file descriptor",
  "EBUSY":           "resource busy or locked",
  "ECANCELED":       "operation canceled",
  "ECHARSET":        "invalid Unicode character",
  "ECONNABORTED":    "software caused connection abort",
  "ECONNREFUSED":    "connection refused",
  "ECONNRESET":      "connection reset by peer",
  "EDESTADDRREQ":    "destination address required",
  "EEXIST":          "file already exists",
  "EFAULT":          "bad address in system call argument",
  "EFBIG":           "file too large",
  "EHOSTUNREACH":    "host is unreachable",
  "EINTR":           "interrupted system call",
  "EINVAL":          "invalid argument",
  "EIO":             "i/o error",
  "EISCONN":         "socket is already connected",
  "EISDIR":          "illegal operation on a directory",
  "ELOOP":           "too many symbolic links encountered",
  "EMFILE":          "too many open files",
  "EMSGSIZE":        "message too long",
  "ENAMETOOLONG":    "name too long",
  "ENETDOWN":        "network is down",
  "ENETUNREACH":     "network is unreachable",
  "ENFILE":          "file table overflow",
  "ENOBUFS":         "no buffer space available",
  "ENODEV":          "no such device",
  "ENOENT":          "no such file or directory",
  "ENOMEM":          "not enough memory",
  "ENONET":          "machine is not on the network",
  "ENOPROTOOPT":     "protocol not available",
  "ENOSPC":          "no space left on device",
  "ENOSYS":          "function not implemented",
  "ENOTCONN":        "socket is not connected",
  "ENOTDIR":         "not a directory",
  "ENOTEMPTY":       "directory not empty",
  "ENOTSOCK":        "socket operation on non-socket",
  "ENOTSUP":         "operation not supported on socket",
  "EPERM":           "operation not permitted",
  "EPIPE":           "broken pipe",
  "EPROTO":          "protocol error",
  "EPROTONOSUPPORT": "protocol not supported",
  "EPROTOTYPE":      "protocol wrong type for socket",
  "ERANGE":          "result too large",
  "EROFS":           "read-only file system",
  "ESHUTDOWN":       "cannot send after transport endpoint shutdown",
  "ESPIPE":          "invalid seek",
  "ESRCH":           "no such process",
  "ETIMEDOUT":       "connection timed out",
  "ETXTBSY":         "text file is busy",
  "EXDEV":           "cross-device link not permitted",
  "UNKNOWN":         "unknown error",
  "EOF":             "end of file",
  "ENXIO":           "no such device or address",
  "EMLINK":          "too many links",
  "ENOTTY":          "inappropriate ioctl for device",
  "EFTYPE":          "inappropriate file type or format",
  "EILSEQ":          "illegal byte sequence",
}
