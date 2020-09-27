/*
This module is an adoptation of Go's simple and elegant os/exec.Cmd package.
It provides a reliable and simple way to run sub-processes.

The API and semantics prioritize clarity & simplicity over ease.
There are two important members:

class Cmd(command :string, ...args :string[]) implements CmdOptions
  Create a new command structure for running a sub-process

function startCmd(command :string, args? :string[], options? :CmdOptions)
  Create & start a command. Thin wrapper around new Cmd... with strong TypeScript typings.

----------------------------------------------------------------------------------------------
startCmd examples

Example: Pipe one command's output into another's input:
  const [,{stdout:dateout}] = startCmd("date", [], {stdout:"pipe"})
  const [cmd, stdio] = startCmd("cat", [], { stdin: dateout, stdout: "inherit" })
  await cmd.wait()

----------------------------------------------------------------------------------------------
Cmd examples

Example: Print output of top to stdout
  const cmd = new Cmd("top")
  cmd.stdout = process.stdout
  await cmd.run()

Example: Get output of uname -a
  console.log(await (new Cmd("uname", "-a")).output("utf8"))

Example: Provide a buffer for stdin and capture stdout as text
  const cmd = new Cmd("tr", "[:lower:]", "[:upper:]")
  cmd.stdin = Buffer.from("Hello world\n")
  console.log(await cmd.output("utf8"))

Example: Provide a file for stdin and catpure stdout as text
  const cmd = new Cmd("tr", "[:upper:]", "[:lower:]")
  cmd.stdin = io.createFileReader("jokes.txt")
  console.log(await cmd.output("utf8"))

Example: Execute a command in a shell, listing the contents of a directory
  const cmd = new Cmd("if [ -d . ]; then ls; fi")
  cmd.shell = true
  cmd.dir = "~"
  console.log(await cmd.output("utf8"))

Example: Pipe one command's output into another's input
  const date = new Cmd("date")
  date.stdout = "pipe"
  const { stdout: dateout } = date.start()
  const cmd = new Cmd("cat")
  cmd.stdin = dateout
  cmd.stdout = process.stdout
  await cmd.run()

*/
import * as fs from "fs"
import * as subproc from "child_process"
import { Writable, Readable, PassThrough as PassThroughStream } from "stream"

import * as io from "./io"
import { createTimeout } from "./timeout"
import { repr, expandTildePath } from "./util"
import log from "./log"

export interface Pipes<In=io.Writer|null, Out=io.Reader|null, Err=io.Reader|null> {
  readonly stdin      :In   // valid if Cmd.stdin=="pipe"
  readonly stdout     :Out  // valid if Cmd.stdout=="pipe"
  readonly stderr     :Err  // valid if Cmd.stderr=="pipe"
  readonly extraFiles :(io.Reader|io.Writer|null)[]  // where extraFiles[N]=="pipe"
}

interface CmdOptions {
  dir?         :string  // working directory. If empty, uses current working directory
  env?         :{[name:string]:string|undefined}  // process environment
  shell?       :boolean | string  // run command in the system-default shell
  stdin?       :Readable | "inherit" | "pipe" | Buffer | io.Reader | null // fd 0
  stdout?      :Writable | "inherit" | "pipe" | null // fd 1
  stderr?      :Writable | "inherit" | "pipe" | null // fd 2
  extraFiles?  :(Readable | "pipe" | null)[]  // fd 3...
  windowsHide? :boolean
}

// startCmd launches an external command process.
// It's a convenience function around c=new Cmd();c.start() with strengthened TypeScript types.
//
// Form 1/2a: When no stdio options are provided, no pipes are returned
export function startCmd(command :string, args? :string[]) :[Cmd]
export function startCmd(command :string, args :string[], options :CmdOptions & {
  stdin?: never,
  stdout?: never,
  stderr?: never,
  extraFiles? :never,
}) :[Cmd]
//
// Form 1/2b: no args
export function startCmd(command :string, options :CmdOptions & {
  stdin?: never,
  stdout?: never,
  stderr?: never,
  extraFiles? :never,
}) :[Cmd]
//
// Form 2/2a: When stdio options are provided, the pipe ends and cmd are returned as a tuple:
export function startCmd<
  // at least one stdio input is defined
  Options extends CmdOptions & (
    { stdin:  CmdOptions["stdin"] } |
    { stdout: CmdOptions["stdout"] } |
    { stderr: CmdOptions["stderr"] } |
    { extraFiles: CmdOptions["extraFiles"] }
  ),
  I = Options extends {stdin: "pipe"} ? io.Writer : null,
  O = Options extends {stdout:"pipe"} ? io.Reader : null,
  E = Options extends {stderr:"pipe"} ? io.Reader : null,
