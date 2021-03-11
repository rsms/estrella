#!/usr/bin/env node
import * as esbuild from "esbuild"
import * as fs from "fs"
import * as os from "os"
import * as Path from "path"
import * as glob from "miniglob"

import "./global"
import { bugReportMessage, UserError } from "./error"
import {
  clock,
  findInPATH,
  fmtByteSize,
  fmtDuration,
  json,
  jsonparse,
  jsonparseFile,
  repr,
  runtimeRequire,
  tildePath,
  tmpdir,
  isCLI,
} from "./util"
import { termStyle, stdoutStyle as style, stderrStyle } from "./termstyle"
import { memoize, isMemoized } from "./memoize"
import { screen } from "./screen"
import { tslint, defaultTSRules } from "./tslint"
import * as tsutil from "./tsutil"
import { prog, parseopt } from "./cli"
import log from "./log"
import * as cli from "./cli"
import * as run from "./run"
import * as tsapi from "./tsapi"
import { file, scandir, fileModificationLogAppend } from "./file"
import { chmod } from "./chmod"
import * as typeinfo from "./typeinfo"
import { createBuildConfig } from "./config"
import { sha1 } from "./hash"
import * as extra from "./extra"

const { dirname, basename } = Path

const CLI_DOC = {
  usage: "usage: $0 [options]",
  flags: [
    ["-w, watch"         ,"Watch source files for changes and rebuild."],
    ["-g, debug"         ,"Do not optimize and define DEBUG=true."],
    ["-r, run"           ,"Run the output file after a successful build."],
    ["-sourcemap"        ,"Generate sourcemap."],
    ["-inline-sourcemap" ,"Generate inline sourcemap."],
    ["-no-color"         ,"Disable use of colors."],
    ["-no-clear"         ,"Disable clearing of the screen, regardless of TTY status."],
    ["-no-diag"          ,"Disable TypeScript diagnostics."],
    ["-color"            ,"Color terminal output, regardless of TTY status."],
    ["-diag"             ,"Only run TypeScript diagnostics (no esbuild.)"],
    ["-quiet"            ,"Only log warnings and errors but nothing else."],
    ["-silent"           ,"Don't log anything, not even errors."],
    ["-estrella-version" ,"Print version of estrella and exit 0."],
    ["-estrella-debug"   ,"Enable debug logging of estrella itself."],
  ],
}

const CLI_DOC_STANDALONE = {
  usage: "usage: $0 [options] <srcfile> ...",
  flags: CLI_DOC.flags.concat([
    ["-o, outfile" ,"Write output to <file> instead of stdout.", "<file>"],
    ["-bundle"     ,"Include all dependencies."],
    ["-minify"     ,"Simplify and compress generated code."],
    ["-outdir"     ,"Write output to <dir> instead of stdout.", "<dir>"],
    ["-esbuild"    ,"Pass arbitrary JSON to esbuild's build function.", "<json>"],
  ]),
  trailer: `
Example of using estrella without a build script:
  $0 -o out/app.js main.ts
    This compile main.ts and writes the output to out/app.js

Example of using estrella with a build script:
  1. Create a file called build.js with the following contents:
       #!/usr/bin/env node
       const { build } = require("estrella")
       build({
         entry: "main.ts",
         outfile: "out/main.js",
       })
  2. Make that file executable and run it:
       chmod +x build.js
       ./build.js
  You can now customize your build behavior by changing build.js.
  Try ./build.js -help

See https://github.com/rsms/estrella#readme for documentation.
  `
}

// cli_ready resolved when CLI arguments have been fully processed.
//
// Parsing of CLI arguments happens in two phases when estrella runs from a user script.
//   1. estrella built-in arguments are parsed, a cliopts.parse function is added.
//   2. the user script executes, possibly calling cliopts.parse to parse custom arguments.
//   3. a runloop frame later, cli_ready resolves.
// This enables user scripts to extend the CLI options.
//
// Note that when estrella is run directly, CLI arguments are parsed in a single phase
// and this does not apply. In that case cli_ready is resolved immediately.
//
let cli_ready = Promise.resolve()

// cliopts and cliargs are special objects exported in the API.
// They are populated by this script's body when estrella runs from a user script,
// otherwise these are populated by main()
let cliopts = {}, cliargs = []

const IS_MAIN_CALL = Symbol("IS_MAIN_CALL")

