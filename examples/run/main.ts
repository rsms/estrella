import { spawn, ChildProcess } from "child_process"
import * as fs from "fs"
import { inspect } from "util"

const subprocID = process.env["TEST_SUBPROCESS_ID"] || ""
const procID = subprocID ? `  subproc${subprocID}[${process.pid}]` : `mainproc[${process.pid}]`
const log = (...v :any[]) => {
  let msg = [procID].concat(v).join(" ")
  // fs.writeSync so that multiple processes' output is not intertwined
  fs.writeSync((process.stdout as any).fd, msg + "\n")
}
const subprocs :ChildProcess[] = []

log(`start`)

if (process.env["IGNORE_SIGTERM"]) {
  log("enabled ignore SIGTERM")
  process.on("SIGTERM", () => {
    log("received and ignoring SIGTERM")
    // fs.writeFileSync(__dirname + `/ack-sigterm-${procID}.mark`, procID)
    if (subprocs.length) {
      log(`forwarding SIGTERM to ${subprocs.length} subprocesses`)
      for (let id = 0; id < subprocs.length; id++) {
        const p = subprocs[id]
        if (p.exitCode !== null) {
          log(`subproc#${id}[${p.pid}] not running`)
        } else {
          p.kill("SIGTERM")
        }
      }
    }
  })
}

if (!subprocID && process.env["SPAWN_SUBPROCESSES"]) {
  let count = parseInt(process.env["SPAWN_SUBPROCESSES"])
  if (isNaN(count) || count == 0) {
    count = 1
  }
  log(`spawning ${count} subprocesses`)

  for (let i = 0; i < count; i++) {
    const env = {...process.env}
    delete env["SPAWN_SUBPROCESSES"]  // avoid subprocesses spawning subprocesses spawning...
    env["TEST_SUBPROCESS_ID"] = `${i}`
    const p = spawn(process.execPath, [ __filename ], {
      env,
      stdio: "inherit",
    })
    if (p.pid === undefined) {
      throw new Error(`failed to spawn subprocess`)
    }
    log(`spawned subprocess with pid ${p.pid}`)
    p.on("exit", (code, signal) => {
      log(`subproc#${i}[${p.pid}] exited code=${code} signal=${signal}`)
    })
    subprocs.push(p)
  }
}


const idleTime = 5000
log(`waiting ${idleTime/1000}s until exiting cleanly`)
setTimeout(() => {}, idleTime)
