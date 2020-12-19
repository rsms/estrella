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
import * as TS from "typescript"
import * as fs from "fs"
import { PathLike, Stats as FileStats } from "fs"


// build represents an invocation of esbuild; one package/module.
// Returns true if build succeeded, false if not.
export function build(config :BuildConfig) :BuildProcess

export interface BuildConfig extends esbuild.BuildOptions {
  // Defines the entry file(s) (alternate spelling of "entryPoints")
  entry?: string | string[]

  // When debug is set, no minification is performed and DEBUG=true is defined.
  debug? :boolean

  // Watch source files for changes and recompile.
  watch? :boolean | WatchOptions

  // Use this working directory instead of the directory of the main script.
  cwd? :string

  // Only log warnings and errors but nothing else.
  quiet? :boolean

  // silent supresses all log messages, including errors and warnings. Implies quiet.
  silent? :boolean

  // By defaul estrella clears the terminal screen in watch mode when stdout is a TTY.
  // If clear=true, then the screen is cleared even if stdout is not a TTY.
  // If clear=false, then the screen is never cleared.
  clear? :boolean

  // tslint controls if TypeScript diagnostics are run.
  // tslint==undefined || tslint=="auto"
  //   Automatically enable tsc diagnostics.
  //   If tsc is found in node_modules and a tsconfig.json file is found.
  // tslint==true || tslint=="on"
  //   Run tsc either from node_modules or if not found there, in a shell from PATH.
  // tslint==false || tslint=="off"
  //   Do not run tsc
  // TSLintBasicOptions
  //   Use the provided options for tslint and treat TSLintBasicOptions.mode as the value
  //   with effects as described above.
  //
  tslint? :boolean | "auto" | "on" | "off" | TSLintBasicOptions

  // onStart and onEnd are called when esbuild starts and ends, respectively.
  // Useful when scripting and watching files for changes.
  // onStart's changedFiles argument is empty on the first invocation and contains
  // names of files that were changed during watch for subsequent callbacks.
  // If a callback returns a promise, the build process will await that promise
  // before continuing.
  onStart? :(
    config       :Readonly<BuildConfig>,
    changedFiles :string[],
    ctx          :BuildContext,
  ) => Promise<void>|any

  // onEnd is called after esbuild has completed a build
  onEnd? :(
    config      :Readonly<BuildConfig>,
    buildResult :BuildResult,
    ctx         :BuildContext,
  ) => Promise<void>|any

  // outfileMode sets the file system mode (using chmod) on outfile.
  // See the chmod() and editFileMode() functions for details.
  outfileMode? :number|string|string[]

  // run enables running a process after a successful build.
  //
  // When true, the same program used to invoke estrella is used to run the outfile script.
  // When this is a string, that string is run in a shell (whatever shell nodejs choose to use.)
  // When this is a list of strings, they are treated as arguments and are executed without a
  // shell where the first argument is considered as the executable.
  //
  // Examples: (effective process invocation)
  //   run: true             (node, "outfile")
  //   run: "deno foo.js"    (shell "deno 'foo.js'")
  //   run: [`${process.cwd()}/util/prettier`, "foo.js"]
  //     (CURRENT_WORKING_DIRECTORY/util/prettier "foo.js")
  //
  // Semantics:
  //
  //   After a build completes successfully, the "run" process is spawned.
  //
  //   In watch mode, any currently executing process is killed before spawning a new instance.
  //   This makes it possible to ensure that a program that requires exclusive access to some
  //   resource like a network port or file does not run at the same time.
  //
  //   When watch mode is not enabled, the spawned process will prevent estrella from exiting.
  //   Estrella will exit with the status code of the spawned process.
  //
  // Environment variables:
  //
  //   The process inherits the environment from the parent process.
  //   You can set env variables in your build script simply via process.env[NAME]=VALUE
  //
  //   The following environment variables are defined automatically by Estrella:
  //      ESTRELLA_PATH     Absolute path to estrella library
  //      ESTRELLA_VERSION  Estrella version (e.g. "1.2.3")
  //
  run? :boolean | string | string[]

