//
// estrella is a JavaScript program for esbuild, which watches source files
// and provides TypeScript diagnostics.
//
// It is intended to be used from a user script, for example "./build.js":
//
//   #!/usr/bin/env node
//   const { build } = require("estrella")
//   build({
//     entry:   "src/main.ts",
//     outfile: "dist/foo.js",
//     bundle:  true,
//     define:  { VERSION: require("package.json").version },
//   })
//

import * as esbuild from "esbuild"
import * as chokidar from "chokidar"


// build represents an invocation of esbuild; one package/module.
// Returns true if build succeeded, false if not.
export function build(config :BuildConfig) :CancellablePromise<boolean>
export interface BuildConfig extends esbuild.BuildOptions {
  // entry is the same as "entryPoints" esbuild and an alternative spelling.
  entry?: string | string[]

  // When debug is set, no minification is performed and DEBUG=true is defined.
  debug? :boolean

  // Watch source files for changes and recompile.
  // If an object is provided, it's passed on to watch() internally.
  watch? :boolean | WatchOptions

  // Use this working directory instead of the directory of the main script.
  cwd? :string

  // Only log warnings and errors but nothing else.
  quiet? :boolean

  // When not set, the terminal screen is cleared before a rebuild in watch mode when
  // stdout is a TTY.
  // If clear=true, then the screen is cleared even if stdout is not a TTY.
  // If clear=true, then the screen is never cleared.
  clear? :boolean

  // tsc controls if TypeScript diagnostics are run.
  // tsc==undefined || tsc=="auto"
  //   Automatically enable tsc diagnostics.
  //   If tsc is found in node_modules and a tsconfig.json file is found.
  // tsc==true || tsc=="on"
  //   Run tsc either from node_modules or if not found there, in a shell from PATH.
  // tsc==false || tsc=="off"
  //   Do not run tsc
  //
  tsc? :boolean|"auto"|"on"|"off"

  // tsrules defining changing the severity, or meaning, of TS codes.
  // See TSLintOptions.rules for more information.
  tsrules? :TSRules

  // onStart and onEnd are called when esbuild starts and ends, respectively.
  // Useful when scripting and watching files for changes.
  // onStart's changedFiles argument is empty on the first invocation and contains
  // names of files that were changed during watch for subsequent callbacks.
  // If a callback returns a promise, the build process will await that promise
  // before continuing.
  onStart? :(c :Readonly<BuildConfig>, changedFiles :string[])=>Promise<void>|any
  onEnd?   :(c :Readonly<BuildConfig>, result :BuildResult)=>Promise<void>|any

  // title is purely "ornamental" and can be used for log messages etc.
  // estrella does not use this, but you may want to use it in build scripts.
  // It defaults to: config.name || tildePath(workingDirectory). E.g. "~/src/project"
  title? :string

  // outfileMode sets the file system mode (using chmod) on outfile.
  // See the chmod() and editFileMode() functions for details.
  outfileMode? :number|string|string[]
}
export interface BuildResult {
  warnings :esbuild.Message[]
  errors   :esbuild.Message[]
}


// chmod edits mode of a file (synchronous)
// If m is a number, the mode is simply set to m.
// If m is a string or list of strings, the mode is updated using editFileMode.
// Returns the new mode set on file.
export function chmod(file :string, m :number|string|string[]) :number

// editFileMode takes a file mode (e.g. 0o764), applies modifiers and returns the resulting mode.
// It accepts the same format as the Posix chmod program.
// If multiple modifiers are provided, they are applied to mode in order.
//
// Grammar of modifier format:
//
//   mode   := clause [, clause ...]
//   clause := [who ...] [action ...] action
//   action := op [perm ...]
//   who    := a | u | g | o
//   op     := + | - | =
//   perm   := r | w | x
//
// Examples:
//
//   // Set execute bit for user and group
//   newMode = editFileMode(0o444, "ug+x") // => 0o554
//
//   // Set execute bit for user, write bit for group and remove all access for others
//   newMode = editFileMode(0o444, "+x,g+w,o-") // => 0o560
//
export function editFileMode(mode :number, modifier :string|string[]) :number


