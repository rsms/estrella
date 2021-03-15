// defined by esbuild, configured in build.js
declare const DEBUG :boolean
declare const VERSION :string
declare function _runtimeRequire(id :string) :any

// Mutable yields a derivative of T with readonly attributes erased
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
}

// assert checks the condition for truth, and if false, prints an optional
// message, stack trace and exits the process. assert is no-op in release builds.
function assert(cond :any, msg? :string, cons? :Function) :void {
  if (DEBUG) {
    if (cond) {
      return
    }
    const message = 'assertion failure: ' + (msg || cond)
    const e = new Error(message)
    e.name = "AssertionError"
    const obj :any = {}
    Error.captureStackTrace(obj, cons || assert)
    if (obj.stack) {
      e.stack = message + "\n" + obj.stack.split("\n").slice(1).join("\n")
    }
    if (assert.throws) {
      throw e
    }
    require("error").printErrorAndExit(e, "assert")
  }
}

// throws can be set to true to cause assertions to be thrown as exceptions instead
// of printing the error and exiting the process.
assert.throws = false

;(global as any)["assert"] = assert
