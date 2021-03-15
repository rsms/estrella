import * as Path from "path"
import { json } from "./util"


// parse CLI program name (as invoked)
export const prog = (() :string => {
  const $_ = process.env["_"]
  const scriptfile = process.argv[1]
  if (!scriptfile) {
    // unlikely
    return $_ || process.argv[0]
  }
  if ($_ && !Path.isAbsolute($_)) {
    // accurate in some shells (like bash, but not in zsh)
    return $_
  }
  let prefix = ""
  if ($_) {
    const nodeExecName = Path.basename(process.execPath)
    if ($_.endsWith(Path.sep + nodeExecName)) {
      // the script was invoked by explicitly calling node.
      // e.g. "node build.js"
      prefix = nodeExecName + " "
    }
  }
  if (scriptfile.startsWith(process.cwd())) {
    let rel = Path.relative(process.cwd(), scriptfile)
    if (!rel.startsWith("node_modules"+Path.sep) &&
        rel.indexOf(Path.sep+"node_modules"+Path.sep) == -1
    ) {
      if (Path.sep == "/") {
        // on posix systems, this is needed to avoid PATH resolution
        rel = "./" + rel
      }
      return rel
    }
  }
  return prefix + Path.basename(scriptfile)
})()


export function printUsageAndExit(usage :string, errmsg? :string|null) {
  const msg = usage.trim().replace(/\$0\b/g, prog)
  if (errmsg) {
    console.error(`${prog}: ${errmsg}\n` + msg)
    process.exit(1)
  } else {
    console.log(msg)
    process.exit(0)
  }
}

// parseopt types
export interface Doc {
  usage?   :Usage|null
  flags    :Flags[]
  trailer? :string

  // if true, treat an unknown flag as an argument (no error)
  unknownFlagAsArg? :boolean

  // help is a function which is invoked INSTEAD OF printing help and exiting the process.
  // The function receives three values:
  //   flags   -- available flags
  //   options -- flag values parsed so far
  //   args    -- remaining, unprocessed input arguments
  // options and args are the same values returned by parseopt()
  //
  help? :( (flags: FlagInfo[], options :Options, args :string[]) => void ) | null
}
export type Usage = string | (()=>string)
export type Flags = (Flag | null | undefined | false)[]  // falsy elements are ignored
export type Flag  = string | [ string|string[] , string?, string? ]
export interface FlagInfo {
  names        :string[]
  description? :string
  valueName?   :string
  valueType?   :string
  valueParser? :(v:string)=>any
}
export type Options = { [k :string] :any }

// parseopt parses command-line arguments.
// Returns options and unparsed remaining arguments.
//
// flag format:
//
//   flag      = flagname | flagspec
//   flagname  = "-"* <text>
//   flagnames = Array< flagname+ >
//   flagspec  = Tuple< flagnames | flagname >
//
// flag format examples:
//
//   "verbose"
//   Simple boolean flag that can be set with -verbose or --verbose.
//
//   [ "v", "Show version" ]
//   Boolean flag "v" with description text shown in program usage.
//
//   [ "v, version", "Show version" ]
//   [ ["v", "version"], "Show version" ]
//   Boolean flag "v" with alternate name "version" with description.
//
//   [ ["v", "version"] ]
//   Boolean flag "v" with alternate name "version" without description.
//
//   [ "o", "Output file", "<path>" ]
//   Value flag with description. Value type defaults to string.
//   Can be invoked as -o=path, --o=path, -o path, and --o path.
//
//   [ "o", "", "<path>" ]
//   Value flag without description.
//
//   [ "limit", "Show no more than <limit> items", "<limit:number>" ]
//   Value flag with type constraint. Passing a value that is not a JS number
//   causes an error message.
//
//   [ "with-openssl", "", "enable:bool" ]
//   Boolean flag
//
export function parseopt(argv :string[], doc :Doc) :[Options, string[]] {
  let [flagmap, opts] = parseFlags(doc.flags.filter(f => f) as Flag[])
  let options :Options = {}
  let help = false
  let args :string[] = []
  let i = 0

  const eatArg = () => {
    args.push(argv.splice(i, 1)[0])
    i--
  }

  for (; i < argv.length; i++) {
    // read argument
    let arg = argv[i]
    if (arg == '--') {
      i++
      break
    }
    if (arg[0] != '-' || arg == '-') {
      eatArg()
      continue
    }
    arg = arg.replace(/^\-+/, '')
    let eqp = arg.indexOf('=')
    let argval :string|undefined = undefined
    if (eqp != -1) {
      // e.g. -name=value
      argval = arg.substr(eqp + 1)
      arg = arg.substr(0, eqp)
    }

    // lookup flag
    let opt = flagmap.get(arg)
    if (!opt) {
      if (arg == "h" || arg == "help") {
        help = true
        if (!doc.help) {
          console.log(fmtUsage(opts, doc.usage, doc.trailer))
          process.exit(0)
        }
      } else if (doc.unknownFlagAsArg) {
        eatArg()
        continue
      } else {
        printUnknownOptionsAndExit([argv[i]])
      }
      break
    }

    // save option
    let value :any = true
    if (opt.valueName) {
      if (argval === undefined) {
        // -k v
        argval = argv[i + 1]
        if (argval !== undefined && argval[0] != "-") {
          i++
        // } else if (opt.valueType == "boolean") {
        //   argval = "true"
        } else {
          console.error(`missing value for option -${arg} (see ${prog} -help)`)
          process.exit(1)
          break
        }
      } // else -k=v
      try {
        value = opt.valueParser ? opt.valueParser(argval) : argval
      } catch (err) {
        console.error(`invalid value for option -${arg} (${err.message})`)
      }
    } else if (argval !== undefined) {
      console.error(`unexpected value provided for flag -${arg}`)
      process.exit(1)
    } // else: e.g. -k

    options[arg] = value

    // alias spread
    for (let alias of opt.names) {
      if (alias == arg) {
        continue
      }
      options[alias] = value
    }

  } // for (; i < argv.length; i++)

  if (i < argv.length) {
    args = args.concat(argv.slice(i))
  }

  if (help && doc.help) {
    doc.help(opts, options, args)
  }

  return [options, args]
}


