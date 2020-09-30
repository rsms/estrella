#!/usr/bin/env node
var __defineProperty = Object.defineProperty;
var __hasOwnProperty = Object.prototype.hasOwnProperty;
var __commonJS = (callback, module2) => () => {
  if (!module2) {
    module2 = {exports: {}};
    callback(module2.exports, module2);
  }
  return module2.exports;
};
var __markAsModule = (target) => {
  return __defineProperty(target, "__esModule", {value: true});
};
var __exportStar = (target, module2) => {
  __markAsModule(target);
  if (typeof module2 === "object" || typeof module2 === "function") {
    for (let key in module2)
      if (!__hasOwnProperty.call(target, key) && key !== "default")
        __defineProperty(target, key, {get: () => module2[key], enumerable: true});
  }
  return target;
};
var __toModule = (module2) => {
  if (module2 && module2.__esModule)
    return module2;
  return __exportStar(__defineProperty({}, "default", {value: module2, enumerable: true}), module2);
};

// node_modules/miniglob/miniglob.js
var require_miniglob = __commonJS((exports2, module2) => {
  !function(t, e) {
    typeof exports2 == "object" && typeof module2 != "undefined" ? e(exports2) : typeof define == "function" && define.amd ? define(["exports"], e) : e(t.miniglob = {});
  }(exports2, function(t) {
    "use strict";
    const {readdirSync: e, statSync: r} = require("fs"), n = (() => {
      try {
        return require("path").sep;
      } catch (t2) {
        return "/";
      }
    })(), o = n.charCodeAt(0), s = n == ":" ? /\:+/g : n == "\\" ? /\\+/g : /\/+/g, u = process.platform == "win32";
    class c extends Error {
      constructor() {
        super("bad pattern");
      }
    }
    const i = u ? (t2) => {
      if (t2.length < 2)
        return 0;
      let e2 = t2[0];
      return t2[1] == ":" && ("a" <= e2 && e2 <= "z" || "A" <= e2 && e2 <= "Z") ? 2 : 0;
    } : (t2) => 0, l = u ? (t2, e2) => {
      const r2 = e2(t2);
      return t2 == "" ? [0, "."] : r2 + 1 == t2.length && h(t2, t2.length - 1) ? [r2 + 1, t2] : r2 == t2.length && t2.length == 2 ? [r2, t2 + "."] : (r2 >= t2.length && (r2 = t2.length - 1), [r2, t2.substr(0, t2.length - 1)]);
    } : (t2, e2) => t2 == "" ? [e2, "."] : t2 == n ? [e2, t2] : [e2, t2.substr(0, t2.length - 1)];
    function h(t2, e2) {
      return t2.charCodeAt(e2) === o;
    }
    function f(t2, u2) {
      t2 = function(t3) {
        let e2 = t3.length - 1, r2 = e2;
        for (; r2 && t3.charCodeAt(r2) === o; )
          --r2;
        r2 != e2 && (t3 = t3.substr(0, r2 + 1));
        return t3.split(s).join(n);
      }(t2);
      let c2 = r(t2);
      c2.isDirectory() && function t3(r2, n2, o2) {
        for (let s2 of e(r2)) {
          let e2 = k(r2, s2), u3 = y(e2), c3 = n2(e2, u3);
          (c3 || c3 === void 0) && u3 && u3.isDirectory() && !o2.has(u3.ino) && (o2.add(u3.ino), t3(e2, n2, o2));
        }
      }(t2, u2, new Set([c2.ino]));
    }
    function a(t2) {
      let e2 = [];
      if (!g(t2))
        return y(t2) ? [t2] : e2;
      let r2 = i(t2), n2 = t2.length - 1;
      for (; n2 >= r2 && !h(t2, n2); )
        n2--;
      let o2 = t2.substr(0, n2 + 1), s2 = t2.substr(n2 + 1);
      if ([r2, o2] = l(o2, r2), g(o2.substr(r2))) {
        if (o2 == t2)
          throw new c();
        const r3 = a(o2);
        for (let t3 of r3)
          d(t3, s2, e2);
      } else
        d(o2, s2, e2);
      return e2;
    }
    function d(t2, r2, n2) {
      const o2 = y(t2);
      if (o2 === null)
        return;
      if (!o2.isDirectory())
        return;
      let s2;
      try {
        s2 = e(t2);
      } catch (t3) {
        return;
      }
      s2.sort();
      for (let e2 of s2)
        A(r2, e2) && n2.push(k(t2, e2));
    }
    function g(t2) {
      for (let e2 = 0; e2 < t2.length; ++e2)
        switch (t2.charCodeAt(e2)) {
          case 42:
          case 63:
          case 91:
          case 123:
            return true;
        }
      return false;
    }
    function b(t2, e2) {
      for (let r2 = 0; r2 < t2.length; ++r2)
        if (t2.charCodeAt(r2) === e2)
          return true;
      return false;
    }
    function A(t2, e2) {
      t:
        for (; t2.length > 0; ) {
          let r2 = false, n2 = "";
          if ([r2, n2, t2] = C(t2), r2 && n2 == "")
            return !b(e2, o);
          let [s2, u2] = w(n2, e2);
          if (!u2 || !(s2.length == 0 || t2.length > 0)) {
            if (r2) {
              for (let r3 = 0; r3 < e2.length && e2.charCodeAt(r3) != o; r3++)
                if ([s2, u2] = w(n2, e2.substr(r3 + 1)), u2) {
                  if (t2.length == 0 && s2.length > 0)
                    continue;
                  e2 = s2;
                  continue t;
                }
            }
            return false;
          }
          e2 = s2;
        }
      return e2.length == 0;
    }
    function C(t2) {
      let e2 = false;
      for (; t2.length > 0 && t2.charCodeAt(0) == 42; )
        t2 = t2.substr(1), e2 = true;
      let r2 = false, n2 = 0;
      t:
        for (; n2 < t2.length; n2++)
          switch (t2.charCodeAt(n2)) {
            case 92:
              u || n2 + 1 < t2.length && n2++;
              break;
            case 91:
              r2 = true;
              break;
            case 93:
              r2 = false;
              break;
            case 42:
              if (!r2)
                break t;
          }
      return [e2, t2.substr(0, n2), t2.substr(n2)];
    }
    function w(t2, e2) {
      for (; t2.length > 0; ) {
        if (e2.length == 0)
          return ["", false];
        switch (t2.charCodeAt(0)) {
          case 91: {
            let r3 = e2.codePointAt(0), n2 = r3 <= 65535 ? 1 : 2;
            if (e2 = e2.substr(n2), t2 = t2.substr(1), r3.toString(16), t2.length == 0)
              throw new c();
            let o2 = t2.charCodeAt(0) == 94;
            o2 && (t2 = t2.substr(1));
            let s2 = false, u2 = 0;
            for (; ; ) {
              if (t2.length > 0 && t2.charCodeAt(0) == 93 && u2 > 0) {
                t2 = t2.substr(1);
                break;
              }
              let e3, n3;
              if ([n3, t2, e3] = p(t2), !e3)
                return ["", false];
              let o3 = n3;
              if (t2.charCodeAt(0) == 45 && ([o3, t2, e3] = p(t2.substr(1)), !e3))
                return ["", false];
              n3 <= r3 && r3 <= o3 && (s2 = true), u2++;
            }
            if (s2 == o2)
              return ["", false];
            break;
          }
          case 63:
            if (e2.charCodeAt(0) == o)
              return ["", false];
            let r2 = e2.codePointAt(0) <= 65535 ? 1 : 2;
            e2 = e2.substr(r2), t2 = t2.substr(1);
            break;
          case 92:
            if (!u && (t2 = t2.substr(1)).length == 0)
              throw new c();
          default:
            if (t2.charCodeAt(0) != e2.charCodeAt(0))
              return t2[0], e2[0], t2.charCodeAt(0).toString(16), e2.charCodeAt(0).toString(16), ["", false];
            e2 = e2.substr(1), t2 = t2.substr(1);
        }
      }
      return [e2, true];
    }
    function p(t2) {
      let e2 = 0, r2 = "", n2 = t2.charCodeAt(0);
      if (t2.length == 0 || n2 == 45 || n2 == 93)
        throw new c();
      if (n2 == 92 && !u && (t2 = t2.substr(1)).length == 0)
        throw new c();
      let o2 = (e2 = t2.codePointAt(0)) <= 65535 ? 1 : 2;
      if (e2 == 65535 && o2 == 1)
        throw new c();
      if ((r2 = t2.substr(o2)).length == 0)
        throw new c();
      return [e2, r2, true];
    }
    function y(t2) {
      try {
        return r(t2);
      } catch (t3) {
      }
      return null;
    }
    function k(t2, e2) {
      return t2 == "." || t2 == "" ? e2 : t2 + n + e2;
    }
    t.PatternError = c, t.glob = function(t2) {
      if (t2.indexOf("**") < 0)
        return a(t2);
      let e2 = [], s2 = new Set();
      return function t3(e3, s3, u2, c2, i2) {
        u2 >= s3.length && (u2 = s3.length - 1);
        let l2 = s3[u2], h2 = l2;
        function d2(t4) {
          return !i2.has(t4) && (i2.add(t4), true);
        }
        function g2(t4) {
          let e4 = t4, r2 = e4.lastIndexOf(n);
          r2 != -1 && (e4 = e4.substr(r2 + 1));
          let i3 = Math.min(u2 + 1, s3.length - 1), l3 = s3.slice(i3).join("*");
          l3.charCodeAt(0) == o ? l3 = function(t5) {
            let e5 = 0;
            for (; t5.charCodeAt(e5) === o; )
              e5++;
            return e5 != 0 ? t5.substr(e5) : t5;
          }(l3) : l3[0] != "*" && (l3 = "*" + l3), A(l3, e4) && c2.push(t4);
        }
        u2 === 0 ? l2.charCodeAt(l2.length - 1) != o && (h2 += "*") : u2 === s3.length - 1 ? l2.charCodeAt(0) != o && (h2 = "*" + h2) : (l2.charCodeAt(0) != o && (h2 = "*" + h2), l2.charCodeAt(l2.length - 1) != o && (h2 += "*")), e3 && (h2 = h2[0] != n ? e3 + n + h2 : e3 + h2);
        let b2 = false;
        h2.charCodeAt(h2.length - 1) === o && (b2 = true, h2 = function(t4) {
          let e4 = t4.length - 1, r2 = e4;
          for (; t4.charCodeAt(r2) === o; )
            r2--;
          return r2 != e4 ? t4.substr(0, r2 + 1) : t4;
        }(h2));
        let C2 = a(h2);
        for (let e4 of C2) {
          let n2 = r(e4);
          n2.isDirectory() ? d2(e4) && f(e4, (e5, r2) => {
            d2(e5) && (r2.isDirectory() ? t3(e5, s3, u2 + 1, c2, i2) : g2(e5));
          }) : !b2 && d2(e4) && g2(e4);
        }
        return c2;
      }("", t2.split(/\*{2,}/), 0, e2, s2), e2;
    }, t.match = A, Object.defineProperty(t, "__esModule", {value: true});
  });
});

// src/global.ts
function assert2(cond, msg, cons) {
  if (false) {
    if (cond) {
      return;
    }
    const message = "assertion failure: " + (msg || cond);
    const e = new Error(message);
    e.name = "AssertionError";
    const obj = {};
    Error.captureStackTrace(obj, cons || assert2);
    if (obj.stack) {
      e.stack = message + "\n" + obj.stack.split("\n").slice(1).join("\n");
    }
    if (assert2.throws) {
      throw e;
    }
    null.printErrorAndExit(e, "assert");
  }
}
assert2.throws = false;
global["assert"] = assert2;

// src/termstyle.ts
function numColors(w, hint) {
  let ncolors = 0;
  if (hint === true) {
    let t = process.env.TERM || "";
    ncolors = t && ["xterm", "screen", "vt100"].some((s) => t.indexOf(s) != -1) ? t.indexOf("256color") != -1 ? 8 : 4 : 2;
  } else if (hint !== false && w.isTTY) {
    ncolors = w.getColorDepth();
  }
  return ncolors;
}
function termStyle(w, hint) {
  return createTermStyle(numColors(w, hint), hint);
}
function createTermStyle(ncolors, hint) {
  const CODE = (s) => `[${s}m`;
  const effect = ncolors > 0 || hint ? (open, close) => {
    const a = CODE(open), b = CODE(close);
    return (s) => a + s + b;
  } : (_) => (s) => s;
  const color = ncolors >= 8 ? (_open16, open256, close) => {
    let a = "[" + open256 + "m", b = "[" + close + "m";
    return (s) => a + s + b;
  } : ncolors > 0 ? (open16, _open256, close) => {
    let a = "[" + open16 + "m", b = "[" + close + "m";
    return (s) => a + s + b;
  } : (_open16, _open256, _close) => (s) => s;
  return {
    _hint: hint,
    ncolors,
    reset: hint || ncolors > 0 ? "e[0m" : "",
    bold: effect("1", "22"),
    italic: effect("3", "23"),
    underline: effect("4", "24"),
    inverse: effect("7", "27"),
    white: color("37", "38;2;255;255;255", "39"),
    grey: color("90", "38;5;244", "39"),
    black: color("30", "38;5;16", "39"),
    blue: color("34", "38;5;75", "39"),
    cyan: color("36", "38;5;87", "39"),
    green: color("32", "38;5;84", "39"),
    magenta: color("35", "38;5;213", "39"),
    purple: color("35", "38;5;141", "39"),
    pink: color("35", "38;5;211", "39"),
    red: color("31", "38;2;255;110;80", "39"),
    yellow: color("33", "38;5;227", "39"),
    lightyellow: color("93", "38;5;229", "39"),
    orange: color("33", "38;5;215", "39"),
    reconfigure(w, hint2) {
      const ncolors2 = numColors(w, hint2);
      if (ncolors2 != this.ncolors && hint2 != this._hint) {
        Object.assign(this, createTermStyle(ncolors2, hint2));
      }
      return this;
    }
  };
}
const stdoutStyle = termStyle(process.stdout);
const stderrStyle = termStyle(process.stderr);