>(
  command :string,
  args    :string[],
  options :Options,
) :[Cmd, Pipes<I,O,E>]
//
// Form 2/2b: no args
export function startCmd<
  // at least one stdio input is defined
  Options extends CmdOptions & (
    { stdin:  CmdOptions["stdin"] } |
    { stdout: CmdOptions["stdout"] } |
    { stderr: CmdOptions["stderr"] } |
    { extraFiles: CmdOptions["extraFiles"] }
  ),
  I = Options extends {stdin: "pipe"} ? io.Writer : null,
  O = Options extends {stdout:"pipe"} ? io.Reader : null,
  E = Options extends {stderr:"pipe"} ? io.Reader : null,
>(
  command :string,
  options :Options,
) :[Cmd, Pipes<I,O,E>]
//
// Implementation:
export function startCmd(command :string, args? :string[]|CmdOptions, options? :CmdOptions) {
  if (!args || !Array.isArray(args)) {
    if (args && typeof args == "object") {
      options = args as CmdOptions
    }
    args = []
  }
  if (!options) {
    options = {}
  }
  const cmd = new Cmd(command, ...args)
  for (let k in options) {
    ;(cmd as any)[k] = (options as any)[k]
  }
  const cmdio = cmd.start()
  if (options && (
    "stdin" in options ||
    "stdout" in options ||
    "stderr" in options ||
    "extraFiles" in options
  )) {
    return [ cmd, cmdio ]
  }
  return cmd
}


const notStartedError = "process not started"

export type SignalMode = "standard" | "group"


// Cmd represents an external command being prepared or run
export class Cmd implements Required<CmdOptions> {
  command     :string
  args        :string[]
  dir         :string = ""  // working directory. If empty, uses current working directory
  env         :{[name:string]:string|undefined} = {...process.env}  // process environment
  shell       :boolean | string = false  // run command in the system-default shell
  stdin       :Readable | "inherit" | "pipe" | Buffer | io.Reader | null = null // fd 0
  stdout      :Writable | "inherit" | "pipe" | null = null // fd 1
  stderr      :Writable | "inherit" | "pipe" | null = null // fd 2
  extraFiles  :(Readable | "pipe" | null)[] = []  // fd 3...
  windowsHide :boolean = true

  readonly process  :subproc.ChildProcess | null = null  // underlying process
  readonly promise  :Promise<number>  // resolves with status code when process exits
  readonly running  :boolean = false  // true while the underlying process is running
  readonly pid      :number = 0       // pid, valid after start() has been called
  readonly exitCode :number = -1
    // exit code of the exited process, or -1 if the process hasn't exited or was
    // terminated by a signal.

  constructor(command :string, ...args :string[]) {
    this.command = command
    this.args = args
    this.promise = Promise.reject(new Error(notStartedError))
    this.promise.catch(_=>{}) // avoid uncaught promise
  }

  // start launches the command process.
  // If the process fails to launch, this function throws an error.
  // Returns caller's end of I/O pipes. Returns null if no stdio pipes were configured.
  // See startCmd() function as an alternative with stronger TypeScript typings.
  start() :Pipes|null { return null } // separate impl

  // run starts the specified command and waits for it to complete.
  // Returns process exit status code.
  run(timeout? :number) :Promise<number> {
    this.start()
    return this.wait(timeout)
  }

