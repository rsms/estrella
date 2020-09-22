import * as Path from "path"
import * as fs from "fs"

import { json, jsonparseFile, findInPATH } from "./util"
import { style, stderrStyle } from "./termstyle"
import { screen } from "./screen"
import { findTSC, findTSConfigFile } from "./tsutil"

const { dirname, basename } = Path


// defaultTSRules maps TS diagnostics codes to severity levels.
// The special value IGNORE can be used to completely silence a diagnostic.
// For diagnostic codes not listed, the default DiagnosticCategory for a
// certain diagnostic is used.
export const defaultTSRules = {
  6031: "IGNORE",  // starting compilation
  6194: "IGNORE",  // Found N errors. Watching for file changes.
  6133: "WARNING", // unused variable, parameter or import
  2531: "WARNING", // Object is possibly 'null'
  7006: "WARNING", // Parameter 'x' implicitly has an 'any' type.
  7015: "WARNING", // Element implicitly has an 'any' type because index expression is not ...
  7053: "WARNING", // Element implicitly has an 'any' type because expression of type can't be ...
}


const IGNORE  = 0
    , INFO    = 1
    , WARNING = 2
    , ERROR   = 3


const severities = {IGNORE,INFO,WARNING,ERROR}


function addTSRules(dst, src) {
  for (let k of Object.keys(src)) {
    let v = severities[String(src[k]).toUpperCase()]
    if (v === undefined) {
      throw new Error(
        `Invalid value for TS rule ${k}: ${json(v)} -- expected value to be one of: `+
        Object.keys(severities).map(json).join(", ")
      )
    }
    dst[k] = v
  }
}