// src/util.js
const fs = __toModule(require("fs"));
const Path = __toModule(require("path"));
const os = __toModule(require("os"));
const perf_hooks = __toModule(require("perf_hooks"));
const util = __toModule(require("util"));
const json = (val, pretty, showHidden) => JSON.stringify(val, showHidden, pretty);
const clock = () => perf_hooks.performance.now();
const isWindows = process.platform.startsWith("win");
const TYPE = Symbol("TYPE");
const runtimeRequire = eval("require");
function repr(val, prettyOrOptions) {
  let options = {
    colors: stdoutStyle.ncolors > 0
  };
  if (typeof prettyOrOptions == "object") {
    options = {...prettyOrOptions};
  } else if (prettyOrOptions !== void 0) {
    options.compact = !prettyOrOptions;
  }
  return util.inspect(val, options);
}
let _tmpdir = "";
function tmpdir2() {
  if (!_tmpdir) {
    _tmpdir = fs.realpathSync.native(os.tmpdir());
  }
  return _tmpdir;
}
function fmtDuration(ms) {
  return ms >= 59500 ? (ms / 6e4).toFixed(0) + "min" : ms >= 999.5 ? (ms / 1e3).toFixed(1) + "s" : ms.toFixed(2) + "ms";
}
function fmtByteSize(bytes) {
  return bytes >= 1024 * 1e3 ? (bytes / (1024 * 1e3)).toFixed(1) + "MB" : bytes >= 1e3 ? (bytes / 1024).toFixed(1) + "kB" : bytes + "B";
}
function findInPATH(executableName) {
  const exeFileMode = isWindows ? 4294967295 : fs.constants.X_OK;
  const PATH = new Set((process.env.PATH || "").split(Path.delimiter));
  for (let dir of PATH) {
    let path = Path.join(Path.resolve(dir), executableName);
    if (isWindows) {
      path += ".cmd";
    }
    while (true) {
      try {
        let st = fs.statSync(path);
        if (st.isSymbolicLink()) {
          path = fs.realpathSync.native(path);
          continue;
        } else if (st.isFile() && st.mode & exeFileMode) {
          return path;
        }
      } catch (_) {
        if (isWindows && path.endsWith(".cmd")) {
          path = Path.join(Path.resolve(dir), executableName) + ".exe";
          continue;
        }
      }
      break;
    }
  }
  return null;
}
function jsonparse(jsonText, filename) {
  try {
    return JSON.parse(json);
  } catch (err) {
    return require("vm").runInNewContext("(" + jsonText + ")", {}, {filename, displayErrors: true});
  }
}
function jsonparseFile(filename) {
  const json2 = fs.readFileSync(filename, "utf8");
  try {
    return jsonparse(json2);
  } catch (err) {
    throw new Error(`failed to parse ${filename}: ${err.message || err}`);
  }
}
function expandTildePath(path) {
  const homedir2 = os.homedir();
  if (path == "~") {
    return homedir2;
  }
  if (path.startsWith("~" + Path.sep)) {
    return homedir2 + path.substr(1);
  }
  return path;
}
function tildePath(path) {
  const s = Path.resolve(path);
  const homedir2 = os.homedir();
  if (s.startsWith(homedir2)) {
    return "~" + s.substr(homedir2.length);
  }
  return s;
}

// src/cli.ts
const Path2 = __toModule(require("path"));
const prog = (() => {
  const $_ = process.env["_"];
  const scriptfile = process.argv[1];
  if (!scriptfile) {
    return $_ || process.argv[0];
  }
  if ($_ && !Path2.isAbsolute($_)) {
    return $_;
  }
  let prefix = "";
  if ($_) {
    const nodeExecName = Path2.basename(process.execPath);
    if ($_.endsWith(Path2.sep + nodeExecName)) {
      prefix = nodeExecName + " ";
    }
  }
  if (scriptfile.startsWith(process.cwd())) {
    let rel = Path2.relative(process.cwd(), scriptfile);
    if (!rel.startsWith("node_modules" + Path2.sep) && rel.indexOf(Path2.sep + "node_modules" + Path2.sep) == -1) {
      if (Path2.sep == "/") {
        rel = "./" + rel;
      }
      return rel;
    }
  }
  return prefix + Path2.basename(scriptfile);
})();
function parseopt(argv, doc) {
  let [flagmap, opts] = parseFlags(doc.flags.filter((f) => f));
  let options = {};
  let help = false;
  let args = [];
  let i = 0;
  const eatArg = () => {
    args.push(argv.splice(i, 1)[0]);
    i--;
  };
  for (; i < argv.length; i++) {
    let arg = argv[i];
    if (arg == "--") {
      i++;
      break;
    }
    if (arg[0] != "-") {
      eatArg();
      continue;
    }
    arg = arg.replace(/^\-+/, "");
    let eqp = arg.indexOf("=");
    let argval = void 0;
    if (eqp != -1) {
      argval = arg.substr(eqp + 1);
      arg = arg.substr(0, eqp);
    }
    let opt = flagmap.get(arg);
    if (!opt) {
      if (arg == "h" || arg == "help") {
        help = true;
        if (!doc.help) {
          console.log(fmtUsage(opts, doc.usage, doc.trailer));
          process.exit(0);
        }
      } else if (doc.unknownFlagAsArg) {
        eatArg();
        continue;
      } else {
        printUnknownOptionsAndExit([argv[i]]);
      }
      break;
    }
    let value = true;
    if (opt.valueName) {
      if (argval === void 0) {
        argval = argv[i + 1];
        if (argval !== void 0 && argval[0] != "-") {
          i++;
        } else {
          console.error(`missing value for option -${arg} (see ${prog} -help)`);
          process.exit(1);
          break;
        }
      }
      try {
        value = opt.valueParser ? opt.valueParser(argval) : argval;
      } catch (err) {
        console.error(`invalid value for option -${arg} (${err.message})`);
      }
    } else if (argval !== void 0) {
      console.error(`unexpected value provided for flag -${arg}`);
      process.exit(1);
    }
    options[arg] = value;
    for (let alias of opt.names) {
      if (alias == arg) {
        continue;
      }
      options[alias] = value;
    }
  }
  if (i < argv.length) {
    args = args.concat(argv.slice(i));
  }
  if (help && doc.help) {
    doc.help(opts, options, args);
  }
  return [options, args];
}
function printUnknownOptionsAndExit(args) {
  console.error(`unknown option${args.length > 1 ? "s" : ""} ${args.join(", ")} (see ${prog} -help)`);
  process.exit(1);
}
function parseFlags(flags) {
  let fimap = new Map();
  let fiv = [];
  for (let f of flags) {
    let fi = parseFlag(f);
    fiv.push(fi);
    for (let k of fi.names) {
      if (fimap.has(k)) {
        throw new Error(`duplicate CLI flag ${json(k)} in definition ${json(f)}`);
      }
      fimap.set(k, fi);
    }
  }
  return [fimap, fiv];
}
function parseFlag(f) {
  const cleanFlag = (s) => s.replace(/(?:^|[\s,])\-+/g, "");
  const splitComma = (s) => s.split(/\s*,\s*/);
  if (typeof f == "string") {
    return {names: splitComma(cleanFlag(f))};
  }
  let o = {
    names: typeof f[0] == "string" ? splitComma(cleanFlag(f[0])) : f[0].map(cleanFlag),
    description: f[1] || void 0
  };
  if (f[2]) {
    let [name, type] = f[2].replace(/^[<>]+|[<>]+$/g, "").split(/:/, 2);
    if (type) {
      switch (type.toLowerCase()) {
        case "string":
        case "str":
          type = "string";
          break;
        case "bool":
        case "boolean":
          type = "boolean";
          o.valueParser = (s) => {
            s = s.toLowerCase();
            return s != "false" && s != "0" && s != "no" && s != "off";
          };
          break;
        case "number":
        case "num":
        case "float":
        case "int":
          type = "number";
          o.valueParser = (s) => {
            let n = Number(s);
            if (isNaN(n)) {
              throw new Error(`${json(s)} is not a number`);
            }
            return n;
          };
          break;
        default:
          throw new Error(`invalid argument type "${type}"`);
      }
    } else {
      type = "string";
    }
    o.valueName = name || type;
    o.valueType = type;
  }
  return o;
}
function fmtUsage(opts, usage, trailer) {
  let vars = {
    prog,
    "0": prog
  };
  const subvars = (s2) => s2.replace(/\$(\w+)/g, (_, v) => {
    let sub = vars[v];
    if (!sub) {
      throw new Error(`unknown variable $${v} (to print a dollar sign, use '\\$')`);
    }
    return sub;
  });
  let s = subvars(usage ? typeof usage == "function" ? usage() : String(usage) : opts.length > 0 ? `Usage: $prog [options]` : `Usage: $prog`);
  if (opts.length > 0) {
    s += "\noptions:\n";
    let longestFlagName = 0;
    let flagNames = [];
    for (let f of opts) {
      let flagName = "  -" + (f.valueName ? f.names.join("=,-") + "=" + (f.valueType == "boolean" ? "on|off" : "<" + f.valueName + ">") : f.names.join(", -"));
      longestFlagName = Math.max(longestFlagName, flagName.length);
      flagNames.push(flagName);
    }
    for (let i = 0; i < opts.length; i++) {
      let f = opts[i];
      let names = flagNames[i];
      let descr = f.description;
      if (!f.description) {
        descr = f.valueType ? "Set " : "Enable " + f.names.reduce((a, s2) => s2.length > a.length ? s2 : a, "");
      }
      s += `${names.padEnd(longestFlagName, " ")}  ${descr}`;
      if (i + 1 < opts.length) {
        s += "\n";
      }
    }
  }
  if (trailer) {
    s += "\n" + subvars(trailer.replace(/[\n\s]+$/, ""));
  }
  return s;
}

// src/log.ts
const console2 = __toModule(require("console"));
var LogLevel;
(function(LogLevel3) {
  LogLevel3[LogLevel3["Error"] = 0] = "Error";
  LogLevel3[LogLevel3["Warn"] = 1] = "Warn";
  LogLevel3[LogLevel3["Info"] = 2] = "Info";
  LogLevel3[LogLevel3["Debug"] = 3] = "Debug";
})(LogLevel || (LogLevel = {}));
let log_console = console;
let log_colorMode = void 0;
const log = new class Log {
  constructor() {
    this.ERROR = 0;
    this.WARN = 1;
    this.INFO = 2;
    this.DEBUG = 3;
    this.level = 2;
    this.infoOnce = this.info;
    this.debug = log_debug;
  }
  error(...v) {
    evalFunctionInArgs(v);
    log_console.error(stderrStyle.red(`${prog}:`), ...v);
  }
  warn(...v) {
    if (log.level >= 1) {
      evalFunctionInArgs(v);
      log_console.error(stderrStyle.magenta(`${prog}:`), ...v);
    }
  }
  info(...v) {
    if (log.level >= 2) {
      evalFunctionInArgs(v);
      log_console.log(...v);
    }
  }
  get colorMode() {
    return log_colorMode;
  }
  set colorMode(colorMode) {
    if (log_colorMode === colorMode) {
      return;
    }
    log_colorMode = colorMode;
    if (colorMode === void 0) {
      log_console = console;
    } else {
      log_console = new console2.Console({
        stdout: process.stdout,
        stderr: process.stderr,
        colorMode
      });
    }
  }
}();
var log_default = log;
function evalFunctionInArgs(args) {
  if (typeof args[0] == "function") {
    args[0] = args[0]();
  }
}
function log_debug(...v) {
  if (log.level >= 3) {
    let meta = "";
    if (false) {
      const stack = captureStackTrace(log_debug);
      const frames = stack.split("\n", 5);
      const f = frames[1];
      let m = f && /at (\w+)/.exec(f);
      if (m) {
        meta = " " + m[1];
      } else if (!m && frames[2]) {
        if (m = frames[2] && /at (\w+)/.exec(frames[2])) {
          meta = ` ${m[1]} → ${stdoutStyle.italic("f")}`;
        }
      }
    }
    evalFunctionInArgs(v);
    if (v.length == 0 || v.length == 1 && (v[0] === "" || v[0] === void 0)) {
      return;
    }
    log_console.log(stdoutStyle.bold(stdoutStyle.blue(`[DEBUG${meta}]`)), ...v);
  }
}