export function printUnknownOptionsAndExit(args :string[]) {
  console.error(
    `unknown option${args.length > 1 ? "s" : ""} ${args.join(", ")} (see ${prog} -help)`)
  process.exit(1)
}


// parseFlags parses falgs and returns normalized structured options.
// Returns:
//   [0] Mapping of argument name (e.g. "help") to options.
//   [1] Unique set of options (e.g. {flags:["h","help"],...}).
//
export function parseFlags(flags :Flag[]) :[ Map<string,FlagInfo>, FlagInfo[] ] {
  let fimap = new Map<string,FlagInfo>()
  let fiv :FlagInfo[] = []
  for (let f of flags) {
    let fi = parseFlag(f)
    fiv.push(fi)
    for (let k of fi.names) {
      if (fimap.has(k)) {
        throw new Error(`duplicate CLI flag ${json(k)} in definition ${json(f)}`)
      }
      fimap.set(k, fi)
    }
  }
  return [fimap, fiv]
}


function parseFlag(f :Flag) :FlagInfo {
  const cleanFlag = (s :string) => s.replace(/(?:^|[\s,])\-+/g, '')
  const splitComma = (s :string) => s.split(/\s*,\s*/)

  if (typeof f == "string") {
    return { names: splitComma(cleanFlag(f)) }
  }

  let o :FlagInfo = {
    names: (
      typeof f[0] == "string" ? splitComma(cleanFlag(f[0])) :
      f[0].map(cleanFlag)
    ),
    description: f[1] || undefined
  }

  if (f[2]) {
    let [name, type] = f[2].replace(/^[<>]+|[<>]+$/g, '').split(/:/, 2)
    if (type) {
      switch (type.toLowerCase()) {

        case 'string':
        case 'str':
          type = 'string'
          break

        case 'bool':
        case 'boolean':
          type = 'boolean'
          o.valueParser = s => {
            s = s.toLowerCase()
            return s != "false" && s != "0" && s != "no" && s != "off"
          }
          break

        case 'number':
        case 'num':
        case 'float':
        case 'int':
          type = 'number'
          o.valueParser = s => {
            let n = Number(s)
            if (isNaN(n)) {
              throw new Error(`${json(s)} is not a number`)
            }
            return n
          }
          break

        default:
          throw new Error(`invalid argument type "${type}"`)
      }
    } else {
      type = "string"
    }
    o.valueName = name || type
    o.valueType = type
  }
  return o
}


export function fmtUsage(opts :FlagInfo[], usage? :Usage|null, trailer? :string) :string {
  // s/$name/value/
  let vars :{[k:string]:any} = {
    prog: prog,
    "0": prog,
  }
  const subvars = (s :string) :string => s.replace(/\$(\w+)/g, (_, v) => {
    let sub = vars[v]
    if (!sub) {
      throw new Error(`unknown variable $${v} (to print a dollar sign, use '\\$')`)
    }
    return sub
  })

  // start with usage
  let s = subvars(
    usage ?
      typeof usage == 'function' ? usage() :
                                   String(usage) :
    opts.length > 0 ?
      `Usage: $prog [options]` :
      `Usage: $prog`
  )

  if (opts.length > 0) {
    s += '\noptions:\n'
    let longestFlagName = 0
    let flagNames :string[] = []

    for (let f of opts) {
      let flagName = "  -" + (
        // -f=,-file=<file>
        f.valueName ?
          f.names.join("=,-") + "=" + (
            f.valueType == "boolean" ? 'on|off' :
                                       '<' + f.valueName + '>'
          ) :
        // -f, -file
        f.names.join(", -")
      )
      longestFlagName = Math.max(longestFlagName, flagName.length)
      flagNames.push(flagName)
    }

    for (let i = 0; i < opts.length; i++) {
      let f = opts[i]
      let names = flagNames[i]
      let descr = f.description
      if (!f.description) {
        // default to "Set flagname" ("Enable flagname" for bool flags)
        descr = f.valueType ? "Set " : "Enable " + f.names.reduce(
          (a,s) => (s.length > a.length ? s : a), // pick longest name
          ""
        )
      }
      s += `${names.padEnd(longestFlagName, " ")}  ${descr}`
      if (i + 1 < opts.length) {
        s += "\n"
      }
    }
  }

  // end with trailer
  if (trailer) {
    s += "\n" + subvars(trailer.replace(/[\n\s]+$/, ""))
  }

  return s
}