// watch watches files and directories for changes.
// It is backed by chokidar and accepts chokidar options.
export function watch(
  path :string|ReadonlyArray<string>,
  cb   :WatchCallback,
) :CancellablePromise<void>
export function watch(
  path    :string|ReadonlyArray<string>,
  options :WatchOptions|null|undefined,
  cb      :WatchCallback,
) :CancellablePromise<void>
export interface WatchOptions extends chokidar.WatchOptions {
  // latency is number of milliseconds to wait before considering a set of files as
  // "one set of changes" and invoking the callback.
  latency? :number  // default: 100

  // filter which files are considered for changes
  filter? :RegExp|null, // default: /\.[tj]s$/
}
export type WatchCallback = (files :string[])=>void  // unique list of changed files


// watchdir watches one or more file directories for changes
// DEPRECATED: use watch() instead
export function watchdir(
  dir :string|ReadonlyArray<string>,
  cb :WatchCallback,
) :CancellablePromise<void>
export function watchdir(
  dir    :string|ReadonlyArray<string>,
  filter :RegExp|null,
  cb     :WatchCallback,
) :CancellablePromise<void>
export function watchdir(
  dir     :string|ReadonlyArray<string>,
  filter  :RegExp|null,
  options :WatchdirOptions|null,
  cb      :WatchCallback,
) :CancellablePromise<void>
export interface WatchdirOptions {
  latency?   :number  // default: 100    Milliseconds to wait before considering a change set.
  recursive? :boolean // default: false  Watch subdirectories.
}


// scandir finds all files in dir matching filter (or all files, if there's no filter.)
export function scandir(
  dir      :string|string[],
  filter?  :RegExp|null,
  options? :ScanOptions|null,
) :Promise<string[]>
export interface ScanOptions {
  recursive :boolean // default: false  Watch subdirectories.
}


// tslint runs the TypeScript compiler in "noEmit" mode.
// This function returns a promise which resolves to a boolean "no errors", when the TSC
// process ends.
// Note that in watch mode, the promise only resolves after explicitly calling cancel.
// In non-watch mode, the promise resolves to true if TSC did not report any errors.
// The returned promise is cancellable. I.e. p.cancel()
//
export function tslint(options? :TSLintOptions) :CancellablePromise<boolean>
export interface TSLintOptions {
  watch?       :boolean
  colors?      :boolean
  clearScreen? :boolean  // clear the screen before each watch restart
  cwd?         :string   // change working directory
  quiet?       :boolean  // Only log warnings and errors but nothing else
  onEnd?       :(stats:{errors:number,warnings:number,other:number})=>void
  onRestart?   :()=>void   // callback for when tsc restarts (in watch mode only)

  // srcdir is optional and when specified will be used to search for a tsconfig.json
  // file: This directory will be searched first, before searching its parents.
  // This is only used when mode="auto".
  // When not specificed and mode="auto", cwd is the starting point for the search.
  srcdir? :string

  // undefined|"auto" will only run tsc if a tsconfig.json file is found,
  // according to typescript.
  //
  // "on" runs tsc either from node_modules (or as just "tsc" in PATH if not found)
  // and does not care if a tsconfig.json file exists or not.
  //
  // "off" causes the call to tslint() to immediately return true.
  // Mainly an option for completeness.
  mode? :"on"|"off"|"auto"

  // rules defining changing the severity, or meaning, of TS diagnostic codes.
  // TS diagnostic codes is the number after "TS", e.g. "TS6133: 'foo' is declared but ..."
  //
  // For example, to ignore unused locals, set { 6133: "IGNORE" }
  // The result of tslint (and in effect a build) is false (failure) only when at least one
  // error occured. So in case you want to allow builds to pass with a warning instead of
  // an error for certain issues, you can rules for the corresponding TS diagnostic codes
  // with a value of "WARN".
  //
  // The rules defined here are in addition to defaultTSRules and they take precedence
  // over defaultTSRules.
  rules? :TSRules

  // tsconfigFile is optional and provides a specific filename to load tsconfig from.
  // If not provided or the empty string, tsconfig.json is automatically found based
  // on cwd and srcdir.
  tsconfigFile? :string
}

// Default TSRules
export const defaultTSRules :TSRules

export type TSRules = { [tscode:string] : "IGNORE"|"INFO"|"WARN"|"ERROR" }

export interface CancellablePromise<T> extends Promise<T> {
  cancel(reason? :any):void
}