  /** @deprecated Use `tslint` instead */
  tsc? : boolean | "auto" | "on" | "off"

  /** @deprecated Use `tslint.rules` instead */
  tsrules? :TSRules

  /** @deprecated (removed & unused) */
  title? :string

  // See https://github.com/evanw/esbuild/blob/master/lib/types.ts for an overview
  // of esbuild.BuildOptions
}

export interface BuildResult {
  warnings :esbuild.Message[]
  errors   :esbuild.Message[]

  // when outfile is absent from BuildConfig js contains the generated JavaScript code.
  js? :string

  // when outfile is absent from BuildConfig map contains the generated source map JSON.
  map? :string
}

export interface BuildContext {
  // force a rebuild
  rebuild() :Promise<boolean>

  // buildCounter starts at 0 and increments after every build
  readonly buildCounter :number
}

export interface BuildProcess extends CancellablePromise<boolean>, BuildContext {}


// watch observes files and directories for changes
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

  // filter which files are considered for changes.
  // If not set, all files are considered.
  // When WatchOptions are passed to build() only the exact source files found by esbuild
  // are watched and thus the filter in that case will operate only on known source files.
  filter? :RegExp|null,
}

// WatchCallback receives a list of changed files
export type WatchCallback = (files :string[])=>Promise<void> | PromiseLike<void> | void


/**
 * watchdir watches one or more file directories for changes
 * @deprecated use watch() instead
 */
export function watchdir(
  dir :string|ReadonlyArray<string>,
  cb :WatchCallback,
) :CancellablePromise<void>
/** @deprecated use watch() instead */
export function watchdir(
  dir    :string|ReadonlyArray<string>,
  filter :RegExp|null,
  cb     :WatchCallback,
) :CancellablePromise<void>
/** @deprecated use watch() instead */
export function watchdir(
  dir     :string|ReadonlyArray<string>,
  filter  :RegExp|null,
  options :WatchdirOptions|null,
  cb      :WatchCallback,
) :CancellablePromise<void>
/** @deprecated use watch() instead */
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

// TSLintBaseOptions are available both to build() and tslint()
export interface TSLintBasicOptions {
  // colors explicitly enables ANSI coloring of output.
  // If not set, uses the color settings of estrella.
  colors? :boolean

  // quiet makes tslint only log warnings and errors but nothing else
  quiet? :boolean

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

  // undefined|"auto" will only run tsc if a tsconfig.json file is found,
  // according to typescript.
  //
  // "on" runs tsc either from node_modules (or as just "tsc" in PATH if not found)
  // and does not care if a tsconfig.json file exists or not.
  //
  // "off" causes the call to tslint() to immediately return true.
  // Mainly an option for completeness.
  mode? : "on" | "off" | "auto"

  // format configures the format of diagnostic messages. "full" is the default.
  // - "full"      Multi-line messages with source code context. (default)
  // - "short"     Warnings & info are one-line without source code context.
  // - "short-all" Like "short" but even errors are one-line messages.
  format? : "full" | "short" | "short-all"
}

// TSLintOptions are the full set of options availabe to tslint() only
export interface TSLintOptions extends TSLintBasicOptions {
  watch?       :boolean
  clearScreen? :boolean  // clear the screen before each watch restart
  cwd?         :string   // change working directory
  onEnd?       :(stats:{errors:number,warnings:number,other:number})=>void
  onRestart?   :()=>void   // callback for when tsc restarts (in watch mode only)

