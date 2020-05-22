#!/usr/bin/env node
import * as esbuild from "esbuild"
import * as fs from "fs"
import * as Path from "path"
import * as glob from "miniglob"

import { json, clock, fmtDuration, findInPATH, tildePath } from "./util"
import { memoize, isMemoized } from "./memoize"
import { termStyle, style, stderrStyle } from "./termstyle"
import { chmod, editFileMode } from "./chmod"
import { screen } from "./screen"
import { scandir, watchdir } from "./watch"
import { tslint, defaultTSRules } from "./tslint"
import { getTSConfigFileForConfig, getTSConfigForConfig } from "./tsutil"

const { dirname, basename } = Path

const USAGE = `
usage: $0 [options]
options:
  -watch, -w          Watch source files for changes and rebuild.
  -debug, -g          Do not optimize and define DEBUG=true.
  -sourcemap          Generate sourcemap.
  -inline-sourcemap   Generate inline sourcemap.
  -color              Color terminal output, regardless of TTY status.
  -no-color           Disable use of colors.
  -no-clear           Disable clearing of the screen, regardless of TTY status.
  -no-diag            Disable TypeScript diagnostics.
  -diag               Only run TypeScript diagnostics (no esbuild.)
  -quiet              Only log warnings and errors but nothing else.
  -h, -help           Print help to stderr and exit 0.
  -estrella-version   Print version of estrella and exit 0.
  -estrella-debug     Enable debug logging of estrella itself.
`

// CLI options with their default values
const cliOptions = {
  w: false, watch: false,
  debug: false, g: false,
  color: false,
  "no-color": false,
  sourcemap: false,
  "inline-sourcemap": false,
  "no-clear": false,
  "no-diag": false,
  diag: false,
  quiet: false,
  "estrella-debug": false,
  "estrella-version": false,
}

// CLI options when run directly, not via a script
const maincli = {
  helpUsage: "usage: $0 [options] <srcfile> ...",
  helpExtraText: `
  -bundle             Bundle all dependencies into the output files.
  -minify             Simplify and compress generated code.
  -o, -outfile <file> Write output to <file> instead of stdout.
  -outdir <dir>       Write output to <dir> instead of stdout.
  `,
  extraOptions: {
    bundle: false,
    minify: false,
    outdir: "",
    outfile: "", o: "",
  },
}

// keys of the config object passed to main/build which are specific to this program
// and not accepted by esbuild.
// Should match keys of BuildConfig struct in estrella.d.ts
const buildConfigKeys = new Set([
  "cwd",
  "debug",
  "entry",
  "onEnd",
  "onStart",
  "outfileMode",
  "quiet",
  "title",
  "tsc",
  "tsrules",
  "watch",
])

// ---------------------------------------------------------------------------------------------

const prog = (process.env["_"]||"/node").endsWith("/node") ? process.argv[1] : process.env["_"]


// updated by parseopt to _logDebug when -estrella-debug is set
var logDebug = ()=>{}

function _logDebug(...v) {
  const e = {} ; Error.captureStackTrace(e, _logDebug)
  const f = (e.stack ? e.stack.split("\n",3) : [])[1]  // stack frame
  const m = f && /at (\w+)/.exec(f)
  const meta = m ? " " + m[1] : ""
  v = v.map(v => typeof v == "function" ? v() : v)
  console.error(stderrStyle.pink(`[DEBUG${meta}]`), ...v)
}


// setErrorExitCode(code:number=1) causes the program to exit with the provied code
// in case it exits cleanly.
// This is used to make it possible to exit with an error when there are multiple
// builds happening.
//
let _setErrorExitCode = false
function setErrorExitCode(code) {
  if (!_setErrorExitCode) {
    _setErrorExitCode = true
    let overrideCode = code || 1
    process.on("exit", code => { process.exit(code || overrideCode) })
  }
}


