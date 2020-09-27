import * as filepath from "path"
import * as fs from "fs"

import { BuildConfig, BuildResult } from "../estrella"
import log from "./log"
import { repr } from "./util"
import { Cmd, startCmd } from "./exec"
import { stdoutStyle } from "./termstyle"
import * as io from "./io"
import * as signal from "./signal"


let _initialized = false
let _deinitialized = false
let _runContexts = new Set<RunContext>()

function init() {
  if (_initialized) { return }
  _initialized = true
  process.on("beforeExit", exitCode      => atexit(DEBUG && `process.on beforeExit ${exitCode}`))
  process.on("exit",       exitCode      => atexit(DEBUG && `process.on exit ${exitCode}`))
  const onsignal = (sig: NodeJS.Signals) => atexit(DEBUG && `process.on signal ${sig}`)
  signal.addListener("SIGINT", onsignal)
  signal.addListener("SIGHUP", onsignal)
  signal.addListener("SIGTERM", onsignal)
  signal.addListener("SIGPIPE", onsignal)
}


function atexit(cause :string|false) {
  if (_deinitialized) { return }
  _deinitialized = true

  // any log messages must be sync since process is about to terminate
  const logerr = (msg :string) => fs.writeSync((process.stderr as any).fd, msg + "\n")

  try {
    // log in debug mode
    if (DEBUG) {
      let runningCount = 0
      for (let ctx of _runContexts) {
        if (ctx.cmd.running) {
          runningCount++
        }
      }
      if (runningCount > 0) {
        logerr(`[DEBUG run.atexit] run.atexit (${cause})`)
      }
    }

    // Send SIGTERM to any running processes.
    // It's better to send SIGTERM than SIGKILL in this case since in almost all scenarios
    // processes are well-behaved and won't ignore SIGTERM (forever.) On the flipside, sending
    // SIGKILL may cause some processes to miss out on important atexit code
    for (let ctx of _runContexts) {
      if (ctx.cmd.running) {
        DEBUG && logerr(`[DEBUG run.atexit] sending SIGTERM to ${ctx.cmd}`)
        try {
          ctx.cmd.signal("SIGTERM")
        } catch(_) {}
      }
    }

    _runContexts.clear()
  } catch (err) {
    logerr(`ignoring error in run.atexit: ${err.stack||err}`)
  }
}


// This is a bit hacky but robust: when not in watch mode and we running just one process,
// the exit code of the command is used for existing estrella.
let _setEstrellaExitCodeOnCmdExit = false


// run.configure is called by build1 with a mutable copy of config.
// If config.run is not falsy, this function sets up onStart and onEnd handlers on config
// to manage execution of the build product.
export function configure(config :BuildConfig) {
  if (!config.run) {
    _setEstrellaExitCodeOnCmdExit = false  // may be many targets
    return
  }

  log.debug(()=> `run.configure run=${repr(config.run)}`)

  const ctx = new RunContext(config)
  _runContexts.add(ctx)

  // const onStartNext = config.onStart
  // config.onStart = async (config, changedFiles, bctx) => {
  //   if (typeof onStartNext == "function") {
  //     await onStartNext(config, changedFiles, bctx)
  //   }
  //   return ctx.onStartBuild(changedFiles)
  // }

  const onEndNext = config.onEnd
  config.onEnd = async (config, buildResult, bctx) => {
    await ctx.onEndBuild(buildResult)
    if (typeof onEndNext == "function") {
      return onEndNext(config, buildResult, bctx)
    }
  }

  if (config.watch || _runContexts.size > 1) {
    _setEstrellaExitCodeOnCmdExit = false
  } else if (!config.watch) {
    _setEstrellaExitCodeOnCmdExit = true
  }

  init()
}


class RunContext {
  readonly config  :Readonly<BuildConfig>
  readonly cmd     :Cmd
  readonly cmdname :string  // shown in logs

  _logOnExit = true // state used by onEndBuild to decide if exit is logged or not

  constructor(config :Readonly<BuildConfig>) {
    this.config = config

    // Create a command object with stdout and stderr forwarding (/dev/null for stdin)
    this.cmd = new Cmd("")
    this.cmd.stdout = "inherit"
    this.cmd.stderr = "inherit"
    this.cmd.env["ESTRELLA_PATH"] = __filename
    this.cmd.env["ESTRELLA_VERSION"] = VERSION

    if (typeof config.run == "string") {
      this.cmd.command = config.run
      this.cmd.shell = true
      this.cmdname = config.run

    } else if (typeof config.run == "boolean") {
      if (!config.outfile) {
        throw new Error(`set config.outfile=<file> or config.run=<file>`)
      }
      this.cmd.command = process.execPath // node
      this.cmd.args = [filepath.resolve(config.outfile)]
      this.cmdname = config.outfile

    } else {
      if (!config.run || config.run.length == 0) {
        throw new Error("config.run is an empty list")
      }
      this.cmd.command = config.run[0]
      this.cmd.args = config.run.slice(1)
      this.cmdname = config.run.join(" ")
      if (this.cmdname.length > 60) {
        this.cmdname = this.cmdname.substr(0,57) + "..."
      }
    }
  }

  async onEndBuild(buildResult :BuildResult) {
    if (buildResult.errors.length > 0) {
      // don't start or restart a process if the build failed
      return
    }

    // okay, let's start or restart this.cmd
    const cmd = this.cmd
    const style = stdoutStyle.pink

    // if the program is still running, stop it first
    const restart = cmd.running
    if (cmd.running) {
      this._logOnExit = false
      log.debug(() => `Stopping ${this.cmdname} [${cmd.pid}] ...`)
      await cmd.kill()
    }

    // start new process and log its PID
    let { stdout } = cmd.start()!
    log.info(() => style(`${restart ? "Restarted" : "Running"} ${this.cmdname} [${cmd.pid}]`))

    // log info about the process existing (unless it was restarted)
    this._logOnExit = true
    cmd.promise.then(exitCode => {
      this._logOnExit && log.info(() => style(`${this.cmdname} exited (${exitCode})`))
      if (_setEstrellaExitCodeOnCmdExit) {
        process.exitCode = exitCode
      }
    })
  }
}