  // srcdir is optional and when specified will be used to search for a tsconfig.json
  // file: This directory will be searched first, before searching its parents.
  // This is only used when mode="auto".
  // When not specificed and mode="auto", cwd is the starting point for the search.
  srcdir? :string

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


// dirname returns the directory part of a filename path.
// E.g. dirname("/foo/bar/baz") => "/foo/bar"
export function dirname(path :string) :string

// basename returns last part of a filename path.
// E.g. dirname("/foo/bar/baz.txt") => "baz.txt"
// E.g. dirname("/foo/bar/baz.txt", ".txt") => "baz"
export function basename(path :string, ext? :string) :string


// chmod edits the mode of a file (synchronous)
// If m is a number, the mode is simply set to m.
// If m is a string or list of strings, the mode is updated using editFileMode.
// Returns the new mode set on file.
// For an asynchronous version, see file.chmod()
export function chmod(file :PathLike, m :number|string|string[]) :number

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


// file functions
export const file :{
  // file() reads all contents of a file (same as file.read)
  (filename :PathLike, options :{encoding:string, flag?:string}|string) :Promise<string>
  (filename :PathLike, options :{encoding?:null, flag?:string}) :Promise<Buffer>
  (filename :PathLike) :Promise<Buffer>

  // read reads all contents of a file
  read(filename :PathLike,
    options :{encoding:BufferEncoding, flag?:fs.OpenMode} | BufferEncoding) :Promise<string>
  read(filename :PathLike, options :{encoding?:null, flag?:fs.OpenMode} | null) :Promise<Buffer>
  read(filename :PathLike) :Promise<Buffer>

  // readSync reads a file synchronously.
  // This is usually faster than read() when you are not reading many files at once.
  readSync(filename :PathLike,
    options :{encoding:BufferEncoding,flag?:fs.OpenMode} | BufferEncoding
  ) :string
  readSync(filename :PathLike, options :{encoding?:null,flag?:fs.OpenMode} | null) :Buffer
  readSync(filename :PathLike) :Buffer

  // readall reads all contents of all provided files.
  // Equivalent to Promise.all(filenames.map(f => file.read(f)))
  readall(...filenames :PathLike[]) :Promise<Buffer[]>
  readallText(encoding :string|null|undefined, ...filenames :PathLike[]) :Promise<string[]>

  // write writes data to file at filename.
  // Automatically creates any missing directories. Set options.mkdirOff to disable.
  // If options.log is set, prints "Wrote {filename}" to stdout on completion.
  write(filename :PathLike, data :string|Uint8Array, options? :FileWriteOptions) :Promise<void>

  // writeSync synchronously writes data to a file.
  // Sometimes this is a better choice than file.write, for example if the process may terminate
  // before an async write completes.
  writeSync(filename :PathLike, data :string|Uint8Array, options? :FileWriteOptions) :void

  // file.sha1 computes the SHA-1 checksum of a file
  sha1(filename :PathLike) :Promise<Buffer>
  sha1(filename :PathLike, outputEncoding :"latin1"|"hex"|"base64") :Promise<string>

  // chmod edits the mode of a file.
  // If m is a number, the mode is simply set to m.
  // If m is a string or list of strings, the mode is updated using editFileMode.
  // Returns the new mode set on file.
  // For a synchronouse version, see estrella.chmod()
  chmod(filename :PathLike, m :number|string|string[]) :Promise<number>

  // stat returns file status
  stat(filename :PathLike) :Promise<FileStats>

  // mtime returns the modification time of a file, or null if the file can't be stat'd
  // This is a convenience function around state which doesn't throw an error on failure.
  mtime(filename :PathLike) :Promise<number|null>
  mtime(...filenames :PathLike[]) :Promise<(number|null)[]>

  // copy copies srcfile to dstfile. dstfile is overwritten if it already exists.
  // If failIfExist is set, then the copy operation will fail if dstfile exists.
  copy(srcfile :PathLike, dstfile :PathLike, failIfExist? :boolean) :Promise<void>

  // move renames oldfile to newfile
  move(oldfile :PathLike, newfile :PathLike) :Promise<void>

  // mkdirs creates the file directory dir, unless it exists, and any intermediate
  // directories that are missing. mode subject to umask and defaults to 0o777.
  // Resolves to true if a directory was created.
  mkdirs(dir :PathLike, mode? :fs.Mode) :Promise<boolean>
}

export type FileWriteOptions = FileWriteOptionsObj
                             | BufferEncoding
                             | null
interface FileWriteOptionsObj extends fs.BaseEncodingOptions {
   mode?      :fs.Mode
   flag?      :fs.OpenMode
   log?       :boolean  // log "Wrote filename"
   mkdirOff?  :boolean  // disable implicit creation of directories
   mkdirMode? :fs.Mode  // for implicit mkdir. Defaults to 0o777 (subject to umask.)
 }


// sha1 computes the SHA-1 checksum of input data
export var sha1 :{
  (input :string|NodeJS.ArrayBufferView) :Buffer
  (input :string|NodeJS.ArrayBufferView, outputEncoding :"latin1"|"hex"|"base64") :string
}

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
  ncolors     :number
  reset       :string
  bold        :TermStyleFun
  italic      :TermStyleFun
  underline   :TermStyleFun
  inverse     :TermStyleFun
  white       :TermStyleFun
  grey        :TermStyleFun
  black       :TermStyleFun
  blue        :TermStyleFun
  cyan        :TermStyleFun
  green       :TermStyleFun
  magenta     :TermStyleFun
  purple      :TermStyleFun
  pink        :TermStyleFun
  red         :TermStyleFun
  yellow      :TermStyleFun
  lightyellow :TermStyleFun
  orange      :TermStyleFun
}
export interface TermStyleFun {
  (s :any) :string  // wrap s in the style
}
export interface TTYStream {
  readonly isTTY :true
  getColorDepth():number
}
export interface NoTTYStream {
  readonly isTTY :false
}