function processConfig(config) {
  // support use of both entry and entryPoints
  logDebug(()=>`processing ${json(config)}`)
  if (!config.entryPoints) {
    config.entryPoints = []
  }
  if (config.entry) {
    if (Array.isArray(config.entry)) {
      config.entryPoints = config.entryPoints.concat(config.entry)
    } else {
      config.entryPoints.push(config.entry)
    }
  }
  delete config.entry
  if (config.entryPoints.length == 0) {
    // No entryPoints provided. Try to read from tsconfig include or files
    logDebug(()=>`missing entryPoints; attempting inference`)
    config.entryPoints = guessEntryPoints(config)
    if (config.entryPoints.length == 0) {
      let msg = getTSConfigForConfig(config) ? " (could not guess from tsconfig.json)" : ""
      throw new Error(`config.entryPoints is empty or not set${msg}`)
    }
  }
  // here, config.entryPoints is always of type: string[]

  // normalize sourcemap value to boolean|"inline"|"external"
  if (config.sourcemap) {
    if (config.sourcemap != "inline" && config.sourcemap != "external") {
      config.sourcemap = true
    }
  } else {
    config.sourcemap = false
  }
  logDebug(()=>`final ${json(config)}`)
}


// guessEntryPoints(config :BuildConfig) :string[]
function guessEntryPoints(config) {
  // guess from tsconfig.json file
  const tsconfig = getTSConfigForConfig(config)
  logDebug(()=>`getTSConfigForConfig => ${json(tsconfig)}`)
  if (tsconfig) {
    if (tsconfig.files) {
      return tsconfig.files
    }
    if (tsconfig.include) {
      let files = []
      for (let pat of tsconfig.include) {
        logDebug(`glob.glob(${pat}) =>`, glob.glob(pat))
        files = files.concat(glob.glob(pat))
      }
      if (tsconfig.exclude) {
        for (let pat of tsconfig.exclude) {
          files = files.filter(fn => !glob.match(pat, fn))
        }
      }
      // return the first file remaining (if any)
      return files.slice(0, 1)
    }
  }
  return []
}


function esbuildOptionsFromConfig(config) {
  let esbuildOptions = {}
  for (let k of Object.keys(config)) {
    if (!buildConfigKeys.has(k)) {
      esbuildOptions[k] = config[k]
    }
  }
  return esbuildOptions
}


function usage(errmsg, extra) {
  errmsg && console.error(`${prog}: ${errmsg}`)
  let msg = USAGE.trim()
  if (extra) {
    if (extra.helpUsage) {
      msg = extra.helpUsage + msg.substr(msg.indexOf("\n"))
    }
    if (extra.helpExtraText) {
      msg += extra.helpExtraText
    }
  }
  msg = msg.replace(/\$0\b/g, prog)
  console.error(msg.trim())
  process.exit(errmsg ? 1 : 0)
}


// parseopt<T>(opts1:T, args1:string[]) -> {opts:T,args:string[]}
function parseopt(options, args, extra) {
  if (extra) {
    options = { ...options, ...extra.extraOptions }
  }

  const opts = { ...options }  // start with defaults
  const seenCollections = new Set()
  let restArgs = []
  let i = 1

  function eatarg(k, kv, verbatim) {
    let v = options[k]
    const t = typeof v
    if (typeof v == "boolean") {
      opts[k] = !v  // invert/negate the default value
    } else {
      const value = kv ? kv : args[++i]
      if (value === undefined) {
        usage(`missing value for option ${verbatim}`, extra)
      }
      if (Array.isArray(v)) {
        ;(opts[k] || (opts[k] = [])).push(value)
      } else {
        opts[k] = value
      }
    }
  }

  for (; i < args.length; i++) {
    let s = args[i]
    if (s == "--") {
      restArgs = restArgs.concat(args.slice(i + 1))  // +1 to exclude "--"
      break
    }
    if (s.startsWith("-") && s != "-") {
      const [k,kv] = s.replace(/^\-+/,"").split("=")
      if (k == "h" || k == "help") {
        usage(null, extra)
      }
      if (!(k in options)) {
        // support compact short options, e.g. -gw == -g -w
        if (s[1] != "-" && !kv) { // starts with "-" (not "--") and does not have value
          let l = k.split("")
          if (l.every(k => typeof options[k] == "boolean")) {
            l.map(k => eatarg(k, "", s))
            continue
          }
        }
        usage(`unknown option ${s}`, extra)
      }
      eatarg(k, kv, s)
    } else {
      restArgs.push(s)
    }
  }

  // just print version and exit?
  if (opts["estrella-version"]) {
    console.log(`estrella ${VERSION}${DEBUG ? " (debug)" : ""}`)
    process.exit(0)
  }

  // update logDebug function
  logDebug = opts["estrella-debug"] ? _logDebug : ()=>{}

  return { opts, args: restArgs }
}


