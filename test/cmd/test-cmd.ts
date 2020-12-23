import { strictEqual as asserteq } from "assert"
import * as os from "os"
import * as Path from "path"
const child_process = require("child_process")

// NOTE: This test embeds source files from estrella.
//
// It's important to do the following three things:
//   1. Import "global" first. This includes global things like assert and types.
//   2. import { setEstrellaDir } from "extra"
//   3. call setEstrellaDir with the absolute directory of estrella.js
//
import "../../src/global"
import { setEstrellaDir } from "../../src/extra"
import { startCmd, SignalMode, Signal } from "../../src/exec"
import { repr } from "../../src/util"
import { readlines } from "../../src/io"

setEstrellaDir(__dirname + "/../../dist")
process.chdir(__dirname)

const verbose = !!parseInt(process.env["ESTRELLA_TEST_VERBOSE"])
const log = verbose ? console.log.bind(console) : ()=>{}
function fail(...msg) { console.error("FAIL", ...msg) ; process.exit(1) }


// this tests Cmd, running a subprocess which in turn runs its own subprocesses
//
async function test1(signalMode :SignalMode, numSubprocs: number) {
  const env = {...process.env,
    "IGNORE_SIGTERM": "true",
    "SPAWN_SUBPROCESSES": String(numSubprocs),
  }
  if (signalMode == "standard") {
    // ask the process to forward SIGTERM to subprocesses since we can't use pg signalling
    env["FORWARD_SIGTERM"] = "true"
  }

  const [cmd,{stdout}] = startCmd(process.execPath, ["program1.js"], {
    stdout: "pipe",
    stderr: "inherit",
    env,
  })

  log(`startCmd ${repr(cmd.command)} ${repr(cmd.args)}`)

  // Note that order of output is non-deterministic beyond the message
  //   "mainproc[PID] spawning N subprocesses"
  // Therefore we count and test instead of simply verifying a certain specific output.

  let mainprocStarted = false
  let subprocReadyCount = 0
  let subprocPIDs :number[] = []
  let killPromise :Promise<number>|null = null
  let mainprocRecvSIGTERM = 0
  let subprocRecvSIGTERMCount = 0
  let killTimer :any = null

  const finalSignal = "SIGINT"

  const signalAll = (signal :Signal) => {
    // kill (signal 9) since we disabled timeout in kill()
    cmd.signal(signal, signalMode)

    // send the signal manually in standard signalling mode
    if (signalMode == "standard") {
      for (let pid of subprocPIDs) {
        process.kill(pid, signal)
      }
    }
  }

  for await (const line of readlines(stdout, "utf8")) {
    log("stdout>>", line.trimEnd())

    // step 1: main process confirmed as launched
    if (!mainprocStarted) {
      if (/mainproc\[\d+\] start/.test(line)) {
        mainprocStarted = true
      }
    }

    // step 2: sub-processes confirmed launched & waiting
    else if (subprocReadyCount < numSubprocs) {
      const m = line.match(/subproc\d+\[(\d+)\] waiting/)
      if (m) {
        // step 1: register subprocess as launched
        subprocPIDs.push(parseInt(m[1]))
        subprocReadyCount++
      }
      if (subprocReadyCount == numSubprocs) {
        log(`all subprocs launched. PIDs: ${subprocPIDs.join(",")} OK`)

        // Now send SIGTERM to the process.
        // Disable timeout so that the test does not depend on timing/race.
        log("sending SIGTERM")
        killPromise = cmd.kill("SIGTERM", /*timeout*/0, signalMode)

        // setup a long manual timeout for the test
        killTimer = setTimeout(() => {
          signalAll("SIGKILL")
          fail("did not finish within 1s")
        },1000)
      }
    }

    // step 3: main process confirms receiving SIGTERM
    else if (!mainprocRecvSIGTERM || subprocRecvSIGTERMCount < numSubprocs) {
      if (/mainproc\[\d+\] received and ignoring SIGTERM/.test(line)) {
        mainprocStarted = true
      }
      if (/subproc\d+\[\d+\] received and ignoring SIGTERM/.test(line)) {
        subprocRecvSIGTERMCount++
      }
      if (mainprocStarted && subprocRecvSIGTERMCount == numSubprocs) {
        log("all subprocs acknowledge receiving SIGTERM. OK")

        // check that subprocesses are still running
        if (processInfoCommand) for (let pid of subprocPIDs) {
          const cmdinfo = await getProcessInfoForPID(pid)
          if (cmdinfo.indexOf(Path.basename(process.execPath)) == -1) {
            console.warn(
              `subproc [${pid}] not found.`+
              `\ngetProcessInfoForPID returned:\n${cmdinfo}`
            )
          }
        }

        // send SIGINT to cmd and its subprocesses (SIGINT since they ignore SIGTERM)
        signalAll(finalSignal)
        // note that if this does not cause the process to terminate, killTimer will expire
        // and send SIGKILL
        break
      }
    }

    else {
      fail("received unexpected command output:", [line])
      signalAll("SIGKILL")
    }
  }

  // wait for process to exit
  const killReturnValue = await killPromise
  clearTimeout(killTimer)

  // check for subprocess zombies
  if (processInfoCommand) for (let pid of subprocPIDs) {
    const cmdinfo = await getProcessInfoForPID(pid)
    if (cmdinfo.indexOf(Path.basename(process.execPath)) != -1) {
      console.warn(
        `subproc [${pid}] still running.`+
        `\ngetProcessInfoForPID returned:\n${cmdinfo}`
      )
    }
  }

  // check state
  const finalSignal_code = os.constants.signals[finalSignal]
  asserteq(cmd.exitCode, -finalSignal_code,
    `Should exit from signal ${finalSignal} (-${finalSignal_code}) but got ${cmd.exitCode}`)
  asserteq(killReturnValue, cmd.exitCode)
}


async function main() {
  // how many subprocesses the process should spawn "underneath" itself.
  // 2 is enough for the test to make sense.
  const numSubprocs = 2

  // log note about skipping liveness checks
  if (!processInfoCommand) {
    log("skipping OS-level process liveness checks (unsupported)")
  }

  await test1("standard", numSubprocs)
  if (!os.platform().startsWith("win")) {
    // test process group signalling
    await test1("group", numSubprocs)
  }
}


// this is an OS-dependent shell command that given $PID returns the process filename
const processInfoCommand = (()=>{
  switch (os.platform()) {
    case "darwin":
    case "freebsd":
    case "linux":
    case "openbsd":
      return "ps ax | awk '$1 == $PID { print $0 }'"

    case "aix":
    case "sunos":
    case "win32":
      return ""

    default:
      return ""
  }
})()


function getProcessInfoForPID(pid :number) :Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const options = {}
    const command = processInfoCommand.replace(/\$PID/, pid)
    child_process.exec(command, options, (error, stdout, _stderr) => {
      // if (error) {
      //   reject(error)
      // } else {
      resolve(stdout || "")
      // }
    })
  })
}


main().catch(err => {
  console.error(err.stack||String(err))
  process.exit(2)
})