// TermStyle object for process.stdout (customizeable with -color and -no-color CLI arguments)
export const stdoutStyle :TermStyle

// TermStyle object for process.stderr (customizeable with -color and -no-color CLI arguments)
export const stderrStyle :TermStyle


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


// command-line options
export const cliopts :CLIOptions

// command-line arguments left after parsing options
export const cliargs :string[]

export interface CLIOptions {
  "debug-self"?       :boolean
  "inline-sourcemap"? :boolean
  "no-clear"?         :boolean
  "no-color"?         :boolean
  "no-diag"?          :boolean
  color?              :boolean
  debug?              :boolean
  diag?               :boolean
  quiet?              :boolean
  sourcemap?          :boolean|"inline"|"external"
  watch?              :boolean

  // cliopts.parse parses additional, custom command-line arguments.
  // This function must be invoked immediately when your build script starts.
  // Returns [ options, remaining_arguments ]
  //
  // A flag that is null, undefined or false is ignored and not considered.
  // This makes it easy to conditionally enable flags. For example:
  //   cliopts.parse(
  //     ["flag", "Thing"],
  //     cliopts.debug && ["debug-feature", "Feature only available in debug builds"],
  //   )
  //
  // Flag format examples:
  //
  //   "verbose"
  //     Simple boolean flag that can be set with -verbose or --verbose.
  //
  //   [ "v", "Show version" ]
  //     Boolean flag "v" with description text shown in program usage.
  //
  //   [ "-v, -version", "Show version" ]
  //   [ ["v", "--version"], "Show version" ]
  //     Boolean flag "v" with alternate name "version" with description.
  //     "-" characters preceeding flag names are ignored; purely decorative.
  //
  //   [ ["v", "version"] ]
  //     Boolean flag "v" with alternate name "version" without description.
  //
  //   [ "-o", "Output file", "<path>" ]
  //     Value flag with description. Value type defaults to string.
  //     Can be invoked as -o=path, --o=path, -o path, and --o path.
  //
  //   [ "o", "", "<path>" ]
  //     Value flag without description.
  //
  //   [ "limit", "Show no more than <limit> items", "<limit:number>" ]
  //     Value flag with type constraint. Passing a value that is not a JS number
  //     causes an error message.
  //
  //   [ "with-openssl", "", "enable:bool" ]
  //     Boolean flag with named value
  //
  parse(...flags :(CLIFlag|null|undefined|false)[]) :[{[k:string]:any}, string[]]
}

// Command-line option flag. See CLIOptions.parse for details on its meaning & use.
export type CLIFlag = string | [string|string[] , string? , string?]