const IS_MAIN_CALL = Symbol("IS_MAIN_CALL")



async function build(argv, config /* BuildConfig */) {
  let isMainCall = false
  if (config === IS_MAIN_CALL) {
    config = {}
    isMainCall = true
  }

  const { opts, args } = parseopt(cliOptions, argv, isMainCall ? maincli : null)

  // process config when build is called as a function
  if (!isMainCall) {
    if (config) { config = {...config} } // copy, so we can mess with it
    processConfig(config)
  }

  // special logic for when running this script directly as a program
  if (isMainCall) {
    if (args.length == 0) {
      // no <srcfile>'s provided -- try to read tsconfig file in current directory
      args.splice(args.length-1, 0, ...guessEntryPoints(config))
      const tsconfig = getTSConfigForConfig(config)
      if (!opts.outfile && !opts.outdir && tsconfig) {
        opts.outfile = tsconfig.outFile
        if (!opts.outfile) { opts.outdir = tsconfig.outDir }
      }
      if (args.length == 0) {
        usage(`missing <srcfile> argument`, maincli)
      }
    }
    config.entryPoints = args
    config.outfile = opts.o || opts.outfile || undefined
    config.outdir = opts.outdir || undefined
    config.bundle = opts.bundle || undefined
    config.minify = opts.minify || undefined
    config.cwd = process.cwd()
  }

  const watch = config.watch = opts.watch = !!(opts.w || opts.watch || config.watch)
  const debug = config.debug = opts.debug = !!(opts.debug || opts.g || config.debug)
  const quiet = config.quiet = opts.quiet = !!(opts.quiet || config.quiet)

  if (config.color !== undefined) {
    if (config.color) {
      opts.color = true
    } else {
      opts["no-color"] = true
    }
  }

  const colorHint = opts.color || (opts["no-color"] ? false : undefined)
  style = termStyle(process.stdout, colorHint)
  stderrStyle = termStyle(process.stderr, colorHint)

  const logError = (...args) => console.error(stderrStyle.red(`${prog}:`), ...args)
  const logWarn  = console.log.bind(console)
  const logInfo  = quiet ? ()=>{} : console.log.bind(console)
  const logInfoOnce = quiet ? ()=>{} : memoize(logInfo)

  const onlyDiagnostics = !!opts.diag

  let tscMode = opts["no-diag"] ? "off" : onlyDiagnostics ? "on" : "auto" // "on" | "off" | "auto"
  if (config.tsc !== undefined && config.tsc !== "auto") {
    tscMode = (config.tsc && config.tsc != "off") ? "on" : "off"
  }

  if (onlyDiagnostics && tscMode == "off") {
    logError(
      `invalid configuration: diagnostics are disabled but only disagnostics was requested.`
    )
    setErrorExitCode(1)
    return false
  }

  const sourcemap = (
    opts["inline-sourcemap"] ? "inline" :
    opts.sourcemap ? true :
    config.sourcemap
  )
  if (!process.stdout.isTTY) {
    opts["no-clear"] = true
  }

  const workingDirectory = (
    config.cwd ? Path.resolve(config.cwd) :
    process.mainModule && dirname(process.mainModule.filename) || __dirname
  )
  if (workingDirectory != process.cwd()) {
    let wd = Path.relative(process.cwd(), workingDirectory)
    if (wd.startsWith(".." + Path.sep)) {
      wd = workingDirectory
    }
    logInfoOnce(`Changing working directory to ${wd}`)
  }
  config.cwd = workingDirectory

  if (!config.title) {
    config.title = config.name || tildePath(config.cwd)
  }


  let lastClearTime = 0
  function clear() {
    screen.clear()
    lastClearTime = clock()
  }


  let onStart = config.onStart || (()=>{})


  let onEnd = (
    config.onEnd ? (props, defaultReturn) => {
      const r = config.onEnd(config, props)
      const thenfn = r => r === undefined ? defaultReturn : r
      return r instanceof Promise ? r.then(thenfn) : thenfn()
    } : (_, defaultReturn) => defaultReturn
  )

  if (config.outfileMode) {
    let onEndInner = onEnd
    onEnd = (props, defaultReturn) => {
      try {
        chmod(config.outfile, config.outfileMode)
      } catch (err) {
        logError("configuration error: outfileMode: " + err.message)
        setErrorExitCode(1)
      }
      return onEndInner(props, defaultReturn)
    }
  }


  function onBuildSuccess(timeStart, { stderr, warnings }) {
    logWarnings(warnings)
    const outfile = config.outfile
    if (!outfile) {
      // show esbuild message when writing multiple files (outdir is set)
      stderr = stderr.replace(/\n$/, "")
      stderr.length > 0 && logInfo(stderr)
    } else {
      const m = /\(([^\)]+)\)\n/.exec(stderr)
      const time = fmtDuration(clock() - timeStart)
      let outname = outfile
      if (sourcemap && sourcemap != "inline") {
        const ext = Path.extname(outfile)
        const name = Path.join(Path.dirname(outfile), Path.basename(outfile, ext))
        outname = `${name}.{${ext.substr(1)},${ext.substr(1)}.map}`
      }
      logInfo(style.green(`Wrote ${outname}`) + ` (${m ? m[1] : "?B"}, ${time})`)
    }
    return onEnd({ warnings, errors: [] }, true)
  }


  function onBuildFail(timeStart, { stderr, warnings, errors }) {
    logWarnings(warnings)
    console.error(stderr)
    if (errors.length == 0) {
      // this seems to be a bug in esbuild; errors are not set even when there are errors.
      errors.push({
        text: stderr.trim(),
        location: null,
      })
    }
    if (/^error: must provide/i.test(stderr)) {
      // unrecoverable error in configuration
      if (!config) { process.exit(1) }
    }
    return onEnd({ warnings, errors }, false)
  }

  // definitions
  let define = {
    DEBUG: debug,
    ...(config.define || {})
  }
  for (let k in define) {
    define[k] = json(define[k])
  }

  // options to esbuild
  const esbuildOptions = {
    // entryPoints: config.entryPoints,
    minify: !debug,
    sourcemap,
    color: stderrStyle.ncolors > 0,

    ...esbuildOptionsFromConfig(config),

    define,
  }

  // build function
  async function build() {
    if (watch && !opts["no-clear"]) {
      clear()
    }

    const r = onStart(config)
    if (r instanceof Promise) {
      await r
    }

    // wrap call to esbuild.build in a temporarily-changed working directory.
    // TODO: When/if esbuild adds an option to set cwd, use that instead.
    const tmpcwd = process.cwd()
    process.chdir(workingDirectory)
    const esbuildPromise = esbuild.build(esbuildOptions)
    process.chdir(tmpcwd)

    return esbuildPromise.then(
      onBuildSuccess.bind(null, clock()),
      onBuildFail.bind(null, clock()),
    )
  }

  // start initial build
  const buildPromise = opts.diag ? Promise.resolve() : build()

  // TypeScript linter
  let tslintProcess = null
  let tslintProcessMemoized = false
  if (tscMode != "off") {
    // Note: Wrapping this in memoize() makes it so that multiple identical tslint invocations
    // are performed just once and share one promise.
    const clearScreen = watch && opts.diag && !opts["no-clear"]
    tslintProcess = memoize(tslint)({
      watch,
      quiet,
      clearScreen,
      colors: style.ncolors > 0,
      cwd: workingDirectory,
      mode: tscMode,
      srcdir: dirname(config.entryPoints[0]),
      rules: config.tsrules, // ok if undef
      tsconfigFile: getTSConfigFileForConfig(config),
      onRestart() {
        // called when tsc begin to deliver a new session of diagnostic messages.
        if (!opts["no-clear"] && clock() - lastClearTime > 5000) {
          // it has been a long time since we cleared the screen.
          // tsc likely reloaded the tsconfig.
          screen.clear()
        }
      }
    })
    tslintProcessMemoized = isMemoized in tslintProcess
    if (opts.diag) {
      if (clearScreen) {
        screen.clear()
      }
      return tslintProcess
    }
    if (!tslintProcessMemoized) {
      // must add error handler now before `await buildPromise``
      tslintProcess.catch(e => {
        logError(e.stack || String(e))
        return false
      })
    }
  }

  // build
  let ok = await buildPromise
  if (!watch) {
    if (tslintProcess) {
      let tscWaitTimer
      if (!ok) {
        tslintProcess.cancel()
      } else {
        if (!tslintProcessMemoized) {
          tscWaitTimer = setTimeout(() =>
            logInfo("Waiting for TypeScript... (^C to skip)"), 1000)
        }
        ok = await tslintProcess.catch(() => false) // error handled earlier
      }
      clearTimeout(tscWaitTimer)
    }
    if (config) {
      if (!ok) { setErrorExitCode() }
      return ok
    } else {
      process.exit(ok ? 0 : 1)
    }
  }

  // watch & rebuild
  // TODO: centralize this so that multiple calls to build don't spin up multiple watchers
  // on the same source code. That way we can also clear() properly, just once.
  logInfo(`Watching files for changes...`)
  const srcdirs = Array.from(new Set(
    config.entryPoints.map(fn => dirname(Path.resolve(Path.join(workingDirectory, fn))))
  ))
  logDebug(()=> [`watching dirs:`, srcdirs])
  watchdir(srcdirs, /\.[tj]s$/, { recursive: true }, files => {
    logInfo(files.length + " files changed:", files.join(", "))
    build()
  })

}