// returns a promise which resolves to a boolean "no errors", when the TSC process ends.
// Note that in watch mode, the promise only resolves after explicitly calling cancel.
// The returned promise is cancellable. I.e. p.cancel()
//
export function tslint(options /*:TSLintOptions*/) {
  if (!options) { options = {} }
  let cancellation = {
    cancelled: false,
    cancel(){},
  }
  let p = new Promise((resolve, reject) => {

  if (options.mode == "off") {
    return resolve(true)
  }

  const logInfo = options.quiet ? ()=>{} : console.log.bind(console)
  const cwd = options.cwd || process.cwd()

  // find tsconfig.json file
  const tsconfigFile = (
    options.mode == "on" ? null :
    options.tsconfigFile ? options.tsconfigFile :
    findTSConfigFile(options.srcdir ? Path.resolve(cwd, options.srcdir) : cwd)
  )
  if (options.mode != "on" && !tsconfigFile) {
    // no tsconfig file found -- in auto mode, we consider this "not a TypeScript project".
    return resolve(true)
  }

  // find tsc program
  let tscprog = findTSC(options.cwd /* ok if undefined */)
  if (tscprog == "tsc" && options.mode != "on") {
    // look up tsc in PATH
    if (!(tscprog = findInPATH(tscprog))) {
      // we found a tsconfig.json file but not tsc
      console.warn(
        stderrStyle.orange(prog + ":") + ` tsc not found in node_modules or PATH.` +
        ` However a tsconfig.json file was found in ` +
        Path.relative(process.cwd(), dirname(tsconfigFile)) + `.`
        ` Set tslint options.tsc="off" or pass -no-diag on the command line.`
      )
      return resolve(true)
    }
  }

  // rules
  const tsrules = {}
  addTSRules(tsrules, defaultTSRules)
  if (options.rules) {
    addTSRules(tsrules, options.rules)
  }

  // CLI arguments
  let args = [
    "--noEmit",
    options.colors && "--pretty",
    options.watch && "--watch",
    tsconfigFile && "--project", tsconfigFile,
  ].concat(options.args || []).filter(a => a)

  // spawn tsc process
  const { spawn } = require("child_process")
  const p = spawn(tscprog, args, {
    stdio: ['inherit', 'pipe', 'inherit'],
    cwd,
  })

  // kill process on exit to avoid EPIPE errors
  const onProcessExitHandler = () => {
    try { p.kill() } catch (_) {}
  }
  process.on('exit', onProcessExitHandler)

  // cancellation handler
  cancellation.cancel = () => {
    // called just once (guarded by user cancel function)
    p.kill()
  }

  const infoStyle  = s => s
      , warnStyle  = style.orange
      , errorStyle = style.red
      , okStyle    = style.green

  const _TS_buf = Buffer.from(" TS")
  const Found__buf = Buffer.from("Found ")
  const ANSI_clear_buf = Buffer.from("\x1bc")
  const Starting_compilation_buf = Buffer.from("Starting compilation")

  const tsmsgbuf = []
  let tscode = 0
  let lastRunHadErrors = false
  let stats = {
    errors: 0,
    warnings: 0,
    other: 0,
    reset() {
      this.errors = 0
      this.warnings = 0
      this.other = 0
    },
  }

  let isIdle = false


  function onSessionEnd() {
    if (!options.quiet || stats.errors >= 0) {
      options.watch && console.log(screen.banner("—"))
      let summary = []
      if (stats.errors > 0) {
        summary.push(errorStyle("TS: " + plural(`$ error`, `$ errors`, stats.errors)))
      } else {
        summary.push(okStyle("TS: OK"))
      }
      if (stats.warnings > 0) {
        summary.push(warnStyle(plural(`$ warning`, `$ warnings`, stats.warnings)))
      }
      if (stats.other > 0) {
        summary.push(plural(`$ message`, `$ messages`, stats.other))
      }
      console.log(summary.join("   "))
      options.watch && console.log(screen.banner("—"))
    }
    lastRunHadErrors = stats.errors > 0
    options.onEnd && options.onEnd(stats)
    stats.reset()
    isIdle = true
  }


  // called when tsmsgbuf contains one or more lines of one TypeScript message.
  function flushTSMessage(compilationPassCompleted) {
    // console.log(`------------------- TS${tscode} ------------------`)
    // reset buffer
    const lines = tsmsgbuf.slice()
    tsmsgbuf.length = 0

    if (tscode == 0) {
      const line0 = lines[0]
      if (line0.includes(Starting_compilation_buf)) {
        stats.reset()
        // ignore "Starting compilation [in watch mode...]" message
        return compilationPassCompleted && onSessionEnd()
      } else if (lines.every(line => line.length <= 1)) {
        // ignore empty message
        return compilationPassCompleted && onSessionEnd()
      }
    } else {
      const errorRe = /(?:\x1b\[\d+m|)error(?:\x1b\[\d+m|)/g
      let line0 = lines.shift().toString("utf8")
      switch (tsrules[tscode]) {
        case IGNORE: return compilationPassCompleted && onSessionEnd()

        case INFO:
          // rewrite potentially ANSI-colored first line "error"
          line0 = line0.replace(errorRe, infoStyle("info"))
          restyleSrcLineWaves(lines, infoStyle)
          stats.other++
          break

        case WARNING:
          // rewrite potentially ANSI-colored first line "error"
          line0 = line0.replace(errorRe, warnStyle("warning"))
          restyleSrcLineWaves(lines, warnStyle)
          stats.warnings++
          break

        default: // ERROR or other
          if (errorRe.test(line0)) {
            stats.errors++
          } else {
            stats.other++
          }
          break
      }
      process.stdout.write(line0)
    }

    // write lines to stdout
    lines.forEach(v => process.stdout.write(v))

    compilationPassCompleted && onSessionEnd()
  }


  function restyleSrcLineWaves(lines, stylefn) {
    for (let i = 1; i < lines.length; i++) {
      let line = lines[i]
      if (line.includes(0x7e)) { // ~
        let s = line.toString("utf8") // "\x1b[91m"
        s = s.replace(/\x1b\[\d+m(\s*~+)/g, stylefn("$1"))
        lines[i] = s  // ok to set string instead of Buffer
      }
    }
  }


  function plural(singular, plural, n) {
    return (n == 1 ? singular : plural).replace(/\$/g, n)
  }

  lineReader(p.stdout, (line, flush) => {
    if (!options.clearScreen) {
      line = stripANSIClearCode(line)
    }
    if (flush) {
      if (line.length > 0) {
        tsmsgbuf.push(line)
      }
      if (tsmsgbuf.length > 0) {
        flushTSMessage()
      }
      return
    }

    if (isIdle && line.length > 1) {
      // first non-empty line after isIdle state has been entered marks the start of
      // a new session.
      isIdle = false
      options.onRestart && options.onRestart()
    }

    if (line.includes(Found__buf)) {
      let s = stripANSICodesStr(line.toString("utf8"))
      if (/^(?:\[[^\]]+\] |[\d\:PAM \-]+|)Found \d+ error/.test(s)) {
        // TypeScript has completed a compilation pass
        flushTSMessage(true)
        tscode = 0
        return // don't add this line to line buffer
      } else {
        flushTSMessage(false)
      }
      tscode = 0
    } else {
      // console.log("--> " + line.subarray(0, line.length-1).toString("utf8"))
      if (line.includes(_TS_buf)) {
        const s = line.toString("utf8")
        const m = /(?:\x1b\[\d+m|)error(?:\x1b\[\d+m\x1b\[\d+m|) TS(\d+)\:/.exec(s)
        // const m = /(?:\x1b\[\d+m|)error(?:\x1b\[\d+m|) TS(\d+)\:/.exec(s)
        let tscode2 = m ? parseInt(m[1]) : 0
        if (tscode2 > 0 && !isNaN(tscode2)) {
          if (tsmsgbuf.length > 0) {
            flushTSMessage()
          }
          tscode = tscode2
        }
      }
    }
    tsmsgbuf.push(line)
  })

  // lineReader(p.stderr, line => {
  //   process.stderr.write(line)
  // })

  p.on('close', code => {
    // console.log(`tsc exited with code ${code}`)
    process.removeListener('exit', onProcessExitHandler)
    resolve(!lastRunHadErrors)
  })

  function stripANSICodesStr(s) {
    return s.replace(/\x1b\[\d+m/g, "")
  }

  function stripANSIClearCode(buf) {
    // strip "clear" ANSI code is present in buf
    let i = buf.indexOf(ANSI_clear_buf)
    return (
      i == -1 ? buf :
      i == 0 ? buf.subarray(3) :
      Buffer.concat([buf.subarray(0,i), buf.subarray(i+3)], buf.length - 3)
    )
  }
  }) // Promise
  p.cancel = () => {
    if (!cancellation.cancelled) {
      cancellation.cancelled = true
      cancellation.cancel()
    }
    return p
  }
  return p
} // end function tslint

const emptyBuffer = Buffer.allocUnsafe(0)


function lineReader(r, onLine) {
  let bufs = [], bufz = 0
  const readbuf = data => {
    let offs = 0
    while (true) {
      let i = data.indexOf(0x0A, offs)
      if (i == -1) {
        if (offs < data.length - 1) {
          const chunk = data.subarray(offs)
          bufs.push(chunk)
          bufz += chunk.length
        }
        break
      }
      i++
      let buf = data.subarray(offs, i)
      if (bufz > 0) {
        buf = Buffer.concat(bufs.concat(buf), bufz + buf.length)
        bufs.length = 0
        bufz = 0
      }
      onLine(buf, false)
      offs = i
    }
  }
  const flush = () => {
    if (bufs.length > 0) {
      onLine(Buffer.concat(bufs, bufz), true)
    } else {
      onLine(emptyBuffer, true)
    }
  }

  // TEST
  // readbuf(Buffer.from("hello"))
  // readbuf(Buffer.from(" world\n"))
  // readbuf(Buffer.from("How"))
  // readbuf(Buffer.from("'s "))
  // readbuf(Buffer.from("it go"))
  // readbuf(Buffer.from("ing?\n"))
  // readbuf(Buffer.from("quite well\nI hope!\nBye\n"))
  // readbuf(Buffer.from("bye."))
  // flush()
  // lineReader(0, line => {
  //   console.log({line:line.toString("utf8")})
  // })

  r.on("data", readbuf)
  r.on("close", flush)
  r.on("end", flush)
}