// Estrella TypeScript API, available only when the "typescript" module is available
// at runtime from either a local node_modules or a system-wide location.
export const ts :TypeScriptAPI | null
export interface TypeScriptAPI {
  readonly ts : typeof TS  // the regular typescript API

  // parseFile parses a typescript file
  parseFile(srcfile :string, options?: TS.CompilerOptions) :Promise<TS.SourceFile>

  // parse typescript source code as one program
  parse(source :{[filename:string]:string}, options?: TS.CompilerOptions
    ) :Promise<{[filename:string]:TS.SourceFile}>

  // parse typescript source code
  parse(source :string, options?: TS.CompilerOptions) :Promise<TS.SourceFile>

  // fmt formats an AST as TypeScript code.
  // If file is not provided, the node needs to have its parent prop set.
  fmt(node :TS.Node, file? :TS.SourceFile) :string

  // creates or returns a cached compiler host for the provided options
  getCompilerHost(options: TS.CompilerOptions) :[TS.CompilerHost, TS.CompilerOptions]

  // interfaceInfo returns information for named interface in srcfile
  // This is really just a convenience shortcut function around interfacesInfo.
  interfaceInfo(srcfile :string, name :string, options?: TS.CompilerOptions
    ) :Promise<TSInterface|null>

  // interfacesInfo returns information about named interfaces defined at the top level of srcfile.
  // If an interface with a given name is not found, null is returned in its place.
  // If names is null, information about all interfaces is returned.
  interfacesInfo(srcfile :string, names :string[]|null, options?: TS.CompilerOptions
    ) :Promise<(TSInterface|null)[]>

  // interfacesInfoAST returns information about named interfaces defined at the top level of file.
  // If an interface with a given name is not found, null is returned in its place.
  // If names is null, information about all interfaces is returned.
  interfacesInfoAST(file :TS.SourceFile, names :string[]|null) :(TSInterface|null)[]
}

// TSInterface describes a TypeScript interface type
export interface TSInterface {
  readonly name     :string
  readonly heritage :TSInterface[]                 // other interfaces this interface extends
  readonly props    :{[name:string]:TSTypeProp}    // properties

  // computedProps returns the set of effective props, including heritage
  computedProps() :{[name:string]:TSTypeProp}

  // lookupProp attempts to resolve a prop, searching the heritage tree if the prop can't be
  // found in the props dictionary.
  lookupProp(name :string) :TSTypeProp|null
}

// TSTypeProp describes a TypeScript property of a type
export interface TSTypeProp {
  readonly name    :string
  readonly type?   :TS.TypeNode  // null or undefined if the propery is not types (implicit any)
  readonly typestr :string       // type as TypeScript code, e.g. "boolean", "string[]", etc.
  readonly parent  :TSInterface  // interface where its defined
  readonly srcfile :string       // source code origin filename
  readonly srcline :number       // source code origin line
  readonly srccol  :number       // source code origin column
}

// Log is a thin wrapper around console with a few twists:
// - log messages are conditionally printed depending on log.level
// - respects -estrella-debug and -quiet CLI arguments (sets log.level)
// - respects -color and -no-color CLI arguments.
// - error messages have the program name prepended.
// - error, warning and debug messages are ANSI styled, when the terminal supports it.
export const log :Log
export interface Log {
  readonly ERROR :number // only log errors
  readonly WARN  :number // log errors and warnings
  readonly INFO  :number // log errors, warnings and info
  readonly DEBUG :number // log everything

  level :number  // current log level
  colorMode :boolean|undefined  // undefined=auto, true=always, false=never

  error(...v :any[]) :void    // log an error
  warn(...v :any[]) :void     // log a warning
  info(...v :any[]) :void     // log an informational message
  debug(...v :any[]) :void    // log a debug message
  debug(f :()=>any, ...v :any[]) :void  // log a debug message, evaluating f only if level==DEBUG

  /** @deprecated use info and maintain "once" state yourself */
  infoOnce(...v :any[]) :void
}