function logWarnings(v) {
  v.length > 0 && console.log("[warn] " + v.map(m => m.text).join("\n"))
}


function main() {
  return build(process.argv.slice(1), IS_MAIN_CALL).catch(e => {
    console.error(stderrStyle.red(prog + ": " + (e.stack || e)))
    process.exit(1)
  }).then(() => {
    process.exit(0)
  })
}


if (
  module.id == "." ||
  process.mainModule && basename(process.mainModule.filename||"")
  == (DEBUG ? "estrella.g.js" : "estrella.js")
) {
  // Note: esbuild replaces the module object, so when running from a esbuild bundle,
  // module.id is undefined.
  main()
  return
}


// special object exported in the API. Holds a copy of the last parseopt result,
const { opts:cliopts, args:cliargs } = parseopt(cliOptions, process.argv.slice(1))
// alias spread
cliopts.watch = !!(cliopts.watch || cliopts.w)
cliopts.debug = !!(cliopts.debug || cliopts.g)


// API
module.exports = {
  // data
  prog,    // CLI program name
  cliopts, // parsed command-line options
  cliargs, // command-line arguments left after parsing options

  // functions
  dirname,   // from NodeJS's "path" module
  basename,  // from NodeJS's "path" module
  watchdir,
  scandir,
  tslint,
  defaultTSRules,
  termStyle,
  chmod,
  editFileMode,
  fmtDuration,
  tildePath,
  findInPATH,
  tsconfig: getTSConfigForConfig,
  tsconfigFile: getTSConfigFileForConfig,
  glob: glob.glob,
  globmatch: glob.match,

  // main build function
  // build(config :BuildConfig) :Promise<boolean>
  build(config) {
    return build(process.argv.slice(1), config).catch(e => {
      console.error(stderrStyle.red(prog + ": " + (e.stack || e)))
      process.exit(1)
    })
  },
}