  // output runs the specified command and returns its standard output.
  // If the program does not exit with status 0, an error is thrown.
  output(encoding :null|undefined, timeout? :number|null) :Promise<Buffer>
  output(encoding :BufferEncoding, timeout? :number|null) :Promise<string>
  output(encoding? :BufferEncoding|null, timeout? :number|null) :Promise<Buffer|string> {
    this.stdout = "pipe"
    if (!this.stderr) {
      this.stderr = "pipe"
    }

    const { stdout, stderr } = this.start()!
    const stdoutBuf = io.createWriteBuffer()
    const stderrBuf = io.createWriteBuffer()

    stdout!.stream.on("data", chunk => {
      stdoutBuf.push(chunk)
    })

    if (stderr) {
      stderr.stream.on("data", chunk => {
        stderrBuf.push(chunk)
      })
    }

    return this.wait(timeout as number || 0).then(exitCode => {
      if (exitCode != 0) {
        let errstr = ""
        const errbuf = stderrBuf.buffer()
        try {
          errstr = errbuf.toString("utf8")
        } catch (_) {
          errstr = errbuf.toString("ascii")
        }
        if (errstr.length > 0) {
          errstr = ". stderr output:\n" + errstr
        }
        throw new Error(`command exited with status ${exitCode}${errstr}`)
      }
      const buf = stdoutBuf.buffer()
      return encoding ? buf.toString(encoding) : buf
    })
  }

  // wait for process to exit, with an optional timeout expressed in milliseconds.
  // Returns the exit status. Throws TIMEOUT on timeout.
  wait(timeout? :number, timeoutSignal? :Signal) :Promise<number> {
    if (timeout === undefined || timeout <= 0) {
      return this.promise
    }
    return this._waitTimeout(timeout, (err, _resolve, reject) => {
      log.debug(()=>`${this} wait timeout reached; killing process`)
      err.message = "Cmd.wait timeout"
      return this.kill(timeoutSignal).then(() => reject(err))
    })
  }

  // signal sends sig to the underlying process and returns true if sending the signal worked.
  // mode defaults to "standard"
  //
  // If the signal is successfully sent (not neccessarily delivered) true is returned.
  // If the process is not running, false is returned (no effect.)
  // If the process has not been started, an exception is thrown.
  // If the signal is not supported by the platform, an exception is thrown.
  // If another error occur, like signalling permissions, false is returned.
  //
  signal(sig :Signal, mode? :SignalMode) :boolean {
    const p = this._checkproc()
    if (mode == "group") {
      // Signalling process groups via negative pid is supported on most POSIX systems.
      // This causes subprocesses that the command process may have started to also receive
      // the signal.
      try {
        process.kill(-p.pid, sig)
        return true
      } catch (_) {
        // will fail if the process is not in its own group or if its is already dead.
        // fall through to "proc" mode:
      }
    }
    return p.kill(sig)
  }

  // kill terminates the command by sending signal sig to the process and waiting for it to exit.
  // mode defaults to "group".
  //
  // If the process has not exited within timeout milliseconds, SIGKILL is sent.
  // The timeout should be reasonably large to allow well-behaved processed to run atexit code but
  // small enough so that an ill-behaved process is killed within a reasonable timeframe.
  // If timeout <= 0 then the returned promise will only resolve if and when the process exits,
  // which could be never if the process ignores sig.
  //
  async kill(sig :Signal="SIGTERM", timeout :number=500, mode? :SignalMode) :Promise<number> {
    const p = this._checkproc()
    if (!this.signal(sig, mode || "group")) {
      return p.exitCode || 0
    }
    if (timeout <= 0) {
      return this.promise
    }
    return this._waitTimeout(timeout, (_, resolve) => {
      log.debug(()=>`${this} kill timeout reached; sending SIGKILL`)
      p.kill("SIGKILL")
      return this.promise.then(resolve)
    })
  }

  toString() :string {
    return this.process ? `Cmd[${this.pid}]` : "Cmd"
  }

  // -------- internal --------

  _resolve :(exitStatus:number)=>void = ()=>{}
  _reject  :(reason?:any)=>void = ()=>{}

  _checkproc() :subproc.ChildProcess {
    if (!this.process) {
      throw new Error(notStartedError)
    }
    return this.process
  }

  _rejectAndKill(reason? :any) {
    this._reject(reason)
  }

  _onerror = (err :Error) => {
    log.debug(()=>`${this} error:\n${err.stack||err}`)
    this._reject(err)
  }