function EMPTYFUN(){}

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
    process.exitCode = overrideCode
    process.on("exit", code => { process.exit(code || overrideCode) })
  }
}


function processAPIConfig(config) {
  // support use of both entry and entryPoints
  log.debug(()=>`input config ${repr(config)}`)
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
    log.debug(()=> `missing entryPoints; attempting inference`)
    config.entryPoints = guessEntryPoints(config)
    if (config.entryPoints.length == 0) {
      let msg = tsutil.getTSConfigForConfig(config) ? " (could not guess from tsconfig.json)" : ""
      throw new UserError(`config.entryPoints is empty or not set${msg}`)
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

  // if outfile is empty or missing, use a temporary file (esbuild needs a file to write to.)
  // Note: outfile="-" is handled by build1, prior to calling processAPIConfig.
  if (!config.outfile && !config.outdir) {
    config.setOutfile("-") // set since it's used by updateProjectID
    const projectID = config.updateProjectID()
    config.setOutfile(Path.join(tmpdir(), `esbuild.${projectID}.out.js`))
    config.outfileIsTemporary = true
    // Note: We let config.outfileCopyToStdout be false (default) since the expected behavior
    // in the case of outfile="" is for nothing to appear on stdout but only contents returned
    // through the API, to onEnd.
  }

  config.updateProjectID()
  log.debug(()=>`effective config for project#${config.projectID}: ${repr(config)}`)
}


function patchSourceMap(mapfile, overrides) {
  const timeStarted = clock()
  const map = JSON.parse(fs.readFileSync(mapfile))
  for (let k in overrides) {
    let v = overrides[k]
    if (v === undefined) {
      delete map[k]
    } else {
      if (typeof v == "function") {
        v = v(map[k])
      }
      map[k] = v
    }
  }
  fs.writeFileSync(mapfile, JSON.stringify(map))
  log.debug(() =>
    `patched source map ${mapfile} with overrides ${repr(overrides)}` +
    ` (${fmtDuration(clock() - timeStarted)})`)
}


// guessEntryPoints(config :BuildConfig) :string[]
function guessEntryPoints(config) {
  // guess from tsconfig.json file
  const tsconfig = tsutil.getTSConfigForConfig(config)
  if (tsconfig) {
    log.debug(() => `tsconfig file found at ${tsutil.getTSConfigFileForConfig(config)}`)
    if (tsconfig.files) {
      return tsconfig.files
    }
    if (tsconfig.include) {
      let files = []
      for (let pat of tsconfig.include) {
        log.debug(`guessing entry points: glob.glob(${pat}) =>`, glob.glob(pat))
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
  let unknownOptions = {}

  // esbuildOptionKeyMap maps legacy esbuild BuildOptions keys to current ones
  const esbuildOptionKeyMap = {
    "name": "globalName", // changed in v0.5 or so
  }

  for (let k of Object.keys(config)) {
    if (typeinfo.estrella.BuildConfig.has(k)) {
      // skip estrella-specific option
      continue
    }
    if (!typeinfo.esbuild.BuildOptions.has(k)) {
      unknownOptions[k] = config[k]
    }
    k = esbuildOptionKeyMap[k] || k  // possibly renamed
    esbuildOptions[k] = config[k]
  }

  if (Object.keys(unknownOptions).length > 0) {
    log.info(
      `Notice: Potentially invalid esbuild.BuildOption(s): ${repr(unknownOptions)}\n` +
      bugReportMessage("guess", json(Object.keys(unknownOptions)))
    )
  }

  if (!esbuildOptions.outfile) {
    delete esbuildOptions.outfile
  }

  return esbuildOptions
}


let _logInfoOnceRecord = new Set()

function logInfoOnce(...v) {
  if (log.level >= log.INFO) {
    const k = v.join(" ")
    if (!_logInfoOnceRecord.has(k)) {
      _logInfoOnceRecord.add(k)
      log.info(...v)
    }
  }
}


// build wraps the "real" build function build1.
// build does the following:
// - makes a mutable copy of config
// - wraps build1 in a CancellablePromise
//
function build(config /* estrella.BuildConfig */) {
  config = createBuildConfig(
    config || {},
    ( // default cwd
      config[IS_MAIN_CALL] ? process.cwd() :
      process.mainModule && dirname(process.mainModule.filename) || __dirname
    ),
  )

  const resolver = { resolve(){}, reject(){} }
  const cancelCallbacks = []

  // (f :()=>void) :void
  function addCancelCallback(f) {
    if (config.isCancelled) {
      f()
    } else {
      cancelCallbacks.push(f)
    }
  }

  function cancel(reason) {
    if (!config.isCancelled) {
      log.debug(`build cancelled`, {reason})
      config.isCancelled = true
      for (let f of cancelCallbacks) {
        f && f()
      }
      cancelCallbacks.length = 0
      if (reason) {
        resolver.reject(reason)
      } else {
        resolver.resolve(true)
      }
    }
  }

  let ctx = {
    addCancelCallback,
    buildCounter: 0,
    rebuild() {
      log.warn("rebuild() called before initial build completed. Ignoring")
      return Promise.resolve(true)
    },
  }

  const p = cli_ready.then(() => new Promise((resolve, reject) => {
    if (config.isCancelled) {
      log.debug(`build cancelled immediately`)
      return false
    }
    resolver.resolve = resolve
    resolver.reject = reject
    build1(config, ctx).then(resolve).catch(reject)
  }))

  p.rebuild = () => ctx.rebuild()
  Object.defineProperty(p, "buildCounter", { get() { return ctx.buildCounter } })
  p.cancel = cancel

  return p
} // build()


// build1 is the "real" build function -- build() wraps it with cancellation.
async function build1(config, ctx) {
  const isMainCall = IS_MAIN_CALL in config
  delete config[IS_MAIN_CALL]

  let opts = cliopts, args = cliargs

  if (config.run === undefined) {
    config.run = opts.run
  }

  // if outfile is "-", use a temporary file (esbuild needs a file to write to)
  if (
    config.outfile == "-" ||
    opts.outfile == "-" ||
    (isMainCall && !opts.outfile && !opts.outdir)
  ) {
    config.setOutfile("-") // set since it's used by updateProjectID
    const projectID = config.updateProjectID()
    opts.outfile = Path.join(tmpdir(), `esbuild.${projectID}.out.js`)
    config.setOutfile(opts.outfile)
    config.outfileIsTemporary = true
    config.outfileCopyToStdout = true
  }

  if (!isMainCall) {
    // process config when build is called as a function
    processAPIConfig(config)
  } else {
    // BEGIN special logic for when running this script directly as a program

    if (args.length == 0) {
      // no <srcfile>'s provided -- try to read tsconfig file in current directory
      const guess = guessEntryPoints(config)
      log.debug(() => `no input files provided; best guess: ${repr(guess)}`)
      if (guess.length == 0) {
        log.error(`missing <srcfile> argument (see ${prog} -help)`)
        process.exit(1)
      }

      args.splice(args.length-1, 0, ...guess)

      // infer outfile or outdir
      const tsconfig = tsutil.getTSConfigForConfig(config)
      if (!opts.outfile && !opts.outdir && tsconfig) {
        opts.outfile = tsconfig.outFile
        if (!opts.outfile) {
          opts.outdir = tsconfig.outDir
        }
      }

      if (args.length == 0) {
        log.error(`missing <srcfile> argument (see ${prog} -help)`)
        process.exit(1)
      }
    }

    config.setOutfile(opts.outfile || undefined)
    config.entryPoints = args
    config.outdir = opts.outdir || undefined
    config.bundle = opts.bundle || undefined
    config.minify = opts.minify || undefined

    if (opts.esbuild) {
      const esbuildProps = jsonparse(opts.esbuild, "-esbuild")
      if (!esbuildProps || typeof esbuildProps != "object") {
        log.error(
          `-esbuild needs a JS object, for example '{key:"value"}'. Got ${typeof esbuildProps}.`
        )
        return false
      }
      log.debug(()=>`applying custom esbuild config ${repr(esbuildProps)}`)
      for (let k in esbuildProps) {
        config[k] = esbuildProps[k]
      }
    }
    // END special logic for when running this script directly as a program
  } // isMainCall

  // smash config options and CLI options together
  const debug = config.debug = opts.debug = !!(opts.debug || config.debug)
  const silent = config.silent = opts.silent = !!(opts.silent || config.silent)
  const quiet = config.quiet = opts.quiet = silent || !!(opts.quiet || config.quiet)
  opts.watch = !!(opts.watch || config.watch)
  if (!config.watch || typeof config.watch != "object") {
    config.watch = opts.watch
  }

  if (config.color !== undefined) {
    // update ANSI color setting
    log.colorMode = config.color
    style.reconfigure(process.stdout, config.color)
    stderrStyle.reconfigure(process.stderr, config.color)
  }

  if (quiet) {
    log.level = silent ? log.SILENT : log.WARN
  }

  config.sourcemap = (
    opts["inline-sourcemap"] ? "inline" :
    opts.sourcemap ? true :
    config.sourcemap
  )
  if (config.outfileIsTemporary && config.outfileCopyToStdout && config.sourcemap === true) {
    // when writing to stdout, "sourcemap:true" means "inline" rather than "yes, write a map file".
    config.sourcemap = "inline"
  }

  config.clear = (
    opts["no-clear"] ? false :
    config.clear === undefined ? !!process.stdout.isTTY :
    config.clear
  )

  log.debug(()=>`project directory ${repr(config.cwd)} (config.cwd)`)

  if (!config.title) {
    config.title = config.name || tildePath(config.cwd)
  }

  // set tslintOptions to the effective tslint option based
  // - CLI arguments -diag and -no-diag
  // - config property "tslint" and the older depreacted "tsc" property
  // tslintOptions : boolean | "auto" | "on" | "off" | TSLintBasicOptions
  // Note that opts.diag has already been adjusted for -no-diag so no need to look for that here.
  let tslintOptions = (
    opts.diag === true ? "on" :
    opts.diag === false ? "off" :
    "auto"
  )
  if (tslintOptions !== "off") {
    if (config.tsc !== undefined) {
      log.info("the 'tsc' property is deprecated. Please rename to 'tslint'.")
      if (config.tslint === undefined) {
        config.tslint = config.tsc
      }
    }
    if (config.tslint && config.tslint !== "auto") {
      tslintOptions = config.tslint
    }

    const tslintIsAuto = (
      tslintOptions === "auto" ||
      (typeof tslintOptions == "object" && (config.tslint.mode === "auto" || !config.tslint.mode))
    )

    if (tslintIsAuto) {
      // "auto" mode: only run tslint if a tsconfig file is found.
      // This matches the behavior of calling the tslint() function directly.
      if (!tsutil.getTSConfigFileForConfig(config)) {
        log.debug(() => {
          const dir = tsutil.tsConfigFileSearchDirForConfig(config)
          const searchfiles = Array.from(tsutil.searchTSConfigFile(dir, config.cwd))
          return (
            `skipping tslint in auto mode since no tsconfig.json file was found in project.\n` +
            `Tried the following filenames:${searchfiles.map(f => `\n  ${tildePath(f)}`)}`
          )
        })
        tslintOptions = "off"
      }
    } else if (config.tslint !== undefined && config.tslint !== "auto") {
      tslintOptions = config.tslint
    }
  }


  // Configure "run"
  if (config.run) {
    run.configure(config)
  }


  let lastClearTime = 0
  function clear() {
    screen.clear()
    lastClearTime = clock()
  }


  let isInsideCallToUserOnEnd = false
  const userOnEnd = config.onEnd

  // onEnd is called by onBuildSuccess OR onBuildFail
  let onEnd = (
    userOnEnd ? async (buildResults, defaultReturn) => {
      isInsideCallToUserOnEnd = true
      let returnValue = undefined
      try {
        const r = userOnEnd(config, buildResults, ctx)
        returnValue = r instanceof Promise ? await r : r
      } catch (err) {
        log.debug(()=>`error in onEnd handler: ${err.stack||err}`)
        throw err
      } finally {
        isInsideCallToUserOnEnd = false
      }
      const ok = returnValue === undefined ? defaultReturn : !!returnValue
      return ok

    } : (_buildResults, ok) => {
      return ok
    }
  )

  function wrapOnEnd(f) {
    let onEndInner = onEnd
    onEnd = async (buildResults, ok) => {
      const ok2 = await f(buildResults, ok)
      if (ok2 !== undefined) {
        ok = ok2
      }
      return onEndInner(buildResults, ok)
    }
  }

  // Note: wrapOnEnd stacks functions, meaning that a function defined earlier in this source
  // file will be called later in time.

  // chmod handler
  if (config.outfileMode && config.outfile) {
    wrapOnEnd(async (buildResults, ok) => {
      log.debug("onEnd chmod")
      if (buildResults.errors.length == 0) {
        try {
          chmod(config.outfileAbs, config.outfileMode)
        } catch (err) {
          log.error("configuration error: outfileMode: " + err.message)
          setErrorExitCode(1)
        }
      }
    })
  }

  // tmp outfile handler
  if (config.outfileCopyToStdout && !config.run && config.write !== false) {
    wrapOnEnd(async (buildResults, ok) => {
      log.debug("onEnd copyToStdout")
      if (buildResults.errors.length == 0) {
        return new Promise((resolve, reject) => {
          const r = fs.createReadStream(config.outfileAbs)
          r.on("end", () => resolve(ok))
          r.on("error", reject)
          r.pipe(process.stdout)
        })
      }
    })
  }

  // add contents of output to onEnd when writing to a temporary file (not stdout)
  if (config.outfileIsTemporary && !config.outfileCopyToStdout && config.write !== false) {
    wrapOnEnd(async (buildResults, ok) => {
      log.debug("onEnd load results")
      buildResults.js = fs.readFileSync(config.outfile, {encoding:"utf8"})
      if (config.sourcemap === true) {
        try {
          buildResults.map = fs.readFileSync(config.outfile + ".map", {encoding:"utf8"})
        } catch (err) {
          log.debug(
            `failed to load temporary source map at ${config.outfile}.map: ${err.stack||err}`)
        }
        // strip "sourceMappingURL ..." from js
        const i = buildResults.js.lastIndexOf("\n//# sourceMappingURL")
        if (i != -1) {
          buildResults.js = buildResults.js.substr(0, i+1) // +1 = keep LF
        }
      }
    })
  }

  // print "Watching files for changes..." the first time a watcher starts
  if (config.watch) {
    wrapOnEnd(async (buildResults, ok) => {
      // Note: Tests rely on this message, so if you change it, update those tests too.
      logInfoOnce("Watching files for changes...")
    })
  }

  // definitions
  let define = {
    DEBUG: debug ? "true" : "false",
    ...(config.define || {})
  }

  // options to esbuild
  const esbuildOptions = {
    // default values
    minify: !debug,
    sourcemap: config.sourcemap,
    sourcesContent: false, // to match past versions of estrella
    color: stderrStyle.ncolors > 0,
    logLevel: config.silent ? "silent" : config.quiet ? "error" : "warning",

    // user values
    ...esbuildOptionsFromConfig(config),

    define,
  }

  // esbuild can produce a metadata file describing imports
  // We use this to know what source files to observe in watch mode.
  if (config.watch) {
    const projectID = config.projectID
    esbuildOptions.metafile = true
    if ((!esbuildOptions.outfile && !esbuildOptions.outdir) || esbuildOptions.write === false) {
      // esbuild needs an outfile for the metafile option to work
      esbuildOptions.outfile = Path.join(tmpdir(), `esbuild.${projectID}.out.js`)
      config.outfileIsTemporary = true
      // if write==false, unset it so that esbuild actually writes metafile
      delete esbuildOptions.write
    }
  }

  // rebuild function
  ctx.rebuild = () => { // Promise<boolean>
    return _esbuild([]).then(ok => {
      if (isInsideCallToUserOnEnd) {
        log.warn(`waiting for rebuild() inside onEnd handler may cause a deadlock`)
      }
      return ok
    })
  }

  let lastBuildResults = {
    warnings: [],
    errors: [],
    //maybe: metafile: { inputs:{}, outputs:{} },
  }

  function onBuildSuccess(timeStart, result/*esbuild.BuildResult*/) {
    log.debug("esbuild finished with result", result)
    logWarnings(result.warnings || [])
    const time = fmtDuration(clock() - timeStart)
    if (!config.outfile) {
      log.info(style.green(
        config.outdir ? `Wrote to dir ${config.outdir} (${time})` :
                        `Finished (write=false, ${time})`
      ))
    } else {
      let outname = config.outfile
      if (config.sourcemap &&
          config.outfileIsTemporary &&
          config.sourcemap != "inline" &&
          config.write !== false )
      {
        // repair "sources" filenames in sourcemap
        patchSourceMap(config.outfileAbs + ".map", {
          sources: v => v && v.map(fn => Path.relative(config.cwd, fn)),
        })
      }
      let size = 0
      try { size = fs.statSync(config.outfileAbs).size } catch(_) {}
      if (!config.outfileIsTemporary) {
        log.info(style.green(`Wrote ${outname}`) + ` (${fmtByteSize(size)}, ${time})`)
      }
    }
    lastBuildResults.warnings = result.warnings
    lastBuildResults.errors = []
    if (result.metafile)
      lastBuildResults.metafile = result.metafile
    return onEnd(lastBuildResults, true)
  }

  function onBuildFail(timeStart, err) {
    log.debug("esbuild finished with error:", err ? err.stack || err : null)
    let warnings = err.warnings || []
    let errors = err.errors || []
    if (errors.length == 0) {
      // in this case the err is an Error object and describes the error
      log.error(err.message)
      errors.push({
        text: String(err),
        location: null,
      })
    }
    // if (/^error: must provide/i.test(stderr)) {
    //   // unrecoverable error in configuration
    //   if (!config) { process.exit(1) }
    // }
    logWarnings(warnings)
    lastBuildResults.warnings = warnings
    lastBuildResults.errors = errors
    return onEnd(lastBuildResults, false)
  }

  // build function
  async function _esbuild(changedFiles /*:string[]*/) {
    if (config.watch && config.clear) {
      clear()
    }

    if (config.onStart) {
      try {
        const r = config.onStart(config, changedFiles, ctx)
        if (r instanceof Promise) {
          await r
        }
      } catch (err) {
        log.debug(()=>`error in onStart handler: ${err.stack||err}`)
        // onBuildFail(clock(), `error in onStart handler: ${err.stack||err}`)
        throw err
      }
    }

    if (config.isCancelled) {
      return
    }

    log.debug(()=>
      `invoking esbuild.build() in ${process.cwd()} with options: ` +
      `${repr(esbuildOptions)}`
    )

    // wrap call to esbuild.build in a temporarily-changed working directory.
    // TODO: When/if esbuild adds an option to set cwd, use that instead.
    const tmpcwd = process.cwd()
    process.chdir(config.cwd)
    const esbuildPromise = esbuild.build(esbuildOptions)
    process.chdir(tmpcwd)

    return esbuildPromise.then(
      onBuildSuccess.bind(null, clock()),
      onBuildFail.bind(null, clock()),
    )
  }

  // start initial build
  const buildPromise = opts.diag ? null : _esbuild([])

  // TypeScript linter
  const [tslintProcess, tslintProcessReused] = (
    tslintOptions !== "off" ? startTSLint(tslintOptions, opts, config) :
    [null,false]
  )
  if (tslintProcess && !tslintProcessReused) {
    // must add error handler now before `await buildPromise`
    tslintProcess.catch(e => {
      log.error(e.stack || String(e))
      return false
    })
    ctx.addCancelCallback(() => { tslintProcess.cancel() })
    // if -diag is set on the command line and screen clearing is enabled, clear the screen now
    // as our buildPromise is already resolved (no build will occur and thus no clear from that.)
    if (cliopts.diag && config.watch && config.clear) {
      screen.clear()
    }
  }

  // await build
  let ok = true
  if (buildPromise) {
    log.debug("awaiting esbuild")
    ok = await buildPromise
    if (config.isCancelled) {
      return false
    }
  }

  // watch mode?
  if (config.watch) {
    function getESBuildMeta() { // :Object|null
      const metafile = lastBuildResults.metafile || {}
      if (!metafile.inputs || Object.keys(metafile.inputs).length == 0) {
        // this happens on error; we set inputs to the entrypoints
        metafile.inputs = {}
        for (let fn of config.entryPoints) {
          metafile.inputs[fn] = {bytes:0, imports:[]}
        }
      }
      return metafile
    }
    await extra.watch().watchFiles(config, getESBuildMeta, ctx, changedFiles => {
      // This function is invoked whenever source files changed.
      // Note that the watchFiles() function takes care of updating source file tracking.
      const filenames = changedFiles.map(f => Path.relative(config.cwd, f))
      const n = changedFiles.length
      log.info(`${n} ${n > 1 ? "files" : "file"} changed: ${filenames.join(", ")}`)
      return _esbuild(changedFiles)
    })
    log.debug("fswatch ended")
    return true
  }

  // otherwise, when not in watch mode, wait for tslint and exit
  if (tslintProcess) {
    let tscWaitTimer = null
    if (!ok) {
      log.debug("cancelling eslint since esbuild reported an error")
      tslintProcess.cancel()
    } else {
      log.debug("awaiting eslint")
      if (!tslintProcessReused && !opts.diag) {
        tscWaitTimer = setTimeout(() => log.info("Waiting for TypeScript... (^C to skip)"), 1000)
      }
      ok = await tslintProcess.catch(() => false) // error handled earlier
    }
    clearTimeout(tscWaitTimer)
  }

  if (!config.isCancelled && !ok) {
    setErrorExitCode()
  }

  // wait for any running commands
  if (ok) {
    const exitCode = await run.waitAll()
    process.exitCode = exitCode
  }

  return ok
} // build1()


const tslintProcessCache = new Map() // configKey => TSLintProcess


function startTSLint(tslintOptions, cliopts, config) { // : [tslintProcess, tslintProcessReused]
  // assert(tslintOptions !== "off")

  let mode = tslintOptions
  let tscBasicOptions = {}
  if (tslintOptions && typeof tslintOptions == "object") {
    mode = undefined
    tscBasicOptions = tslintOptions
    if (tscBasicOptions.mode == "off") {
      log.debug(() => `tslint disabled by tslint config {mode:"off"}`)
      return [null, false]
    }
  }

  if (config.tsrules && config.tsrules.length) {
    log.info("The 'tsrules' property is deprecated. Please use 'tslint.rules' instead")
    tscBasicOptions.rules = { ...config.tsrules, ...tscBasicOptions.rules }
  }

  // have tslint clear the screen when it restarts ONLY when -diag (no build) is set.
  const clearScreen = cliopts.diag && config.watch && config.clear

  const tsconfigFile = tsutil.getTSConfigFileForConfig(config) // string|null

  // tslint processes are kept to a minimum since they may screw with screen clearing and
  // multiple log streams is confusing.
  const cacheKey = `${tsconfigFile || config.cwd}`
  const existingTSLintProcess = tslintProcessCache.get(cacheKey)
  if (existingTSLintProcess) {
    log.debug(() => `tslint sharing process (no new process created)`)
    return [existingTSLintProcess, true]
  }

  const options = {
    colors: style.ncolors > 0,
    quiet: config.quiet,
    mode,

    ...tscBasicOptions,

    watch: config.watch,
    cwd: config.cwd,
    clearScreen,
    srcdir: dirname(config.entryPoints[0]),
    tsconfigFile,
    onRestart() {
      log.debug("tsc restarting")
      // // called when tsc begin to deliver a new session of diagnostic messages.
      // if (config.clear && clock() - lastClearTime > 5000) {
      //   // it has been a long time since we cleared the screen.
      //   // tsc likely reloaded the tsconfig.
      //   screen.clear()
      // }
      //
      // if (config.clear && clock() - lastClearTime > 5e3) {
      //                                     ^
      // ReferenceError: lastClearTime is not defined
    },
  }

  log.debug(() => `starting tslint with options ${repr(options)}`)
  const tslintProcess = tslint(options)
  tslintProcessCache.set(cacheKey, tslintProcess)

  return [tslintProcess, false]
}


function logWarnings(warnings) {
  if (warnings.length > 0) {
    // TODO: include warnings[N].location
    log.warn("[warn] " + warnings.map(m => m.text).join("\n"))
  }
}


function logErrors(errors) {
  if (errors.length > 0) {
    // TODO: include errors[N].location
    log.error(errors.map(m => m.text).join("\n"))
  }
}


function main() {
  return build({[IS_MAIN_CALL]:1}).catch(e => {
    console.error(stderrStyle.red(prog + ": " + (e ? (e.stack || e) : "error")))
    const exitCode = process.exitCode || 0
    process.exit(
      exitCode > 0 ? exitCode : 1
    )
  }).then(ok => {
    const exitCode = process.exitCode || 0
    process.exit(
      ok ? exitCode :
      exitCode > 0 ? exitCode : 1
    )
  })
}


// ------------------------------------------------------------------------
// parse CLI and dispatch main

function postProcessCLIOpts() {
  if (cliopts["no-color"]) {
    cliopts.color = false
  }
  if (cliopts["no-diag"]) {
    cliopts.diag = false
  }

  // update ANSI color setting
  log.colorMode = cliopts.color
  style.reconfigure(process.stdout, cliopts.color)
  stderrStyle.reconfigure(process.stderr, cliopts.color)

  if (cliopts.color !== undefined) {
    // user explicitly asked to either turn on or off color
    // const nocolor  = process.argv.includes("-no-color") || process.argv.includes("--no-color")
    // const yescolor = process.argv.includes("-color") || process.argv.includes("--color")
  }

  // just print version and exit?
  if (cliopts["estrella-version"]) {
    console.log(`estrella ${VERSION}${DEBUG ? " (debug)" : ""}`)
    process.exit(0)
  }

  // update log.debug function
  if (cliopts["estrella-debug"]) {
    log.level = log.DEBUG
  }

  // -diag disables -run
  if (cliopts.diag && cliopts.run) {
    log.info(`Disabling -run since -diag is set`)
    cliopts.run = undefined
  }

  log.debug(()=> `Parsed initial CLI arguments: ${repr({options:cliopts, args:cliargs},2)}`)
}

if (isCLI) {
  // Note: esbuild replaces the module object, so when running from a esbuild bundle,
  // module.id is undefined.
  ;[cliopts, cliargs] = cli.parseopt(process.argv.slice(2), CLI_DOC_STANDALONE)
  postProcessCLIOpts()
  main()
} else {

  // parse CLI arguments
  // Note: cliopts and cliargs are special objects exported in the API.
  // Note: This is only invoked when estrella runs from a user script, not when run directly.
  ;[cliopts, cliargs] = cli.parseopt(process.argv.slice(2),{
    ...CLI_DOC,
    unknownFlagAsArg: true,
    help(flags, _cliopts, _cliargs) {
      cli_ready = new Promise(resolve => {
        process.nextTick(() => {
          console.log(cli.fmtUsage(flags, CLI_DOC.usage, CLI_DOC.trailer))
          process.exit(0)
          resolve()
        })
      })
    },
  })

  postProcessCLIOpts()


  // extra unparsed arguments?
  if (cliargs.length > 0) {
    cli_ready.then(() => {
      if (cliargs.length > 0) {
        // user script did not parse args
        cli.printUnknownOptionsAndExit(cliargs)
      }
    })
  }

  // parse(...flags :cli.Flags[]) : [cli.Options, string[]]
  cliopts.parse = (...flags) => {
    log.debug(() =>
      `Parsing custom CLI arguments ${json(cliargs.join)} via cliopts.parse(` +
      repr(flags) + ")"
    )

    const optsAndArgs = cli.parseopt(cliargs, {
      ...CLI_DOC,
      flags: CLI_DOC.flags.concat(flags),
    })

    log.debug(()=>
      `Parsed extra CLI arguments: ` +
      json({options: optsAndArgs[0], args: optsAndArgs[1]}, 2)
    )

    // clear cliargs so to not cause an error for missing options
    cliargs.splice(0, cliargs.length)

    return optsAndArgs
  }
} // end if main


function watch(path, options, cb) {
  return extra.watch().watch(path, options, cb)
}


function legacy_watchdir(path, filter, options, cb) {
  log.info(() => `estrella.watchdir is deprecated. Please use estrella.watch instead`)
  if (cb === undefined) {
    if (options === undefined) {
      // watchdir(path, cb)
      cb = filter
      options = {}
    } else {
      // watchdir(path, filter, cb)
      cb = options
      options = { ...options, filter }
      if (options.recursive !== undefined) {
        if (!options.recursive) {
          options.depth = 0
        }
        delete options.recursive
      }
    }
  }
  return watch(path, options, cb)
}


let _tsapiInstance = undefined


// API
module.exports = {
  // data
  version: VERSION,
  prog,    // CLI program name
  cliopts, // parsed command-line options
  cliargs, // command-line arguments left after parsing options

  // functions
  dirname,   // from NodeJS's "path" module
  basename,  // from NodeJS's "path" module
  watch,
  watchdir: legacy_watchdir,
  scandir,
  tslint,
  defaultTSRules,
  termStyle,
  stdoutStyle: style,
  stderrStyle: stderrStyle,
  chmod: file.chmod,
  editFileMode: file.editMode,
  fmtDuration,
  tildePath,
  findInPATH,
  tsconfig: tsutil.getTSConfigForConfig,
  tsconfigFile: tsutil.getTSConfigFileForConfig,
  glob: glob.glob,
  globmatch: glob.match,
  file,
  sha1,
  log,

  // TypeScript API
  get ts() {
    if (_tsapiInstance === undefined) {
      _tsapiInstance = tsapi.createTSAPI()
    }
    return _tsapiInstance
  },

  // ----------------------------------------------------------------------------
  // main build function
  // build(config :BuildConfig) :Promise<boolean>
  build,
}