// fmtDuration returns milliseconds of time duration in a human-readable format.
// E.g. 12min, 4.5s, 4.91ms
export function fmtDuration(milliseconds :number) :string


// tildePath takes a file pathname (relative or absolute) and returns the path with
// the current user's home directory is replaced with "~". If path is not rooted in
// the home directory, path is returned verbatim.
export function tildePath(path :string) :string


// findInPATH locates an executable program names "program" in PATH.
// It performs the same search as a shell like Bash does.
// Returns null if not found. Makes use of synchronous file access.
export function findInPATH(program :string) :string|null


// tsconfig returns the data of a tsconfig.json file for the provided configuration.
// If not found, null is returned.
// Uses synchronous file operations. The result is cached.
export function tsconfig(config :BuildConfig) :null|{[prop:string]:any}

// tsconfig returns the pathname of a tsconfig.json file for the provided configuration.
// If not found, null is returned.
// Uses synchronous file operations. The result is cached.
export function tsconfigFile(config :BuildConfig) :null|string


// glob returns the names of all files matching pattern
// The syntax of patterns is the same as in `globmatch`.
// The pattern may describe hierarchical names such as `/usr/*/bin/ed`
// (assuming the Separator is `/`). glob ignores file system errors.
export function glob(pattern :string) : string[]

// globmatch tests if a string matches a glob pattern
// glob and globmatch comes from the miniglob package.
// Grammar of pattern syntax which matches that of Go:
//
// pattern:
//   { term }
// term:
//   '*'         matches any sequence of non-Separator characters
//   '?'         matches any single non-Separator character
//   '[' [ '^' ] { character-range } ']'
//               character class (must be non-empty)
//   c           matches character c (c != '*', '?', '\\', '[')
//   '\\' c      matches character c
//
// character-range:
//   c           matches character c (c != '\\', '-', ']')
//   '\\' c      matches character c
//   lo '-' hi   matches character c for lo <= c <= hi
//
// Match requires pattern to match all of name, not just a substring.
// On Windows, escaping is disabled. Instead, '\\' is treated as path separator.
export function globmatch(pattern :string, name :string) :boolean


// termStyle returns an object with functions for filtering strings, adding ANSI stying
// as needed and when supported by the w stream object.
//
// If hint is set to true, then styling is enabled regardless of w.isTTY.
// If hint is set to false, then styling is disabled (pass-through only.)
// If hint is undefined, styling is enabled only if w.isTTY==true.
//
// Example:
//   const style = termStyle(process.stdout)
//   process.stdout.write(style.green("Kermit\n"))
//
export function termStyle(w :TTYStream|NoTTYStream, hint? :boolean) :TermStyle
export interface TermStyle {
  ncolors :number
  reset   :string
  bold(s :any) :string
  italic(s :any) :string
  underline(s :any) :string
  inverse(s :any) :string
  white(s :any) :string
  grey(s :any) :string
  black(s :any) :string
  blue(s :any) :string
  cyan(s :any) :string
  green(s :any) :string
  magenta(s :any) :string
  purple(s :any) :string
  pink(s :any) :string
  red(s :any) :string
  yellow(s :any) :string
  lightyellow(s :any) :string
  orange(s :any) :string
}
export interface TTYStream {
  readonly isTTY :true
  getColorDepth():number
}
export interface NoTTYStream {
  readonly isTTY :false
}


// screen represents the terminal screen.
// If output is not a TTY, some hard-coded defaults are used and clear() has no effects.
export const screen :Screen
export interface Screen {
  width  :number  // number of columns
  height :number  // number of rows
  clear() :void   // clear the screen
  banner(ch? :string) :string  // print banner of ch that stretches across the screen
}


// human-readable name of program in a short form suitable for log messages.
export const prog :string

// version of estrella, e.g. "1.2.3"
export const version :string


// parsed command-line options
export const cliopts :CLIOptions
// command-line arguments left after parsing options
export const cliargs :string[]
interface CLIOptions {
  watch: boolean // aliases: w
  debug: boolean // aliases: g
  color: boolean
  "no-color": boolean
  sourcemap: boolean|"inline"|"external"
  "inline-sourcemap": boolean
  "no-clear": boolean
  "no-diag": boolean
  diag: boolean
  quiet: boolean
  "debug-self": boolean
}