  _onexit = (code: number, signal: Signal) => {
    // run after process exits
    const cmd = this as Mutable<Cmd>
    log.debug(()=>`${cmd} exited status=${code} signal=${signal}`)
    cmd.running = false
    cmd.exitCode = (
      code === null || signal !== null ? -1 :
      code || 0
    )
    cmd._resolve(cmd.exitCode)
  }

  // _waitTimeout starts a timer which is cancelled when the process exits.
  // If the timer expires before the process exits, onTimeout is called with a mutable
  // TimeoutError that you can pass to reject and a set of promise resolution functions,
  // which control the promise returned by this function.
  _waitTimeout(
    timeout :number,
    onTimeout :(
      timeoutErr :Error,
      resolve: (code?:number)=>void,
      reject:  (reason?:any)=>void,
    )=>Promise<any>,
  ) {
    return new Promise<number>((resolve, reject) => {
      let timeoutOccured = false
      this.promise.then(exitCode => {
        if (!timeoutOccured) {
          resolve(exitCode)
        }
      })
      return createTimeout(this.promise, timeout, timeoutErr => {
        timeoutOccured = true
        // now, even if the process exits and calls cmd._resolve, the timeout-enabled
        // promise returned will not resolve. Instead, we call the onTimeout handler
        // which can take its sweet time and eventually, when it's done, call either
        // resolve or reject.
        onTimeout(timeoutErr, resolve, reject)
      })
    })
  }
}


Cmd.prototype.start = function start(this :Cmd) :Pipes|null {
  const cmd = this as Mutable<Cmd>

  if (cmd.running) {
    throw new Error("start() called while command is running")
  }

  // reset exit code
  cmd.exitCode = -1

  // create a new promise
  cmd.promise = new Promise<number>((res,rej) => {
    cmd._resolve = res
    cmd._reject = rej
  })

  // configure stdin which may be a buffer
  let stdin :Readable | "inherit" | "pipe" | null = null
  let stdinStreamNeedsPiping :Readable | null = null
  if (cmd.stdin instanceof Buffer) {
    stdin = "pipe"
  } else if (io.isReader(cmd.stdin)) {
    if (typeof (cmd.stdin.stream as any).fd == "string") {
      // Nodejs' child_process module can handle "Socket" type of streams directly.
      // "Socket" really is just the name for a stream around a file descriptor.
      stdin = cmd.stdin.stream
    } else {
      stdin = "pipe"
      stdinStreamNeedsPiping = cmd.stdin.stream
    }
  } else {
    stdin = cmd.stdin
  }

  // spawn a process
  const p = subproc.spawn(cmd.command, cmd.args, {
    stdio: [
      stdin,
      (
        cmd.stdout === process.stdout ? 1 :
        cmd.stdout || 'ignore'
      ),
      (
        cmd.stderr === process.stderr ? 2 :
        cmd.stderr ? cmd.stderr : 'ignore'
      ),
      ...cmd.extraFiles
    ],
    cwd: cmd.dir ? expandTildePath(cmd.dir) : undefined,
    env: cmd.env,
    shell: cmd.shell,
    windowsHide: cmd.windowsHide,
    detached: true, // so that p gets its own process group, so we can kill its proc tree
  })

  // This is a bit of a hack, working around an awkward design choice in nodejs' child_process
  // module where spawn errors are deliberately delayed until the next runloop iteration.
  // The effect of this choice means that we don't know if creating a new process, which is a
  // synchronous operation, succeeded until the next runloop frame.
  // We have one thing going for us here: p.pid is undefined when spawn failed, so we can
  // look at p.pid to know if there will be an error event in the next runoop frame or not, but
  // we don't know anything about the error yet; not until the next runloop frame.
  // See https://github.com/nodejs/node/blob/v14.12.0/lib/internal/child_process.js#L379-L390
  if (p.pid === undefined) {
    cmd.process = null
    cmd.pid = 0
    // guesstimate the actual error by checking status of command file
    const err = guessSpawnError(cmd)
    cmd._reject(err)
    throw err
  }

  // set process & running state
  cmd.running = true
  cmd.process = p
  cmd.pid = p.pid

  // attach event listeners
  p.on("exit", cmd._onexit)
  p.on('error', cmd._reject)

  log.debug(()=>`${cmd} started (${repr(cmd.command)})`)

  // stdin buffer?
  if (p.stdin) {
    if (cmd.stdin instanceof Buffer) {
      const r = new PassThroughStream()
      r.end(cmd.stdin)
      r.pipe(p.stdin)
      p.stdin = null
    } else if (stdinStreamNeedsPiping) {
      stdinStreamNeedsPiping.pipe(p.stdin)
      p.stdin = null
    }
  }

  // if there are no pipes, return no pipes
  if (!p.stdin && !p.stdout && !p.stderr && p.stdio.length < 4) {
    return null
  }

  // TODO figure out how to make this properly TypeScript typed.
  // Ideally the return type of start() should depend on the values of Cmd.std{in,out,err}
  // but I can't figure out how to do that with TypeScript, so here we are, casting null to
  // a non-null type, asking for trouble. All for the sake of not having to do "!" for every
  // call to stdio objects returned from start()...
  const cmdio :Pipes = {
    stdin:      p.stdin  ? io.createWriter(p.stdin)  : null,
    stdout:     p.stdout ? io.createReader(p.stdout) : null,
    stderr:     p.stderr ? io.createReader(p.stderr) : null,
    extraFiles: p.stdio.slice(3).map(stream =>
      io.isReadableStream(stream) ? io.createReader(stream) :
      io.isWritableStream(stream) ? io.createWriter(stream) :
      null
    ),
  }

  return cmdio
}