// src/aux.ts
const Path3 = __toModule(require("path"));
let estrellaDir = __dirname;
function createLazyModuleAccessor(filename) {
  let m = null;
  return function getLazyModule() {
    if (!m) {
      log.debug(`loading ${filename} module`);
      m = runtimeRequire(Path3.join(estrellaDir, filename));
      m.initModule(log.level);
    }
    return m;
  };
}
const debug = createLazyModuleAccessor("debug.js");
const watch = createLazyModuleAccessor("watch.js");

// src/error.ts
class UserError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "UserError";
  }
}
function bugReportMessage(mode, reportContextField) {
  return debug().bugReportMessage(mode, reportContextField);
}
function printErrorAndExit(err, origin) {
  return debug().printErrorAndExit(err, origin);
}
function Error_prepareStackTrace(error5, stack) {
  Error.prepareStackTrace = void 0;
  try {
    debug().installSourceMapSupport();
    if (Error.prepareStackTrace !== Error_prepareStackTrace) {
      return Error.prepareStackTrace(error5, stack);
    }
  } catch (_) {
  }
  return error5.stack || String(error5);
}
Error.prepareStackTrace = Error_prepareStackTrace;
process.on("uncaughtException", printErrorAndExit);
process.on("unhandledRejection", (reason, _promise) => {
  printErrorAndExit(reason || "PromiseRejection", "unhandledRejection");
});

// src/memoize.js
const memoizeMap = new Map();
const isMemoized = Symbol("isMemoized");

// src/screen.js
const stdoutIsTTY = !!process.stdout.isTTY;
const stderrIsTTY = !!process.stderr.isTTY;
const screen = {
  width: 60,
  height: 20,
  clear() {
  },
  banner(ch) {
    if (!ch) {
      ch = "-";
    }
    return ch.repeat(Math.floor((screen.width - 1) / ch.length));
  }
};
if (stdoutIsTTY || stderrIsTTY) {
  const ws = stdoutIsTTY && process.stdout || process.stderr;
  const updateScreenSize = () => {
    screen.width = ws.columns;
    screen.height = ws.rows;
  };
  ws.on("resize", updateScreenSize);
  updateScreenSize();
  screen.clear = () => {
    ws.write("c");
  };
}

// src/tsutil.ts
const Path4 = __toModule(require("path"));
const fs2 = __toModule(require("fs"));
const TS_CONFIG_FILE = Symbol("TS_CONFIG_FILE");
const TS_CONFIG = Symbol("TS_CONFIG");
const {dirname: dirname3, basename: basename2} = Path4;
function findTSC(cwd) {
  let npmPath = "";
  let tmpcwd = process.cwd();
  if (cwd) {
    process.chdir(cwd);
  }
  try {
    npmPath = require.resolve("typescript");
  } catch (_) {
  } finally {
    if (cwd) {
      process.chdir(tmpcwd);
    }
  }
  if (npmPath) {
    const find = Path4.sep + "node_modules" + Path4.sep;
    let i = npmPath.indexOf(find);
    if (i != -1) {
      return Path4.join(npmPath.substr(0, i + find.length - Path4.sep.length), ".bin", "tsc");
    }
  }
  return "tsc";
}
function findTSConfigFile(dir, maxParentDir) {
  for (let path of searchTSConfigFile(dir, maxParentDir)) {
    try {
      const st = fs2.statSync(path);
      if (st.isFile()) {
        return path;
      }
    } catch (_) {
    }
  }
  return null;
}
function* searchTSConfigFile(dir, maxParentDir) {
  dir = Path4.resolve(dir);
  const root = Path4.parse(dir).root;
  maxParentDir = maxParentDir ? Path4.resolve(maxParentDir) : root;
  while (true) {
    yield Path4.join(dir, "tsconfig.json");
    if (dir == maxParentDir) {
      break;
    }
    dir = dirname3(dir);
    if (dir == root) {
      break;
    }
  }
}
function tsConfigFileSearchDirForConfig(config2) {
  let dir = config2.cwd || process.cwd();
  if (config2.entryPoints && config2.entryPoints.length > 0) {
    dir = Path4.resolve(dir, Path4.dirname(config2.entryPoints[0]));
  }
  return dir;
}
function getTSConfigFileForConfig(config2) {
  let file3 = config2[TS_CONFIG_FILE];
  if (file3 === void 0) {
    if (config2.tslint === "off" || config2.tslint === false || config2.tsc === "off" || config2.tsc === false) {
      file3 = null;
    } else {
      let dir = tsConfigFileSearchDirForConfig(config2);
      file3 = findTSConfigFile(dir, config2.cwd);
    }
    Object.defineProperty(config2, TS_CONFIG_FILE, {value: file3});
  }
  return file3;
}
function getTSConfigForConfig(config2) {
  let tsconfig = config2[TS_CONFIG];
  if (tsconfig === void 0) {
    const file3 = getTSConfigFileForConfig(config2);
    if (file3)
      try {
        tsconfig = jsonparseFile(file3);
      } catch (err) {
        log_default.warn(() => `failed to parse ${file3}: ${err.stack || err}`);
      }
    if (!tsconfig) {
      tsconfig = null;
    }
    Object.defineProperty(config2, TS_CONFIG, {value: tsconfig});
  }
  return tsconfig;
}

