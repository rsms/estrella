import * as filepath from "path"
import * as fs from "fs"

import { BuildConfig, BuildResult } from "../estrella"
import log from "./log"
import { repr } from "./util"
import { Cmd, startCmd } from "./exec"
import * as io from "./io"

// run.configure is called by build1 with a mutable copy of config.
// If config.run is not falsy, this function sets up onStart and onEnd handlers on config
// to manage execution of the build product.
export function configure(config :BuildConfig) {
  if (!config.run) {
    return
  }

  log.debug(()=> `run.configure run=${repr(config.run)}`)

  const ctx = new RunContext(config)

  const onStartNext = config.onStart
  const onEndNext = config.onEnd

  config.onStart = async (config, changedFiles, bctx) => {
    if (typeof onStartNext == "function") {
      await onStartNext(config, changedFiles, bctx)
    }
    return ctx.onStartBuild(changedFiles)
  }

  config.onEnd = async (config, buildResult, bctx) => {
    await ctx.onEndBuild(buildResult)
    if (typeof onEndNext == "function") {
      return onEndNext(config, buildResult, bctx)
    }
  }

  init()
}


let _initialized = false

function init() {
  if (_initialized) { return } ; _initialized = true
  // TODO hook up signal handler
}


class RunContext {
  readonly config :Readonly<BuildConfig>
  readonly cmd    :Cmd

  constructor(config :Readonly<BuildConfig>) {
    this.config = config

    this.cmd = new Cmd("")
    this.cmd.stdout = "inherit" // "pipe"
    this.cmd.stderr = "inherit"

    if (typeof config.run == "boolean") {
      if (!config.outfile) {
        throw new Error(`config.outfile is required when config.run=true`)
      }
      this.cmd.command = process.execPath // node
      this.cmd.args = [filepath.resolve(config.outfile)]
    } else if (typeof config.run == "string") {
      this.cmd.command = config.run
      this.cmd.shell = true
    } else if (!config.run || config.run.length == 0) {
      throw new Error("config.run is an empty list")
    } else {
      this.cmd.command = config.run[0]
      this.cmd.args = config.run.slice(1)
    }
  }

  async onStartBuild(_changedFiles :string[]) {
    log.debug(()=> `run onStartBuild`)
  }

  async onEndBuild(_buildResult :BuildResult) {
    log.debug(()=> `run spawn ${repr(this.cmd.command)} ${repr(this.cmd.args)}`)
    // TODO: if buildResult.errors.length > 0 then don't do shit

    const cmd = this.cmd

    cmd.env["IDLE_FOREVER"] = "1"
    cmd.env["IGNORE_SIGINT"] = "1"
    cmd.env["IGNORE_SIGTERM"] = "1"
    cmd.env["SPAWN_SUBPROCESSES"] = "1"
    let { stdout } = cmd.start()!

    // console.log("stdout:", [ (await stdout!.read()).toString("utf8") ])

    // for await (const chunk of stdout!) {
    //   console.log(">>", chunk.toString("utf8"))
    // }

    await new Promise(r => setTimeout(r, 1000))
    await cmd.kill(undefined, 1000)

    let exitStatus = await cmd.wait(1000).catch(err => {
      console.error(err.stack||String(err))
    })
    log.debug(`cmd exit status: ${exitStatus}`)

    // run again
    // stdout = cmd.start()!.stdout
    // console.log("stdout:", [ (await stdout!.read()).toString("utf8") ])
    // exitStatus = await cmd.wait(30000)
    // log.debug(`cmd exit status: ${exitStatus}`)
  }
}