function guessSpawnError(cmd :Cmd) :Error {
  // guesstimate the actual error by checking status of command file
  let code = ""
  let msg = "unspecified error"
  if (cmd.shell == false) {
    try {
      fs.accessSync(cmd.dir, fs.constants.R_OK | fs.constants.X_OK)
      const st = fs.statSync(cmd.command)
      if ((st.mode & fs.constants.S_IFREG) == 0) {
        // not a regular file
        code = "EACCES"
      } else {
        // very likely some sort of I/O error
        code = "EIO"
      }
    } catch (err) {
      code = err.code || "ENOENT"
    }
    msg = io.errorCodeMsg(code) || msg
  }
  if (!code) {
    // check dir
    try {
      fs.accessSync(cmd.dir, fs.constants.R_OK | fs.constants.X_OK)
      code = "EIO"
    } catch (err) {
      code = err.code || "ENOENT"
    }
    msg = io.errorCodeMsg(code) || msg
    if (code) {
      msg = msg + "; cmd.dir=" + repr(cmd.dir)
    }
  }
  if (!code) {
    code = "UNKNOWN"
  }
  const e = new Error(`failed to spawn process ${repr(cmd.command)} (${code} ${msg})`)
  ;(e as any).code = code
  return e
}


export type Signal = NodeJS.Signals | number