// src/tslint.js
const Path5 = __toModule(require("path"));
const fs3 = __toModule(require("fs"));
const child_process = __toModule(require("child_process"));
const {dirname: dirname4, basename: basename3} = Path5;
const defaultTSRules = {
  6031: "IGNORE",
  6194: "IGNORE",
  6133: "WARNING",
  2531: "WARNING",
  7006: "WARNING",
  7015: "WARNING",
  7053: "WARNING"
};
const IGNORE = 0;
const INFO = 1;
const WARNING = 2;
const ERROR = 3;
const severities = {IGNORE, INFO, WARNING, ERROR};
function addTSRules(dst, src) {
  for (let k of Object.keys(src)) {
    let v = severities[String(src[k]).toUpperCase()];
    if (v === void 0) {
      throw new UserError(`Invalid value for TS rule ${k}: ${json(v)} -- expected value to be one of: ` + Object.keys(severities).map(json).join(", "));
    }
    dst[k] = v;
  }
}
function tslint(options) {
  if (!options) {
    options = {};
  }
  let cancellation = {
    cancelled: false,
    cancel() {
    }
  };
  let p = new Promise((resolve8, reject) => {
    if (options.mode == "off") {
      return resolve8(true);
    }
    const cwd = options.cwd || process.cwd();
    let tsconfigFile = options.tsconfigFile;
    if (tsconfigFile === void 0) {
      tsconfigFile = findTSConfigFile(options.srcdir ? Path5.resolve(cwd, options.srcdir) : cwd);
    }
    if (options.mode != "on" && !tsconfigFile) {
      return resolve8(true);
    }
    const options_format = options.format ? options.format.toLowerCase() : "";
    const logShortInfo = options_format.startsWith("short");
    const logShortWarning = options_format.startsWith("short");
    const logShortError = options_format == "short-all";
    let tscprog = findTSC(options.cwd);
    if (tscprog == "tsc" && options.mode != "on") {
      if (!(tscprog = findInPATH(tscprog))) {
        log_default.warn(`tsc not found in node_modules or PATH. However a tsconfig.json file was found in ` + Path5.relative(process.cwd(), dirname4(tsconfigFile)) + `. Set tslint options.tslint="off" or pass -no-diag on the command line to disable tsc.`);
        return resolve8(true);
      }
    }
    const tsrules = {};
    addTSRules(tsrules, defaultTSRules);
    if (options.rules) {
      addTSRules(tsrules, options.rules);
    }
    let args = [
      "--noEmit",
      options.colors && "--pretty",
      options.watch && "--watch",
      tsconfigFile && "--project",
      tsconfigFile
    ].concat(options.args || []).filter((a) => a);
    log_default.debug(() => `spawning process ${tscprog} ${json(args, 2)}`);
    const p2 = child_process.spawn(tscprog, args, {
      stdio: ["inherit", "pipe", "inherit"],
      cwd
    });
    const onProcessExitHandler = () => {
      try {
        p2.kill();
      } catch (_) {
      }
    };
    process.on("exit", onProcessExitHandler);
    cancellation.cancel = () => {
      p2.kill();
    };
    const infoStyle = (s) => s, warnStyle = stdoutStyle.orange, errorStyle = stdoutStyle.red, okStyle = stdoutStyle.green;
    const _TS_buf = Buffer.from(" TS");
    const Found__buf = Buffer.from("Found ");
    const ANSI_clear_buf = Buffer.from("c");
    const Starting_compilation_buf = Buffer.from("tarting compilation");
    const Starting_incremental_compilation_buf = Buffer.from("tarting incremental compilation");
    const tsmsgbuf = [];
    let tscode = 0;
    let lastRunHadErrors = false;
    let stats = {
      errors: 0,
      warnings: 0,
      other: 0,
      reset() {
        this.errors = 0;
        this.warnings = 0;
        this.other = 0;
      }
    };
    let isIdle = false;
    function onSessionEnd() {
      if (!options.quiet || stats.errors >= 0) {
        options.watch && console.log(screen.banner("—"));
        let summary = [];
        if (stats.errors > 0) {
          summary.push(errorStyle("TS: " + plural(`$ error`, `$ errors`, stats.errors)));
        } else {
          summary.push(okStyle("TS: OK"));
        }
        if (stats.warnings > 0) {
          summary.push(warnStyle(plural(`$ warning`, `$ warnings`, stats.warnings)));
        }
        if (stats.other > 0) {
          summary.push(plural(`$ message`, `$ messages`, stats.other));
        }
        console.log(summary.join("   "));
        options.watch && console.log(screen.banner("—"));
      }
      lastRunHadErrors = stats.errors > 0;
      options.onEnd && options.onEnd(stats);
      stats.reset();
      isIdle = true;
    }
    function flushTSMessage(compilationPassCompleted) {
      let lines = tsmsgbuf.slice();
      tsmsgbuf.length = 0;
      if (tscode == 0) {
        let i = 0;
        let line0 = lines[i++];
        while (line0.length == 0 || line0[0] == 10 && i < lines.length) {
          line0 = lines[i++];
        }
        if (line0.includes(Starting_compilation_buf) || line0.includes(Starting_incremental_compilation_buf)) {
          stats.reset();
          return compilationPassCompleted && onSessionEnd();
        }
        if (lines.every((line) => line.length <= 1)) {
          return compilationPassCompleted && onSessionEnd();
        }
      } else {
        const errorRe = /(?:\x1b\[\d+m|)error(?:\x1b\[\d+m|)/g;
        let line0 = lines.shift().toString("utf8");
        switch (tsrules[tscode]) {
          case IGNORE:
            return compilationPassCompleted && onSessionEnd();
          case INFO:
            line0 = line0.replace(errorRe, infoStyle("info"));
            if (logShortInfo) {
              lines = [];
            } else {
              restyleSrcLineWaves(lines, infoStyle);
            }
            stats.other++;
            break;
          case WARNING:
            line0 = line0.replace(errorRe, warnStyle("warning"));
            if (logShortWarning) {
              lines = [];
            } else {
              restyleSrcLineWaves(lines, warnStyle);
            }
            stats.warnings++;
            break;
          default:
            if (logShortError) {
              lines = [];
            }
            if (errorRe.test(line0)) {
              stats.errors++;
            } else {
              stats.other++;
            }
            break;
        }
        process.stdout.write(line0);
      }
      lines.forEach((v) => process.stdout.write(v));
      compilationPassCompleted && onSessionEnd();
    }
    function restyleSrcLineWaves(lines, stylefn) {
      for (let i = 1; i < lines.length; i++) {
        let line = lines[i];
        if (line.includes(126)) {
          let s = line.toString("utf8");
          s = s.replace(/\x1b\[\d+m(\s*~+)/g, stylefn("$1"));
          lines[i] = s;
        }
      }
    }
    function plural(singular, plural2, n) {
      return (n == 1 ? singular : plural2).replace(/\$/g, n);
    }
    lineReader(p2.stdout, (line, flush) => {
      if (!options.clearScreen) {
        line = stripANSIClearCode(line);
      }
      if (flush) {
        if (line.length > 0) {
          tsmsgbuf.push(line);
        }
        if (tsmsgbuf.length > 0) {
          flushTSMessage();
        }
        return;
      }
      if (isIdle && line.length > 1) {
        isIdle = false;
        options.onRestart && options.onRestart();
      }
      if (line.includes(Found__buf)) {
        let s = stripANSICodesStr(line.toString("utf8"));
        if (/^(?:\[[^\]]+\] |[\d\:PAM \-]+|)Found \d+ error/.test(s)) {
          flushTSMessage(true);
          tscode = 0;
          return;
        } else {
          flushTSMessage(false);
        }
        tscode = 0;
      } else {
        if (line.includes(_TS_buf)) {
          const s = line.toString("utf8");
          const m = /(?:\x1b\[\d+m|)error(?:\x1b\[\d+m\x1b\[\d+m|) TS(\d+)\:/.exec(s);
          let tscode2 = m ? parseInt(m[1]) : 0;
          if (tscode2 > 0 && !isNaN(tscode2)) {
            if (tsmsgbuf.length > 0) {
              flushTSMessage();
            }
            tscode = tscode2;
          }
        }
      }
      tsmsgbuf.push(line);
    });
    p2.on("close", (code) => {
      process.removeListener("exit", onProcessExitHandler);
      resolve8(!lastRunHadErrors);
    });
    function stripANSICodesStr(s) {
      return s.replace(/\x1b\[\d+m/g, "");
    }
    function stripANSIClearCode(buf) {
      let i = buf.indexOf(ANSI_clear_buf);
      return i == -1 ? buf : i == 0 ? buf.subarray(3) : Buffer.concat([buf.subarray(0, i), buf.subarray(i + 3)], buf.length - 3);
    }
  });
  p.cancel = () => {
    if (!cancellation.cancelled) {
      cancellation.cancelled = true;
      cancellation.cancel();
    }
    return p;
  };
  return p;
}
const emptyBuffer = Buffer.allocUnsafe(0);
function lineReader(r, onLine) {
  let bufs = [], bufz = 0;
  const readbuf = (data) => {
    let offs = 0;
    while (true) {
      let i = data.indexOf(10, offs);
      if (i == -1) {
        if (offs < data.length - 1) {
          const chunk = data.subarray(offs);
          bufs.push(chunk);
          bufz += chunk.length;
        }
        break;
      }
      i++;
      let buf = data.subarray(offs, i);
      if (bufz > 0) {
        buf = Buffer.concat(bufs.concat(buf), bufz + buf.length);
        bufs.length = 0;
        bufz = 0;
      }
      onLine(buf, false);
      offs = i;
    }
  };
  const flush = () => {
    if (bufs.length > 0) {
      onLine(Buffer.concat(bufs, bufz), true);
    } else {
      onLine(emptyBuffer, true);
    }
  };
  r.on("data", readbuf);
  r.on("close", flush);
  r.on("end", flush);
}

// src/io.ts
const fs4 = __toModule(require("fs"));
function isReadableStream(s) {
  return s && s.read;
}
function isWritableStream(s) {
  return s && s.write;
}
const emptyBuffer2 = Buffer.allocUnsafe(0);
function isReader(value) {
  return value && typeof value == "object" && value[TYPE] == "Reader";
}
function createReader(stream2) {
  return stream2 ? new StreamReader(stream2) : InvalidReader;
}
function createWriter(stream2) {
  return stream2 ? {
    [TYPE]: "Writer",
    stream: stream2
  } : InvalidWriter;
}
var _a;
const InvalidReader = new class {
  constructor() {
    this[_a] = "Reader";
  }
  _E() {
    return new Error("stream not readable");
  }
  get stream() {
    throw this._E();
  }
  [(_a = TYPE, Symbol.asyncIterator)]() {
    throw this._E();
  }
  read() {
    return Promise.reject(this._E());
  }
}();
var _a2, _b;
const InvalidWriter = new (_b = class {
  constructor() {
    this[_a2] = "Writer";
  }
  _E() {
    return new Error("stream not writable");
  }
  get stream() {
    throw this._E();
  }
}, _a2 = TYPE, _b)();
var _a3;
class StreamReader {
  constructor(stream2) {
    this[_a3] = "Reader";
    this._ended = false;
    this.stream = stream2;
    stream2.pause();
    stream2.once("end", () => {
      this._ended = true;
    });
  }
  [(_a3 = TYPE, Symbol.asyncIterator)]() {
    return this.stream[Symbol.asyncIterator]();
  }
  async read(size, encoding) {
    const stream2 = this.stream;
    stream2.pause();
    if (typeof size == "string") {
      encoding = size;
      size = Number.MAX_SAFE_INTEGER;
    } else if (size === void 0 || size === null || size < 0) {
      size = Number.MAX_SAFE_INTEGER;
    } else if (size == 0) {
      return encoding ? "" : emptyBuffer2;
    }
    if (stream2.readable) {
      let buf2 = stream2.read(this._ended ? void 0 : size);
      if (buf2) {
        return encoding ? buf2.toString(encoding) : buf2;
      }
    }
    if (this._ended) {
      return encoding ? "" : emptyBuffer2;
    }
    const buffers = [];
    let buffersLen = 0;
    if (stream2.readable) {
      const buf2 = stream2.read();
      if (buf2) {
        buffers.push(buf2);
        buffersLen += buf2.length;
      }
    }
    while (buffersLen < size && !this._ended) {
      await new Promise((resolve8, reject) => {
        stream2.once("error", reject);
        stream2.once("end", resolve8);
        stream2.once("readable", resolve8);
      });
      let buf2 = stream2.read(size - buffersLen);
      if (!buf2) {
        buf2 = stream2.read();
      }
      if (buf2) {
        buffers.push(buf2);
        buffersLen += buf2.length;
      }
    }
    const buf = joinbufs(buffers);
    return encoding ? buf.toString(encoding) : buf;
  }
}
function joinbufs(bufs, totalLength) {
  return bufs.length == 0 ? emptyBuffer2 : bufs.length == 1 ? bufs[0] : Buffer.concat(bufs, totalLength);
}
function createWriteBuffer() {
  const w = [];
  let totalLength = 0;
  const push = w.push;
  w.push = (b) => {
    totalLength += b.length;
    return push.call(w, b);
  };
  w.buffer = () => {
    return joinbufs(w, totalLength);
  };
  return w;
}
function errorCodeMsg(errorCode) {
  const libuv_errors = debug().libuv_errors;
  return libuv_errors[errorCode] || "";
}

// src/timeout.ts
function createTimeout(promise, timeout2, rejectOnTimeout) {
  const timeoutTimer = setTimeout(() => {
    const e = new Error("timeout");
    e.name = "Timeout";
    rejectOnTimeout(e);
  }, timeout2);
  return promise.then((r) => {
    clearTimeout(timeoutTimer);
    return r;
  }, (e) => {
    clearTimeout(timeoutTimer);
    throw e;
  });
}

// src/exec.ts
const fs5 = __toModule(require("fs"));
const os2 = __toModule(require("os"));
const subproc = __toModule(require("child_process"));
const stream = __toModule(require("stream"));
const notStartedError = "process not started";
class Cmd {
  constructor(command, ...args) {
    this.dir = "";
    this.env = {...process.env};
    this.shell = false;
    this.stdin = null;
    this.stdout = null;
    this.stderr = null;
    this.extraFiles = [];
    this.windowsHide = true;
    this.process = null;
    this.running = false;
    this.pid = 0;
    this.exitCode = -1;
    this._resolve = () => {
    };
    this._reject = () => {
    };
    this._onerror = (err) => {
      log_default.debug(() => `${this} error:
${err.stack || err}`);
      this._reject(err);
    };
    this._onexit = (code, signal2) => {
      const cmd = this;
      log_default.debug(() => `${cmd} exited status=${code} signal=${signal2}`);
      cmd.running = false;
      if (code === null || signal2 !== null) {
        assert(typeof signal2 == "string");
        cmd.exitCode = -(os2.constants.signals[signal2] || 1);
      } else {
        cmd.exitCode = code || 0;
      }
      cmd._resolve(cmd.exitCode);
    };
    this.command = command;
    this.args = args;
    this.promise = Promise.reject(new Error(notStartedError));
    this.promise.catch((_) => {
    });
  }
  start() {
    return null;
  }
  run(timeout2) {
    this.start();
    return this.wait(timeout2);
  }
  output(encoding, timeout2) {
    this.stdout = "pipe";
    if (!this.stderr) {
      this.stderr = "pipe";
    }
    const {stdout, stderr} = this.start();
    const stdoutBuf = createWriteBuffer();
    const stderrBuf = createWriteBuffer();
    stdout.stream.on("data", (chunk) => {
      stdoutBuf.push(chunk);
    });
    if (stderr) {
      stderr.stream.on("data", (chunk) => {
        stderrBuf.push(chunk);
      });
    }
    return this.wait(timeout2 || 0).then((exitCode) => {
      if (exitCode != 0) {
        let errstr = "";
        const errbuf = stderrBuf.buffer();
        try {
          errstr = errbuf.toString("utf8");
        } catch (_) {
          errstr = errbuf.toString("ascii");
        }
        if (errstr.length > 0) {
          errstr = ". stderr output:\n" + errstr;
        }
        throw new Error(`command exited with status ${exitCode}${errstr}`);
      }
      const buf = stdoutBuf.buffer();
      return encoding ? buf.toString(encoding) : buf;
    });
  }
  wait(timeout2, timeoutSignal) {
    if (timeout2 === void 0 || timeout2 <= 0) {
      return this.promise;
    }
    return this._waitTimeout(timeout2, (err, _resolve, reject) => {
      log_default.debug(() => `${this} wait timeout reached; killing process`);
      err.message = "Cmd.wait timeout";
      return this.kill(timeoutSignal).then(() => reject(err));
    });
  }
  signal(sig, mode) {
    const p = this._checkproc();
    if (mode == "group") {
      try {
        process.kill(-p.pid, sig);
        return true;
      } catch (_) {
      }
    }
    return p.kill(sig);
  }
  async kill(sig = "SIGTERM", timeout2 = 500, mode) {
    const p = this._checkproc();
    if (!this.signal(sig, mode || "group")) {
      return p.exitCode || 0;
    }
    if (timeout2 <= 0) {
      return this.promise;
    }
    return this._waitTimeout(timeout2, (_, resolve8) => {
      log_default.debug(() => `${this} kill timeout reached; sending SIGKILL`);
      p.kill("SIGKILL");
      return this.promise.then(resolve8);
    });
  }
  toString() {
    return this.process ? `Cmd[${this.pid}]` : "Cmd";
  }
  _checkproc() {
    if (!this.process) {
      throw new Error(notStartedError);
    }
    return this.process;
  }
  _rejectAndKill(reason) {
    this._reject(reason);
  }
  _waitTimeout(timeout2, onTimeout) {
    return new Promise((resolve8, reject) => {
      let timeoutOccured = false;
      this.promise.then((exitCode) => {
        if (!timeoutOccured) {
          resolve8(exitCode);
        }
      });
      return createTimeout(this.promise, timeout2, (timeoutErr) => {
        timeoutOccured = true;
        onTimeout(timeoutErr, resolve8, reject);
      });
    });
  }
}
Cmd.prototype.start = function start() {
  const cmd = this;
  if (cmd.running) {
    throw new Error("start() called while command is running");
  }
  cmd.exitCode = -1;
  cmd.promise = new Promise((res, rej) => {
    cmd._resolve = res;
    cmd._reject = rej;
  });
  let stdin = null;
  let stdinStreamNeedsPiping = null;
  if (cmd.stdin instanceof Buffer) {
    stdin = "pipe";
  } else if (isReader(cmd.stdin)) {
    if (typeof cmd.stdin.stream.fd == "string") {
      stdin = cmd.stdin.stream;
    } else {
      stdin = "pipe";
      stdinStreamNeedsPiping = cmd.stdin.stream;
    }
  } else {
    stdin = cmd.stdin;
  }
  const p = subproc.spawn(cmd.command, cmd.args, {
    stdio: [
      stdin,
      cmd.stdout === process.stdout ? 1 : cmd.stdout || "ignore",
      cmd.stderr === process.stderr ? 2 : cmd.stderr ? cmd.stderr : "ignore",
      ...cmd.extraFiles
    ],
    cwd: cmd.dir ? expandTildePath(cmd.dir) : void 0,
    env: cmd.env,
    shell: cmd.shell,
    windowsHide: cmd.windowsHide,
    detached: true
  });
  if (p.pid === void 0) {
    cmd.process = null;
    cmd.pid = 0;
    const err = guessSpawnError(cmd);
    cmd._reject(err);
    throw err;
  }
  cmd.running = true;
  cmd.process = p;
  cmd.pid = p.pid;
  p.on("exit", cmd._onexit);
  p.on("error", cmd._reject);
  log_default.debug(() => `${cmd} started (${repr(cmd.command)})`);
  if (p.stdin) {
    if (cmd.stdin instanceof Buffer) {
      const r = new stream.PassThrough();
      r.end(cmd.stdin);
      r.pipe(p.stdin);
      p.stdin = null;
    } else if (stdinStreamNeedsPiping) {
      stdinStreamNeedsPiping.pipe(p.stdin);
      p.stdin = null;
    }
  }
  if (!p.stdin && !p.stdout && !p.stderr && p.stdio.length < 4) {
    return null;
  }
  const cmdio = {
    stdin: p.stdin ? createWriter(p.stdin) : null,
    stdout: p.stdout ? createReader(p.stdout) : null,
    stderr: p.stderr ? createReader(p.stderr) : null,
    extraFiles: p.stdio.slice(3).map((stream2) => isReadableStream(stream2) ? createReader(stream2) : isWritableStream(stream2) ? createWriter(stream2) : null)
  };
  return cmdio;
};
function guessSpawnError(cmd) {
  let code = "";
  let msg = "unspecified error";
  if (cmd.shell == false) {
    try {
      fs5.accessSync(cmd.dir, fs5.constants.R_OK | fs5.constants.X_OK);
      const st = fs5.statSync(cmd.command);
      if ((st.mode & fs5.constants.S_IFREG) == 0) {
        code = "EACCES";
      } else {
        code = "EIO";
      }
    } catch (err) {
      code = err.code || "ENOENT";
    }
    msg = errorCodeMsg(code) || msg;
  }
  if (!code) {
    try {
      fs5.accessSync(cmd.dir, fs5.constants.R_OK | fs5.constants.X_OK);
      code = "EIO";
    } catch (err) {
      code = err.code || "ENOENT";
    }
    msg = errorCodeMsg(code) || msg;
    if (code) {
      msg = msg + "; cmd.dir=" + repr(cmd.dir);
    }
  }
  if (!code) {
    code = "UNKNOWN";
  }
  const e = new Error(`failed to spawn process ${repr(cmd.command)} (${code} ${msg})`);
  e.code = code;
  return e;
}

// src/signal.ts
const fs6 = __toModule(require("fs"));
const os3 = __toModule(require("os"));
const _listenermap = new Map();
function addListener(sig, f) {
  const logerr = (msg) => fs6.writeSync(process.stderr.fd, msg + "\n");
  let ent = _listenermap.get(sig);
  if (ent) {
    ent.listeners.add(f);
  } else {
    const listeners = new Set([f]);
    const rootListener = (sig2) => {
      if (sig2 == "SIGINT") {
        fs6.writeSync(1, "\n");
      }
      false;
      try {
        for (let f2 of listeners) {
          f2(sig2);
        }
      } catch (err) {
        logerr(`error in signal listener: ${err.stack || err}`);
      }
      process.exit(-(os3.constants.signals[sig2] || 1));
    };
    process.on(sig, rootListener);
    _listenermap.set(sig, {rootListener, listeners});
  }
}

// src/run.ts
const filepath = __toModule(require("path"));
const fs7 = __toModule(require("fs"));
let _initialized = false;
let _deinitialized = false;
let _runContexts = new Set();
function init() {
  if (_initialized) {
    return;
  }
  _initialized = true;
  process.on("beforeExit", (exitCode) => atexit(false));
  process.on("exit", (exitCode) => atexit(false));
  const onsignal = (sig) => atexit(false);
  addListener("SIGINT", onsignal);
  addListener("SIGHUP", onsignal);
  addListener("SIGTERM", onsignal);
  addListener("SIGPIPE", onsignal);
}
function atexit(cause) {
  if (_deinitialized) {
    return;
  }
  _deinitialized = true;
  const logerr = (msg) => fs7.writeSync(process.stderr.fd, msg + "\n");
  try {
    if (false) {
      let runningCount = 0;
      for (let ctx of _runContexts) {
        if (ctx.cmd.running) {
          runningCount++;
        }
      }
      if (runningCount > 0) {
        logerr(`[DEBUG run.atexit] run.atexit (${cause})`);
      }
    }
    for (let ctx of _runContexts) {
      if (ctx.cmd.running) {
        false;
        try {
          ctx.cmd.signal("SIGTERM");
        } catch (_) {
        }
      }
    }
    _runContexts.clear();
  } catch (err) {
    logerr(`ignoring error in run.atexit: ${err.stack || err}`);
  }
}
function configure(config2) {
  if (!config2.run) {
    return;
  }
  log_default.debug(() => `run.configure run=${repr(config2.run)}`);
  const ctx = new RunContext(config2);
  _runContexts.add(ctx);
  const onEndNext = config2.onEnd;
  config2.onEnd = async (config3, buildResult, bctx) => {
    await ctx.onEndBuild(buildResult);
    if (typeof onEndNext == "function") {
      return onEndNext(config3, buildResult, bctx);
    }
  };
  init();
}
function waitAll() {
  return Promise.all(Array.from(_runContexts).map((ctx) => ctx.cmd.promise)).then((exitCodes) => exitCodes.reduce((a, c) => Math.max(a, c), 0));
}
class RunContext {
  constructor(config2) {
    this._logOnExit = true;
    this.config = config2;
    this.cmd = new Cmd("");
    this.cmd.stdout = "inherit";
    this.cmd.stderr = "inherit";
    this.cmd.env["ESTRELLA_PATH"] = __filename;
    this.cmd.env["ESTRELLA_VERSION"] = "1.2.5";
    if (typeof config2.run == "string") {
      this.cmd.command = config2.run;
      this.cmd.shell = true;
      this.cmdname = config2.run;
    } else if (typeof config2.run == "boolean") {
      if (!config2.outfile) {
        throw new UserError(`please set config.outfile=<file> or config.run=<file>`);
      }
      this.cmd.command = process.execPath;
      this.cmd.args = [filepath.resolve(config2.outfile)];
      this.cmdname = config2.outfile;
    } else {
      if (!config2.run || config2.run.length == 0) {
        throw new UserError("config.run is an empty list");
      }
      this.cmd.command = config2.run[0];
      this.cmd.args = config2.run.slice(1);
      this.cmdname = config2.run.join(" ");
      if (this.cmdname.length > 60) {
        this.cmdname = this.cmdname.substr(0, 57) + "...";
      }
    }
  }
  async onEndBuild(buildResult) {
    if (buildResult.errors.length > 0) {
      return;
    }
    const cmd = this.cmd;
    const style = stdoutStyle.pink;
    const restart = cmd.running;
    if (cmd.running) {
      this._logOnExit = false;
      log_default.debug(() => `Stopping ${this.cmdname} [${cmd.pid}] ...`);
      await cmd.kill();
    }
    log_default.debug(() => `Starting command ${repr([cmd.command, ...cmd.args])}`);
    let {stdout} = cmd.start();
    if (this.config.watch) {
      log_default.info(() => style(`${restart ? "Restarted" : "Running"} ${this.cmdname} [${cmd.pid}]`));
      this._logOnExit = true;
      cmd.promise.then((exitCode) => {
        this._logOnExit && log_default.info(() => style(`${this.cmdname} exited (${exitCode})`));
      });
    }
  }
}

// src/tsapi.ts
function createTSAPI(tsapi2) {
  let ts = tsapi2;
  if (!ts) {
    log_default.debug("typescript API requested; attempting to load typescript module");
    try {
      const X = require;
      ts = X("typescript");
      if (parseFloat(ts.versionMajorMinor) < 3.5) {
        log_default.warn(`typescript ${ts.version} is too old; disabling "ts" API.
  You are seeing this message because you are importing the ts API.
  Either install a more recent version of typescript or remove the ts import.`);
        return null;
      }
      log_default.debug(() => `loaded typescript ${ts.version} from ${tildePath(X.resolve("typescript"))}`);
    } catch (_) {
      log_default.debug(() => `failed to load typescript; module unavailable`);
      return null;
    }
  }
  const compilerHostCache = new Map();
  function getCompilerHost(options) {
    const cacheKey = json(Object.keys(options).sort().map((k) => [k, options[k]]));
    const cacheEntry = compilerHostCache.get(cacheKey);
    if (cacheEntry) {
      log_default.debug("ts.getCompilerHost cache hit");
      return cacheEntry;
    }
    options = {
      newLine: ts.NewLineKind.LineFeed,
      ...options
    };
    const host = ts.createCompilerHost(options, true);
    const result = [host, options];
    compilerHostCache.set(cacheKey, result);
    log_default.debug("ts.getCompilerHost cache miss");
    return result;
  }
  async function parse2(source, options) {
    const sources = typeof source == "string" ? {"/<source>/a.ts": source} : source;
    const filenames = Object.keys(sources);
    const [host, compilerOptions] = getCompilerHost(options || {});
    const readFile = host.readFile;
    host.readFile = (filename) => {
      if (filename in sources) {
        return sources[filename];
      }
      return readFile(filename);
    };
    const prog2 = ts.createProgram(filenames, compilerOptions, host);
    if (typeof source == "string") {
      return prog2.getSourceFile(filenames[0]);
    }
    const nodes = {};
    for (let fn of filenames) {
      nodes[fn] = prog2.getSourceFile(fn);
    }
    return nodes;
  }
  async function parseFile(srcfile, options) {
    return _parsefile(srcfile, options);
  }
  function _parsefile(srcfile, options) {
    const [host, compilerOptions] = getCompilerHost(options || {});
    const prog2 = ts.createProgram([srcfile], compilerOptions, host);
    const file3 = prog2.getSourceFile(srcfile);
    if (!file3) {
      throw new Error(`${srcfile}: file not found`);
    }
    return file3;
  }
  function interfaceInfo(srcfile, interfaceName, options) {
    return interfacesInfo(srcfile, [interfaceName], options).then((v) => v[0]);
  }
  async function interfacesInfo(srcfile, interfaceNames, options) {
    const file3 = _parsefile(srcfile, options);
    return interfacesInfoAST(file3, interfaceNames);
  }
  function interfacesInfoAST(file3, interfaceNames) {
    const ifdecls = topLevelInterfaceDeclarations(file3);
    const shortCircuit = new Map();
    const infov = [];
    for (let name of interfaceNames || ifdecls.keys()) {
      const node = ifdecls.get(name);
      if (!node) {
        infov.push(null);
        continue;
      }
      infov.push(createTSInterface(file3, node, ifdecls, shortCircuit));
    }
    return infov;
  }
  function createTSInterface(file3, ifnode, ifdecls, shortCircuit) {
    const info1 = shortCircuit.get(ifnode);
    if (info1) {
      return info1;
    }
    const info = {
      heritage: [],
      name: ifnode.name.escapedText,
      props: {},
      computedProps() {
        const props = {};
        for (let h of info.heritage) {
          Object.assign(props, h.props);
        }
        Object.assign(props, info.props);
        return props;
      },
      lookupProp(name) {
        let p = info.props[name];
        if (!p) {
          for (let h of info.heritage) {
            if (p = h.lookupProp(name)) {
              break;
            }
          }
        }
        return p;
      }
    };
    shortCircuit.set(ifnode, info);
    if (ifnode.heritageClauses)
      for (let hc of ifnode.heritageClauses) {
        for (let t of hc.types) {
          const expr = t.expression;
          if (ts.isIdentifier(expr)) {
            const heritageNode = ifdecls.get(expr.escapedText);
            if (heritageNode) {
              info.heritage.push(createTSInterface(file3, heritageNode, ifdecls, shortCircuit));
            }
          }
        }
      }
    ifnode.forEachChild((n) => {
      if (ts.isPropertySignature(n)) {
        const prop = createTSTypeProp(n, file3, info);
        info.props[prop.name] = prop;
      }
    });
    return info;
  }
  function createTSTypeProp(n, file3, parent) {
    const pos = ts.getLineAndCharacterOfPosition(file3, n.pos);
    let _typestr = null;
    const _type = n.type;
    const name = propName(n.name);
    const typeprop = {
      name,
      type: _type,
      get typestr() {
        if (_typestr === null) {
          _typestr = _type ? fmt(_type, file3) : "any";
        }
        Object.defineProperty(typeprop, "typestr", {enumerable: true, value: _typestr});
        return _typestr;
      },
      srcfile: file3.fileName,
      srcline: pos.line,
      srccol: pos.character,
      parent
    };
    return typeprop;
  }
  function propName(n) {
    switch (n.kind) {
      case ts.SyntaxKind.Identifier:
      case ts.SyntaxKind.PrivateIdentifier:
        return n.escapedText;
      case ts.SyntaxKind.StringLiteral:
      case ts.SyntaxKind.NumericLiteral:
        return n.text;
      case ts.SyntaxKind.ComputedPropertyName:
        return "[computed]";
      default:
        return "?";
    }
  }
  function topLevelInterfaceDeclarations(file3) {
    const m = new Map();
    ts.forEachChild(file3, (n) => {
      if (n.kind == ts.SyntaxKind.InterfaceDeclaration) {
        m.set(n.name.escapedText, n);
      } else {
      }
    });
    return m;
  }
  const basicPrinter = ts.createPrinter({
    removeComments: true,
    newLine: ts.NewLineKind.LineFeed,
    omitTrailingSemicolon: true,
    noEmitHelpers: true
  });
  function fmt(node, file3) {
    if (!file3) {
      let n = node;
      while (n.kind != ts.SyntaxKind.SourceFile) {
        n = n.parent;
        if (!n) {
          throw new Error("node without SourceFile parent (provide file to ts.fmt)");
        }
      }
      file3 = n;
    }
    return basicPrinter.printNode(ts.EmitHint.Unspecified, node, file3);
  }
  return {
    ts,
    getCompilerHost,
    parse: parse2,
    parseFile,
    interfaceInfo,
    interfacesInfo,
    interfacesInfoAST,
    fmt
  };
}

// src/chmod.ts
const fs8 = __toModule(require("fs"));
const chr = String.fromCharCode;
const ord = (s, offs) => s.charCodeAt(offs || 0);
function chmod2(file3, modifier) {
  if (typeof modifier == "number") {
    fs8.chmodSync(file3, modifier);
    return modifier;
  }
  let mode = fs8.statSync(file3).mode;
  let newMode = editFileMode(mode, modifier);
  if (mode != newMode) {
    fs8.chmodSync(file3, newMode);
  }
  return newMode;
}
function chmodp(file3, modifier) {
  return new Promise((resolve8, reject) => {
    if (typeof modifier == "number") {
      return fs8.chmod(file3, modifier, (err) => {
        err ? reject(err) : resolve8(modifier);
      });
    }
    fs8.stat(file3, (err, st) => {
      if (err)
        return reject(err);
      let newMode = editFileMode(st.mode, modifier);
      if (st.mode == newMode) {
        return resolve8(newMode);
      }
      fs8.chmod(file3, newMode, (err2) => {
        err2 ? reject(err2) : resolve8(newMode);
      });
    });
  });
}
function editFileMode(mode, modifier) {
  const expectedFormat = `Expected format: [ugoa]*[+-=][rwx]+`;
  const err = (msg, m) => new Error(`${msg} in modifier ${json(m)}. ${expectedFormat}`);
  let mods = [];
  for (let m of Array.isArray(modifier) ? modifier : [modifier]) {
    mods = mods.concat(m.trim().split(/\s*,+\s*/));
  }
  for (let m of mods) {
    let who = [];
    let all = false;
    let op = 0;
    let perm = 0;
    for (let i = 0; i < m.length; i++) {
      let c = ord(m, i);
      if (op == 0) {
        switch (c) {
          case 117:
          case 103:
          case 111:
            if (!all) {
              who.push(c);
            }
            break;
          case 97:
            who = [117, 103, 111];
            all = true;
            break;
          case 43:
          case 45:
          case 61:
            op = c;
            break;
          default:
            if (op == 0) {
              throw err(`Invalid target or operation ${json(chr(c))}`, m);
            }
            break;
        }
      } else {
        switch (c) {
          case 114:
            perm |= 4;
            break;
          case 119:
            perm |= 2;
            break;
          case 120:
            perm |= 1;
            break;
          default:
            throw err(`Invalid permission ${json(chr(c))}`, m);
        }
      }
    }
    if (op == 0) {
      throw err(`Missing operation`, m);
    }
    if (who.length == 0) {
      who = [117];
    }
    if (perm == 0) {
      perm = 4 | 2 | 1;
    }
    let mode2 = 0;
    for (let w of who) {
      switch (w) {
        case 117:
          mode2 |= perm << 6;
          break;
        case 103:
          mode2 |= perm << 3;
          break;
        case 111:
          mode2 |= perm;
          break;
      }
    }
    switch (op) {
      case 43:
        mode |= mode2;
        break;
      case 45:
        mode &= ~mode2;
        break;
      case 61:
        mode = mode2;
        break;
    }
  }
  return mode;
}
if (false) {
  const asserteq = null.strictEqual;
  const oct = (v) => "0o" + v.toString(8).padStart(3, "0");
  const samples = [
    [292, ["u+r"], 292],
    [292, ["u+x"], 356],
    [292, ["u+w"], 420],
    [292, ["u+wx"], 484],
    [292, ["u+rwx"], 484],
    [292, ["u+r,u+w,u+x"], 484],
    [292, ["u+r", "u+w,u+x"], 484],
    [292, ["u+"], 484],
    [511, ["u-r"], 255],
    [511, ["u-wx"], 319],
    [511, ["u-w"], 383],
    [511, ["u-x"], 447],
    [511, ["u-"], 63],
    [511, ["u-rwx"], 63],
    [292, ["g+r"], 292],
    [292, ["g+x"], 300],
    [292, ["g+w"], 308],
    [292, ["g+wx"], 316],
    [292, ["g+rwx"], 316],
    [292, ["g+"], 316],
    [511, ["g-r"], 479],
    [511, ["g-wx"], 487],
    [511, ["g-w"], 495],
    [511, ["g-x"], 503],
    [511, ["g-"], 455],
    [511, ["g-rwx"], 455],
    [292, ["o+r"], 292],
    [292, ["o+x"], 293],
    [292, ["o+w"], 294],
    [292, ["o+wx"], 295],
    [292, ["o+rwx"], 295],
    [292, ["o+"], 295],
    [511, ["o-r"], 507],
    [511, ["o-wx"], 508],
    [511, ["o-w"], 509],
    [511, ["o-x"], 510],
    [511, ["o-"], 504],
    [511, ["o-rwx"], 504],
    [292, ["ug+r"], 292],
    [292, ["ug+x"], 364],
    [292, ["ug+w"], 436],
    [292, ["ug+wx"], 508],
    [292, ["ug+rwx"], 508],
    [292, ["ug+"], 508],
    [292, ["ugo+r"], 292],
    [292, ["a+r"], 292],
    [292, ["ugo+x"], 365],
    [292, ["a+x"], 365],
    [292, ["ugo+w"], 438],
    [292, ["a+w"], 438],
    [292, ["ugo+wx"], 511],
    [292, ["a+wx"], 511],
    [292, ["ugo+rwx"], 511],
    [292, ["a+rwx"], 511],
    [292, ["ugo+"], 511],
    [292, ["a+"], 511],
    [511, ["ug-r"], 223],
    [511, ["ug-wx"], 295],
    [511, ["ug-w"], 367],
    [511, ["ug-x"], 439],
    [511, ["ug-"], 7],
    [511, ["ug-rwx"], 7],
    [511, ["ugo-r"], 219],
    [511, ["a-r"], 219],
    [511, ["ugo-wx"], 292],
    [511, ["a-wx"], 292],
    [511, ["ugo-w"], 365],
    [511, ["a-w"], 365],
    [511, ["ugo-x"], 438],
    [511, ["a-x"], 438],
    [511, ["ugo-"], 0],
    [511, ["a-"], 0],
    [511, ["ugo-rwx"], 0],
    [511, ["a-rwx"], 0]
  ];
  samples.map(([input, mods, expect]) => {
    let actual = editFileMode(input, mods);
    asserteq(actual, expect, `editFileMode(${oct(input)}, ${json(mods)}) => ${oct(actual)} != expected ${oct(expect)}`);
  });
}

// src/file.ts
const fs9 = __toModule(require("fs"));
const Path6 = __toModule(require("path"));
const crypto = __toModule(require("crypto"));
const fsp = fs9.promises;
const fileModificationLog = {};
function fileModificationLogAppend(filename) {
  fileModificationLog[Path6.resolve(String(filename))] = clock();
}
function file(filename, options) {
  return fsp.readFile(filename, options);
}
file.editMode = editFileMode;
file.chmod = (filename, modifier) => {
  fileModificationLogAppend(filename);
  return chmodp(filename, modifier);
};
function read(filename, options) {
  return fsp.readFile(filename, options);
}
file.read = read;
function readSync(filename, options) {
  return fs9.readFileSync(filename, options);
}
file.readSync = readSync;
file.stat = fsp.stat;
function mtime(...filenames) {
  return Promise.all(filenames.map((filename) => fsp.stat(filename).then((st) => st.mtimeMs).catch((_) => null))).then((r) => r.length == 1 ? r[0] : r);
}
file.mtime = mtime;
file.readall = (...filenames) => Promise.all(filenames.map((fn) => fsp.readFile(fn)));
file.readallText = (encoding, ...filenames) => Promise.all(filenames.map((fn) => fsp.readFile(fn, {
  encoding: encoding || "utf8"
})));
file.write = async (filename, data, options) => {
  fileModificationLogAppend(filename);
  const opt = options && typeof options == "object" ? options : {};
  try {
    await fsp.writeFile(filename, data, options);
  } catch (err) {
    if (!opt.mkdirOff && err.code == "ENOENT") {
      await file.mkdirs(Path6.dirname(String(filename)), opt.mkdirMode);
      await fsp.writeFile(filename, data, options);
    } else {
      throw err;
    }
  }
  if (opt.log) {
    let relpath = Path6.relative(process.cwd(), String(filename));
    if (relpath.startsWith(".." + Path6.sep)) {
      relpath = tildePath(filename);
    }
    log_default.info(stdoutStyle.green(`Wrote ${relpath}`));
  }
};
file.writeSync = (filename, data, options) => {
  fs9.writeFileSync(filename, data, options);
};
function sha1(filename, outputEncoding) {
  return new Promise((resolve8, reject) => {
    const reader = fs9.createReadStream(filename);
    const h = crypto.createHash("sha1");
    reader.on("error", reject);
    reader.on("end", () => {
      h.end();
      resolve8(outputEncoding ? h.digest(outputEncoding) : h.digest());
    });
    reader.pipe(h);
  });
}
file.sha1 = sha1;
file.copy = (srcfile, dstfile, failIfExist) => {
  let mode = fs9.constants.COPYFILE_FICLONE;
  if (failIfExist) {
    mode |= fs9.constants.COPYFILE_EXCL;
  }
  fileModificationLogAppend(dstfile);
  return fsp.copyFile(srcfile, dstfile, mode);
};
file.move = (oldfile, newfile) => {
  fileModificationLogAppend(newfile);
  return fsp.rename(oldfile, newfile);
};
file.mkdirs = (dir, mode) => {
  return fsp.mkdir(dir, {recursive: true, mode}).then((s) => !!s && s.length > 0);
};
async function scandir(dir, filter, options) {
  if (!options) {
    options = {};
  }
  if (!fs9.promises || !fs9.promises.opendir) {
    throw new Error(`scandir not implemented for nodejs <12.12.0`);
  }
  const files = [];
  const visited = new Set();
  const maxdepth = options.recursive !== void 0 ? options.recursive ? Infinity : 0 : options.depth !== void 0 ? options.depth : Infinity;
  async function visit(dir2, reldir, depth) {
    if (visited.has(dir2)) {
      return;
    }
    visited.add(dir2);
    const d = await fs9.promises.opendir(dir2);
    for await (const ent of d) {
      let name = ent.name;
      if (ent.isDirectory()) {
        if (maxdepth < depth) {
          await visit(Path6.join(dir2, name), Path6.join(reldir, name), depth + 1);
        }
      } else if (ent.isFile() || ent.isSymbolicLink()) {
        if (filter && filter.test(name)) {
          files.push(Path6.join(reldir, name));
        }
      }
    }
  }
  const dirs = Array.isArray(dir) ? dir : [dir];
  return Promise.all(dirs.map((dir2) => visit(Path6.resolve(dir2), ".", 0))).then(() => files.sort());
}

// src/typeinfo.ts
const esbuild = {
  version: "0.7.7",
  BuildOptions: new Set([
    "sourcemap",
    "format",
    "globalName",
    "target",
    "strict",
    "minify",
    "minifyWhitespace",
    "minifyIdentifiers",
    "minifySyntax",
    "jsxFactory",
    "jsxFragment",
    "define",
    "pure",
    "color",
    "logLevel",
    "errorLimit",
    "bundle",
    "splitting",
    "outfile",
    "metafile",
    "outdir",
    "platform",
    "external",
    "loader",
    "resolveExtensions",
    "mainFields",
    "write",
    "tsconfig",
    "outExtension",
    "entryPoints",
    "stdin"
  ])
};
const estrella = {
  BuildConfig: new Set([
    "entry",
    "debug",
    "watch",
    "cwd",
    "quiet",
    "clear",
    "tslint",
    "onStart",
    "onEnd",
    "outfileMode",
    "run",
    "tsc",
    "tsrules",
    "title"
  ])
};

// src/hash.ts
const crypto2 = __toModule(require("crypto"));
function sha12(input, outputEncoding) {
  const h = crypto2.createHash("sha1").update(input);
  return outputEncoding ? h.digest(outputEncoding) : h.digest();
}

// src/config.ts
const filepath2 = __toModule(require("path"));
function createBuildConfig(userConfig, defaultCwd) {
  let projectID = userConfig.cwd || "?";
  let buildIsCancelled = false;
  let outfileIsTemporary = false;
  let metafileIsTemporary = false;
  function computeProjectID(config3) {
    const projectKey = [config3.cwd, config3.outfile || "", ...Array.isArray(config3.entryPoints) ? config3.entryPoints : config3.entryPoints ? [config3.entryPoints] : []].join(filepath2.delimiter);
    return base36EncodeBuf(sha12(Buffer.from(projectKey, "utf8")));
  }
  const config2 = Object.create({
    get projectID() {
      return projectID;
    },
    updateProjectID() {
      projectID = computeProjectID(config2);
      return projectID;
    },
    get buildIsCancelled() {
      return buildIsCancelled;
    },
    set buildIsCancelled(y) {
      buildIsCancelled = y;
    },
    get outfileIsTemporary() {
      return outfileIsTemporary;
    },
    set outfileIsTemporary(y) {
      outfileIsTemporary = y;
    },
    get metafileIsTemporary() {
      return metafileIsTemporary;
    },
    set metafileIsTemporary(y) {
      metafileIsTemporary = y;
    }
  });
  Object.assign(config2, userConfig);
  config2.cwd = config2.cwd ? filepath2.resolve(config2.cwd) : defaultCwd;
  return config2;
}
function base36EncodeBuf(buf) {
  let s = "";
  for (let i = 0; i < buf.length; i += 4) {
    s += buf.readUInt32LE(i).toString(36);
  }
  return s;
}

// src/estrella.js
const esbuild2 = __toModule(require("esbuild"));
const fs10 = __toModule(require("fs"));
const os4 = __toModule(require("os"));
const Path7 = __toModule(require("path"));
const glob = __toModule(require_miniglob());
const {dirname: dirname7, basename: basename5} = Path7;
const CLI_DOC = {
  usage: "usage: $0 [options]",
  flags: [
    ["-w, watch", "Watch source files for changes and rebuild."],
    ["-g, debug", "Do not optimize and define DEBUG=true."],
    ["-r, run", "Run the output file after a successful build."],
    ["-sourcemap", "Generate sourcemap."],
    ["-inline-sourcemap", "Generate inline sourcemap."],
    ["-no-color", "Disable use of colors."],
    ["-no-clear", "Disable clearing of the screen, regardless of TTY status."],
    ["-no-diag", "Disable TypeScript diagnostics."],
    ["-color", "Color terminal output, regardless of TTY status."],
    ["-diag", "Only run TypeScript diagnostics (no esbuild.)"],
    ["-quiet", "Only log warnings and errors but nothing else."],
    ["-estrella-version", "Print version of estrella and exit 0."],
    ["-estrella-debug", "Enable debug logging of estrella itself."]
  ]
};
const CLI_DOC_STANDALONE = {
  usage: "usage: $0 [options] <srcfile> ...",
  flags: CLI_DOC.flags.concat([
    ["-o, outfile", "Write output to <file> instead of stdout.", "<file>"],
    ["-bundle", "Include all dependencies."],
    ["-minify", "Simplify and compress generated code."],
    ["-outdir", "Write output to <dir> instead of stdout.", "<dir>"],
    ["-esbuild", "Pass arbitrary JSON to esbuild's build function.", "<json>"]
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
};
let cli_ready = Promise.resolve();
let cliopts = {};
let cliargs = [];
const IS_MAIN_CALL = Symbol("IS_MAIN_CALL");
let _setErrorExitCode = false;
function setErrorExitCode(code) {
  if (!_setErrorExitCode) {
    _setErrorExitCode = true;
    let overrideCode = code || 1;
    process.exitCode = overrideCode;
    process.on("exit", (code2) => {
      process.exit(code2 || overrideCode);
    });
  }
}
function processConfig(config2) {
  log_default.debug(() => `input config ${repr(config2)}`);
  if (!config2.entryPoints) {
    config2.entryPoints = [];
  }
  if (config2.entry) {
    if (Array.isArray(config2.entry)) {
      config2.entryPoints = config2.entryPoints.concat(config2.entry);
    } else {
      config2.entryPoints.push(config2.entry);
    }
  }
  delete config2.entry;
  if (config2.entryPoints.length == 0) {
    log_default.debug(() => `missing entryPoints; attempting inference`);
    config2.entryPoints = guessEntryPoints(config2);
    if (config2.entryPoints.length == 0) {
      let msg = getTSConfigForConfig(config2) ? " (could not guess from tsconfig.json)" : "";
      throw new UserError(`config.entryPoints is empty or not set${msg}`);
    }
  }
  if (config2.sourcemap) {
    if (config2.sourcemap != "inline" && config2.sourcemap != "external") {
      config2.sourcemap = true;
    }
  } else {
    config2.sourcemap = false;
  }
  config2.updateProjectID();
  log_default.debug(() => `effective config for project#${config2.projectID}: ${repr(config2)}`);
}
function patchSourceMap(mapfile, overrides) {
  const timeStarted = clock();
  const map = JSON.parse(fs10.readFileSync(mapfile));
  for (let k in overrides) {
    const v = overrides[k];
    if (v === void 0) {
      delete map[k];
    } else {
      map[k] = v;
    }
  }
  fs10.writeFileSync(mapfile, JSON.stringify(map));
  log_default.debug(() => `patched source map ${mapfile} with overrides ${repr(overrides)} (${fmtDuration(clock() - timeStarted)})`);
}
function guessEntryPoints(config2) {
  const tsconfig = getTSConfigForConfig(config2);
  if (tsconfig) {
    log_default.debug(() => `tsconfig file found at ${getTSConfigFileForConfig(config2)}`);
    if (tsconfig.files) {
      return tsconfig.files;
    }
    if (tsconfig.include) {
      let files = [];
      for (let pat of tsconfig.include) {
        log_default.debug(`guessing entry points: glob.glob(${pat}) =>`, glob.glob(pat));
        files = files.concat(glob.glob(pat));
      }
      if (tsconfig.exclude) {
        for (let pat of tsconfig.exclude) {
          files = files.filter((fn) => !glob.match(pat, fn));
        }
      }
      return files.slice(0, 1);
    }
  }
  return [];
}
function esbuildOptionsFromConfig(config2) {
  let esbuildOptions = {};
  let unknownOptions = {};
  const esbuildOptionKeyMap = {
    name: "globalName"
  };
  for (let k of Object.keys(config2)) {
    if (estrella.BuildConfig.has(k)) {
      continue;
    }
    if (!esbuild.BuildOptions.has(k)) {
      unknownOptions[k] = config2[k];
    }
    k = esbuildOptionKeyMap[k] || k;
    esbuildOptions[k] = config2[k];
  }
  if (Object.keys(unknownOptions).length > 0) {
    log_default.info(`Notice: Potentially invalid esbuild.BuildOption(s): ${repr(unknownOptions)}
` + bugReportMessage("guess", json(Object.keys(unknownOptions))));
  }
  return esbuildOptions;
}
let _logInfoOnceRecord = new Set();
function logInfoOnce(...v) {
  if (log_default.level >= log_default.INFO) {
    const k = v.join(" ");
    if (!_logInfoOnceRecord.has(k)) {
      _logInfoOnceRecord.add(k);
      log_default.info(...v);
    }
  }
}
function build2(config2) {
  config2 = createBuildConfig(config2 || {}, config2[IS_MAIN_CALL] ? process.cwd() : process.mainModule && dirname7(process.mainModule.filename) || __dirname);
  const resolver = {resolve() {
  }, reject() {
  }};
  const cancelCallbacks = [];
  function addCancelCallback(f) {
    if (config2.isCancelled) {
      f();
    } else {
      cancelCallbacks.push(f);
    }
  }
  function cancel(reason) {
    if (!config2.isCancelled) {
      log_default.debug(`build cancelled`, {reason});
      config2.isCancelled = true;
      for (let f of cancelCallbacks) {
        f && f();
      }
      cancelCallbacks.length = 0;
      if (reason) {
        resolver.reject(reason);
      } else {
        resolver.resolve();
      }
    }
  }
  let ctx = {
    addCancelCallback,
    buildCounter: 0,
    rebuild() {
      log_default.warn("rebuild() called before initial build completed. Ignoring");
      return Promise.resolve(true);
    }
  };
  const p = cli_ready.then(() => new Promise((resolve8, reject) => {
    if (config2.isCancelled) {
      log_default.debug(`build cancelled immediately`);
      return false;
    }
    resolver.resolve = resolve8;
    resolver.reject = reject;
    build1(config2, ctx).then(resolve8).catch(reject);
  }));
  p.rebuild = () => ctx.rebuild();
  Object.defineProperty(p, "buildCounter", {get() {
    return ctx.buildCounter;
  }});
  p.cancel = cancel;
  return p;
}
async function build1(config2, ctx) {
  const isMainCall = IS_MAIN_CALL in config2;
  delete config2[IS_MAIN_CALL];
  let opts = cliopts, args = cliargs;
  if (config2.run === void 0) {
    config2.run = opts.run;
  }
  if (!isMainCall) {
    processConfig(config2);
  } else {
    if (args.length == 0) {
      const guess = guessEntryPoints(config2);
      log_default.debug(() => `no input files provided; best guess: ${repr(guess)}`);
      if (guess.length == 0) {
        log_default.error(`missing <srcfile> argument (see ${prog} -help)`);
        process.exit(1);
      }
      args.splice(args.length - 1, 0, ...guess);
      const tsconfig = getTSConfigForConfig(config2);
      if (!opts.outfile && !opts.outdir && tsconfig) {
        opts.outfile = tsconfig.outFile;
        if (!opts.outfile) {
          opts.outdir = tsconfig.outDir;
        }
      }
      if (args.length == 0) {
        log_default.error(`missing <srcfile> argument (see ${prog} -help)`);
        process.exit(1);
      }
    }
    if (opts.outfile == "-" || !opts.outfile && !opts.outdir) {
      opts.outfile = "-";
      const projectID = config2.updateProjectID();
      opts.outfile = Path7.join(tmpdir2(), `esbuild.${projectID}.out.js`);
      config2.outfileIsTemporary = true;
    }
    config2.entryPoints = args;
    config2.outfile = opts.outfile || void 0;
    config2.outdir = opts.outdir || void 0;
    config2.bundle = opts.bundle || void 0;
    config2.minify = opts.minify || void 0;
    if (opts.esbuild) {
      const esbuildProps = jsonparse(opts.esbuild, "-esbuild");
      if (!esbuildProps || typeof esbuildProps != "object") {
        log_default.error(`-esbuild needs a JS object, for example '{key:"value"}'. Got ${typeof esbuildProps}.`);
        return false;
      }
      log_default.debug(() => `applying custom esbuild config ${repr(esbuildProps)}`);
      for (let k in esbuildProps) {
        config2[k] = esbuildProps[k];
      }
    }
  }
  const debug2 = config2.debug = opts.debug = !!(opts.debug || config2.debug);
  const quiet = config2.quiet = opts.quiet = !!(opts.quiet || config2.quiet);
  opts.watch = !!(opts.watch || config2.watch);
  if (!config2.watch || typeof config2.watch != "object") {
    config2.watch = opts.watch;
  }
  if (config2.color !== void 0) {
    log_default.colorMode = config2.color;
    stdoutStyle.reconfigure(process.stdout, config2.color);
    stderrStyle.reconfigure(process.stderr, config2.color);
  }
  if (quiet) {
    log_default.level = log_default.WARN;
  }
  config2.sourcemap = opts["inline-sourcemap"] ? "inline" : opts.sourcemap ? true : config2.sourcemap;
  config2.clear = opts["no-clear"] ? false : config2.clear === void 0 ? !!process.stdout.isTTY : config2.clear;
  log_default.debug(() => `project directory ${repr(config2.cwd)} (config.cwd)`);
  if (!config2.title) {
    config2.title = config2.name || tildePath(config2.cwd);
  }
  let tslintOptions = opts.diag === true ? "on" : opts.diag === false ? "off" : "auto";
  if (tslintOptions !== "off") {
    if (config2.tsc !== void 0) {
      log_default.info("the 'tsc' property is deprecated. Please rename to 'tslint'.");
      if (config2.tslint === void 0) {
        config2.tslint = config2.tsc;
      }
    }
    if (config2.tslint && config2.tslint !== "auto") {
      tslintOptions = config2.tslint;
    }
    const tslintIsAuto = tslintOptions === "auto" || typeof tslintOptions == "object" && (config2.tslint.mode === "auto" || !config2.tslint.mode);
    if (tslintIsAuto) {
      if (!getTSConfigFileForConfig(config2)) {
        log_default.debug(() => {
          const dir = tsConfigFileSearchDirForConfig(config2);
          const searchfiles = Array.from(searchTSConfigFile(dir, config2.cwd));
          return `skipping tslint in auto mode since no tsconfig.json file was found in project.
Tried the following filenames:${searchfiles.map((f) => `
  ${tildePath(f)}`)}`;
        });
        tslintOptions = "off";
      }
    } else if (config2.tslint !== void 0 && config2.tslint !== "auto") {
      tslintOptions = config2.tslint;
    }
  }
  if (config2.run) {
    configure(config2);
  }
  let lastClearTime = 0;
  function clear() {
    screen.clear();
    lastClearTime = clock();
  }
  let isInsideCallToUserOnEnd = false;
  const userOnEnd = config2.onEnd;
  let onEnd = userOnEnd ? async (buildResults, defaultReturn) => {
    isInsideCallToUserOnEnd = true;
    let returnValue = void 0;
    try {
      const r = userOnEnd(config2, buildResults, ctx);
      returnValue = r instanceof Promise ? await r : r;
    } catch (err) {
      log_default.debug(() => `error in onEnd handler: ${err.stack || err}`);
      throw err;
    } finally {
      isInsideCallToUserOnEnd = false;
    }
    const ok2 = returnValue === void 0 ? defaultReturn : !!returnValue;
    return ok2;
  } : (_buildResults, ok2) => {
    return ok2;
  };
  function wrapOnEnd(f) {
    let onEndInner = onEnd;
    onEnd = async (buildResults, ok2) => {
      const ok22 = await f(buildResults, ok2);
      if (ok22 !== void 0) {
        ok2 = ok22;
      }
      return onEndInner(buildResults, ok2);
    };
  }
  if (config2.outfileMode && config2.outfile) {
    wrapOnEnd(async (buildResults, ok2) => {
      if (buildResults.errors.length == 0) {
        try {
          chmod2(config2.outfile, config2.outfileMode);
        } catch (err) {
          log_default.error("configuration error: outfileMode: " + err.message);
          setErrorExitCode(1);
        }
      }
    });
  }
  if (config2.outfileIsTemporary && !config2.run) {
    wrapOnEnd(async (buildResults, ok2) => {
      if (buildResults.errors.length == 0) {
        return new Promise((resolve8, reject) => {
          const r = fs10.createReadStream(config2.outfile);
          r.on("end", () => resolve8(ok2));
          r.on("error", reject);
          r.pipe(process.stdout);
        });
      }
    });
  }
  if (config2.watch) {
    wrapOnEnd(async (buildResults, ok2) => {
      logInfoOnce("Watching files for changes...");
    });
  }
  let define2 = {
    DEBUG: debug2,
    ...config2.define || {}
  };
  for (let k in define2) {
    define2[k] = json(define2[k]);
  }
  const esbuildOptions = {
    minify: !debug2,
    sourcemap: config2.sourcemap,
    color: stderrStyle.ncolors > 0,
    ...esbuildOptionsFromConfig(config2),
    define: define2
  };
  if (config2.watch) {
    const projectID = config2.projectID;
    if (!esbuildOptions.outfile && !esbuildOptions.outdir || esbuildOptions.write === false) {
      esbuildOptions.outfile = Path7.join(tmpdir2(), `esbuild.${projectID}.out.js`);
      esbuildOptions.metafile = Path7.join(tmpdir2(), `esbuild.${projectID}.meta.json`);
      config2.outfileIsTemporary = true;
      config2.metafileIsTemporary = true;
      delete esbuildOptions.write;
    } else if (!esbuildOptions.metafile) {
      const outdir = esbuildOptions.outdir || Path7.dirname(esbuildOptions.outfile);
      esbuildOptions.metafile = Path7.join(outdir, `.esbuild.${projectID}.meta.json`);
      config2.metafileIsTemporary = true;
    }
  }
  if (esbuildOptions.metafile) {
    log_default.debug(() => `writing esbuild meta to ${esbuildOptions.metafile}`);
  }
  ctx.rebuild = () => {
    return _esbuild([]).then((ok2) => {
      if (isInsideCallToUserOnEnd) {
        log_default.warn(`waiting for rebuild() inside onEnd handler may cause a deadlock`);
      }
      return ok2;
    });
  };
  let lastBuildResults = {warnings: [], errors: []};
  function onBuildSuccess(timeStart, {warnings}) {
    logWarnings(warnings || []);
    const outfile = config2.outfile;
    const time = fmtDuration(clock() - timeStart);
    if (!outfile) {
      log_default.info(stdoutStyle.green(config2.outdir ? `Wrote to dir ${config2.outdir} (${time})` : `Finished (write=false, ${time})`));
    } else {
      let outname = outfile;
      if (config2.sourcemap && config2.sourcemap != "inline") {
        const ext = Path7.extname(outfile);
        const name = Path7.join(Path7.dirname(outfile), Path7.basename(outfile, ext));
        outname = `${name}.{${ext.substr(1)},${ext.substr(1)}.map}`;
        patchSourceMap(Path7.resolve(config2.cwd, config2.outfile + ".map"), {
          sourcesContent: void 0,
          sourceRoot: Path7.relative(Path7.dirname(config2.outfile), config2.cwd)
        });
      }
      let size = 0;
      try {
        size = fs10.statSync(outfile).size;
      } catch (_) {
      }
      if (!config2.outfileIsTemporary) {
        log_default.info(stdoutStyle.green(`Wrote ${outname}`) + ` (${fmtByteSize(size)}, ${time})`);
      }
    }
    lastBuildResults = {warnings, errors: []};
    return onEnd(lastBuildResults, true);
  }
  function onBuildFail(timeStart, err, options) {
    let warnings = err.warnings || [];
    let errors = err.errors || [];
    let showStackTrace = options && options.showStackTrace;
    if (errors.length == 0) {
      errors.push({
        text: String(showStackTrace && err.stack ? err.stack : err),
        location: null
      });
    }
    logWarnings(warnings);
    lastBuildResults = {warnings, errors};
    return onEnd(lastBuildResults, false);
  }
  async function _esbuild(changedFiles) {
    if (config2.watch && config2.clear) {
      clear();
    }
    if (config2.onStart) {
      try {
        const r = config2.onStart(config2, changedFiles, ctx);
        if (r instanceof Promise) {
          await r;
        }
      } catch (err) {
        log_default.debug(() => `error in onStart handler: ${err.stack || err}`);
        throw err;
      }
    }
    if (config2.isCancelled) {
      return;
    }
    log_default.debug(() => `invoking esbuild.build() in ${process.cwd()} with options: ${repr(esbuildOptions)}`);
    const tmpcwd = process.cwd();
    process.chdir(config2.cwd);
    const esbuildPromise = esbuild2.build(esbuildOptions);
    process.chdir(tmpcwd);
    return esbuildPromise.then(onBuildSuccess.bind(null, clock()), onBuildFail.bind(null, clock()));
  }
  const buildPromise = opts.diag ? null : _esbuild([]);
  const [tslintProcess, tslintProcessReused] = tslintOptions !== "off" ? startTSLint(tslintOptions, opts, config2) : [null, false];
  if (tslintProcess && !tslintProcessReused) {
    tslintProcess.catch((e) => {
      log_default.error(e.stack || String(e));
      return false;
    });
    ctx.addCancelCallback(() => {
      tslintProcess.cancel();
    });
    if (cliopts.diag && config2.watch && config2.clear) {
      screen.clear();
    }
  }
  let ok = true;
  if (buildPromise) {
    log_default.debug("awaiting esbuild");
    ok = await buildPromise;
    if (config2.isCancelled) {
      return false;
    }
  }
  if (config2.watch) {
    let esbuildMeta = {};
    function getESBuildMeta() {
      try {
        esbuildMeta = jsonparseFile(esbuildOptions.metafile);
        if (config2.metafileIsTemporary) {
          log_default.debug(() => `removing temporary esbuild metafile ${esbuildOptions.metafile}`);
          fs10.unlink(esbuildOptions.metafile, () => {
          });
        }
      } catch (err) {
        if (lastBuildResults.errors.length == 0) {
          throw err;
        }
      }
      return esbuildMeta;
    }
    await watch().watchFiles(config2, getESBuildMeta, ctx, (changedFiles) => {
      const filenames = changedFiles.map((f) => Path7.relative(config2.cwd, f));
      const n = changedFiles.length;
      log_default.info(`${n} ${n > 1 ? "files" : "file"} changed: ${filenames.join(", ")}`);
      return _esbuild(changedFiles);
    });
    log_default.debug("fswatch ended");
    return true;
  }
  if (tslintProcess) {
    let tscWaitTimer = null;
    if (!ok) {
      log_default.debug("cancelling eslint since esbuild reported an error");
      tslintProcess.cancel();
    } else {
      log_default.debug("awaiting eslint");
      if (!tslintProcessReused && !opts.diag) {
        tscWaitTimer = setTimeout(() => log_default.info("Waiting for TypeScript... (^C to skip)"), 1e3);
      }
      ok = await tslintProcess.catch(() => false);
    }
    clearTimeout(tscWaitTimer);
  }
  if (!config2.isCancelled && !ok) {
    setErrorExitCode();
  }
  if (ok) {
    const exitCode = await waitAll();
    process.exitCode = exitCode;
  }
  return ok;
}
const tslintProcessCache = new Map();
function startTSLint(tslintOptions, cliopts2, config2) {
  let mode = tslintOptions;
  let tscBasicOptions = {};
  if (tslintOptions && typeof tslintOptions == "object") {
    mode = void 0;
    tscBasicOptions = tslintOptions;
    if (tscBasicOptions.mode == "off") {
      log_default.debug(() => `tslint disabled by tslint config {mode:"off"}`);
      return [null, false];
    }
  }
  if (config2.tsrules && config2.tsrules.length) {
    log_default.info("The 'tsrules' property is deprecated. Please use 'tslint.rules' instead");
    tscBasicOptions.rules = {...config2.tsrules, ...tscBasicOptions.rules};
  }
  const clearScreen = cliopts2.diag && config2.watch && config2.clear;
  const tsconfigFile = getTSConfigFileForConfig(config2);
  const cacheKey = `${tsconfigFile || config2.cwd}`;
  const existingTSLintProcess = tslintProcessCache.get(cacheKey);
  if (existingTSLintProcess) {
    log_default.debug(() => `tslint sharing process (no new process created)`);
    return [existingTSLintProcess, true];
  }
  const options = {
    colors: stdoutStyle.ncolors > 0,
    quiet: config2.quiet,
    mode,
    ...tscBasicOptions,
    watch: config2.watch,
    cwd: config2.cwd,
    clearScreen,
    srcdir: dirname7(config2.entryPoints[0]),
    tsconfigFile,
    onRestart() {
      log_default.debug("tsc restarting");
    }
  };
  log_default.debug(() => `starting tslint with options ${repr(options)}`);
  const tslintProcess = tslint(options);
  tslintProcessCache.set(cacheKey, tslintProcess);
  return [tslintProcess, false];
}
function logWarnings(warnings) {
  if (warnings.length > 0) {
    log_default.warn("[warn] " + warnings.map((m) => m.text).join("\n"));
  }
}
function main() {
  return build2({[IS_MAIN_CALL]: 1}).catch((e) => {
    console.error(stderrStyle.red(prog + ": " + (e ? e.stack || e : "error")));
    const exitCode = process.exitCode || 0;
    process.exit(exitCode > 0 ? exitCode : 1);
  }).then((ok) => {
    const exitCode = process.exitCode || 0;
    process.exit(ok ? exitCode : exitCode > 0 ? exitCode : 1);
  });
}
function postProcessCLIOpts() {
  if (cliopts["no-color"]) {
    cliopts.color = false;
  }
  if (cliopts["no-diag"]) {
    cliopts.diag = false;
  }
  log_default.colorMode = cliopts.color;
  stdoutStyle.reconfigure(process.stdout, cliopts.color);
  stderrStyle.reconfigure(process.stderr, cliopts.color);
  if (cliopts.color !== void 0) {
  }
  if (cliopts["estrella-version"]) {
    console.log(`estrella ${"1.2.5"}${""}`);
    process.exit(0);
  }
  if (cliopts["estrella-debug"]) {
    log_default.level = log_default.DEBUG;
  }
  if (cliopts.diag && cliopts.run) {
    log_default.info(`Disabling -run since -diag is set`);
    cliopts.run = void 0;
  }
  log_default.debug(() => `Parsed initial CLI arguments: ${repr({options: cliopts, args: cliargs}, 2)}`);
}
if (module.id == "." || process.mainModule && basename5(process.mainModule.filename || "") == "estrella.js") {
  ;
  [cliopts, cliargs] = parseopt(process.argv.slice(2), CLI_DOC_STANDALONE);
  postProcessCLIOpts();
  main();
} else {
  ;
  [cliopts, cliargs] = parseopt(process.argv.slice(2), {
    ...CLI_DOC,
    unknownFlagAsArg: true,
    help(flags, _cliopts, _cliargs) {
      cli_ready = new Promise((resolve8) => {
        process.nextTick(() => {
          console.log(fmtUsage(flags, CLI_DOC.usage, CLI_DOC.trailer));
          process.exit(0);
          resolve8();
        });
      });
    }
  });
  postProcessCLIOpts();
  if (cliargs.length > 0) {
    cli_ready.then(() => {
      if (cliargs.length > 0) {
        printUnknownOptionsAndExit(cliargs);
      }
    });
  }
  cliopts.parse = (...flags) => {
    log_default.debug(() => `Parsing custom CLI arguments ${json(cliargs.join)} via cliopts.parse(` + repr(flags) + ")");
    const optsAndArgs = parseopt(cliargs, {
      ...CLI_DOC,
      flags: CLI_DOC.flags.concat(flags)
    });
    log_default.debug(() => `Parsed extra CLI arguments: ` + json({options: optsAndArgs[0], args: optsAndArgs[1]}, 2));
    cliargs.splice(0, cliargs.length);
    return optsAndArgs;
  };
}
function watch2(path, options, cb) {
  return watch().watch(path, options, cb);
}
function legacy_watchdir(path, filter, options, cb) {
  log_default.info(() => `estrella.watchdir is deprecated. Please use estrella.watch instead`);
  if (cb === void 0) {
    if (options === void 0) {
      cb = filter;
      options = {};
    } else {
      cb = options;
      options = {...options, filter};
      if (options.recursive !== void 0) {
        if (!options.recursive) {
          options.depth = 0;
        }
        delete options.recursive;
      }
    }
  }
  return watch2(path, options, cb);
}
let _tsapiInstance = void 0;
module.exports = {
  version: "1.2.5",
  prog,
  cliopts,
  cliargs,
  dirname: dirname7,
  basename: basename5,
  watch: watch2,
  watchdir: legacy_watchdir,
  scandir,
  tslint,
  defaultTSRules,
  termStyle,
  stdoutStyle,
  stderrStyle,
  chmod: file.chmod,
  editFileMode: file.editMode,
  fmtDuration,
  tildePath,
  findInPATH,
  tsconfig: getTSConfigForConfig,
  tsconfigFile: getTSConfigFileForConfig,
  glob: glob.glob,
  globmatch: glob.match,
  file,
  sha1: sha12,
  log: log_default,
  get ts() {
    if (_tsapiInstance === void 0) {
      _tsapiInstance = createTSAPI();
    }
    return _tsapiInstance;
  },
  build: build2
};
//# sourceMappingURL=estrella.js.map