// this function is never used but here to test the complex typescript types of spawn()
function _TEST_typescript_startCmd() {
  {
    const _empty1 :[Cmd] =
      startCmd("a", [])
    const _empty2 :[Cmd] =
      startCmd("a", [], { dir: "" })

    const ____  :[Cmd,Pipes<null,null,null>] =
      startCmd("a", [], { stdin:null, stdout:null, stderr:"inherit" })
    const ____2 :[Cmd,Pipes<null,null,null>] =
      startCmd("a", [], { stdin:null, stdout:null, stderr:null })
    const ____3 :[Cmd,Pipes<null,null,null>] =
      startCmd("a", [], { stdin:null })
    const ____4 :[Cmd,Pipes<null,null,null>] =
      startCmd("a", [], { stdout:null })
    const ____5 :[Cmd,Pipes<null,null,null>] =
      startCmd("a", [], { stderr:null })

    const _extraFiles :[Cmd,Pipes<null,null,null>] =
      startCmd("a", [], { extraFiles:[] })

    const _p__  :[Cmd,Pipes<io.Writer,null,null>] =
      startCmd("a", [], { stdin:"pipe", stdout:null, stderr:null })
    const _p__2 :[Cmd,Pipes<io.Writer,null,null>] =
      startCmd("a", [], { stdin:"pipe" })

    const _pp_  :[Cmd,Pipes<io.Writer,io.Reader,null>] =
      startCmd("a", [], { stdin:"pipe", stdout:"pipe", stderr:null })
    const _pp_2 :[Cmd,Pipes<io.Writer,io.Reader,null>] =
      startCmd("a", [], { stdin:"pipe", stdout:"pipe" })

    const _ppp  :[Cmd,Pipes<io.Writer,io.Reader,io.Reader>] =
      startCmd("a", [], { stdin:"pipe", stdout:"pipe", stderr:"pipe" })

    const __pp  :[Cmd,Pipes<null,io.Reader,io.Reader>] =
      startCmd("a", [], { stdin:null, stdout:"pipe", stderr:"pipe" })
    const __pp2 :[Cmd,Pipes<null,io.Reader,io.Reader>] =
      startCmd("a", [], { stdout:"pipe", stderr:"pipe" })

    const _p_p  :[Cmd,Pipes<io.Writer,null,io.Reader>] =
      startCmd("a", [], { stdin:"pipe", stdout:null, stderr:"pipe" })
    const _p_p2 :[Cmd,Pipes<io.Writer,null,io.Reader>] =
      startCmd("a", [], { stdin:"pipe",              stderr:"pipe" })

    const ___p  :[Cmd,Pipes<null,null,io.Reader>] =
      startCmd("a", [], { stdin:null, stdout:null, stderr:"pipe" })
    const ___p2 :[Cmd,Pipes<null,null,io.Reader>] =
      startCmd("a", [], { stderr:"pipe" })
  }

  // ---- copy of above, but args omitted ----
  {
    const _empty1 :[Cmd] =
      startCmd("a")
    const _empty2 :[Cmd] =
      startCmd("a", { dir: "" })

    const ____  :[Cmd,Pipes<null,null,null>] =
      startCmd("a", { stdin:null, stdout:null, stderr:"inherit" })
    const ____2 :[Cmd,Pipes<null,null,null>] =
      startCmd("a", { stdin:null, stdout:null, stderr:null })
    const ____3 :[Cmd,Pipes<null,null,null>] =
      startCmd("a", { stdin:null })
    const ____4 :[Cmd,Pipes<null,null,null>] =
      startCmd("a", { stdout:null })
    const ____5 :[Cmd,Pipes<null,null,null>] =
      startCmd("a", { stderr:null })

    const _extraFiles :[Cmd,Pipes<null,null,null>] =
      startCmd("a", { extraFiles:[] })

    const _p__  :[Cmd,Pipes<io.Writer,null,null>] =
      startCmd("a", { stdin:"pipe", stdout:null, stderr:null })
    const _p__2 :[Cmd,Pipes<io.Writer,null,null>] =
      startCmd("a", { stdin:"pipe" })

    const _pp_  :[Cmd,Pipes<io.Writer,io.Reader,null>] =
      startCmd("a", { stdin:"pipe", stdout:"pipe", stderr:null })
    const _pp_2 :[Cmd,Pipes<io.Writer,io.Reader,null>] =
      startCmd("a", { stdin:"pipe", stdout:"pipe" })

    const _ppp  :[Cmd,Pipes<io.Writer,io.Reader,io.Reader>] =
      startCmd("a", { stdin:"pipe", stdout:"pipe", stderr:"pipe" })

    const __pp  :[Cmd,Pipes<null,io.Reader,io.Reader>] =
      startCmd("a", { stdin:null, stdout:"pipe", stderr:"pipe" })
    const __pp2 :[Cmd,Pipes<null,io.Reader,io.Reader>] =
      startCmd("a", { stdout:"pipe", stderr:"pipe" })

    const _p_p  :[Cmd,Pipes<io.Writer,null,io.Reader>] =
      startCmd("a", { stdin:"pipe", stdout:null, stderr:"pipe" })
    const _p_p2 :[Cmd,Pipes<io.Writer,null,io.Reader>] =
      startCmd("a", { stdin:"pipe",              stderr:"pipe" })

    const ___p  :[Cmd,Pipes<null,null,io.Reader>] =
      startCmd("a", { stdin:null, stdout:null, stderr:"pipe" })
    const ___p2 :[Cmd,Pipes<null,null,io.Reader>] =
      startCmd("a", { stderr:"pipe" })
  }

}
