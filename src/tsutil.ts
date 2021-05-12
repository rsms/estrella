import * as Path from "path"
import * as fs from "fs"
import { CompilerOptions } from "typescript"

import { jsonparseFile, isWindows } from "./util"
import { BuildConfig as BuildConfigPub } from "../estrella.d"
import log from "./log"

const TS_CONFIG_FILE = Symbol("TS_CONFIG_FILE")
const TS_CONFIG = Symbol("TS_CONFIG")

type BuildConfig = BuildConfigPub & {
  [TS_CONFIG]?      :CompilerOptions|null
  [TS_CONFIG_FILE]? :string|null
}

const { dirname, basename } = Path


export function findTSC(cwd :string) :string {
  let npmPath = ""
  let tmpcwd = process.cwd()
  const exe = isWindows ? "tsc.cmd" : "tsc"
  if (cwd) {
    process.chdir(cwd)
  }
  try {
    npmPath = require.resolve("typescript")
  } catch (_) {}
  if (cwd) {
    process.chdir(tmpcwd)
  }
  if (npmPath) {
    const find = Path.sep + "node_modules" + Path.sep
    let i = npmPath.indexOf(find)
    if (i != -1) {
      return Path.join(npmPath.substr(0, i + find.length - Path.sep.length), ".bin", exe)
    }
  }
  // not found in node_modules
  return exe
}


export function findTSConfigFile(dir :string, maxParentDir? :string) :string|null {
  for (let path of searchTSConfigFile(dir, maxParentDir)) {
    try {
      const st = fs.statSync(path)
      if (st.isFile()) {
        return path
      }
    } catch(_) {}
  }
  return null
}


export function* searchTSConfigFile(dir :string, maxParentDir? :string) :Generator<string> {
  // start at dir and search for dir + tsconfig.json,
  // moving to the parent dir until found or until parent dir is the root dir.
  // If maxParentDir is set, then stop when reaching directory maxParentDir.
  dir = Path.resolve(dir)
  const root = Path.parse(dir).root
  maxParentDir = maxParentDir ? Path.resolve(maxParentDir) : root
  while (true) {
    yield Path.join(dir, "tsconfig.json")
    if (dir == maxParentDir) {
      // stop. this was the last dir we were asked to search
      break
    }
    dir = dirname(dir)
    if (dir == root) {
      // don't search "/"
      break
    }
  }
}


export function tsConfigFileSearchDirForConfig(config :BuildConfig) :string {
  let dir = config.cwd || process.cwd()
  if (config.entryPoints && Object.keys(config.entryPoints).length > 0) {
    // TODO: pick the most specific common denominator dir path of all entryPoints
    let firstEntryPoint = ""
    if (Array.isArray(config.entryPoints)) {
      firstEntryPoint = config.entryPoints[0]
    } else { // entryPoints is an object {outfile:infile}
      for (let outfile of Object.keys(config.entryPoints)) {
        firstEntryPoint = config.entryPoints[outfile]
        break
      }
    }
    dir = Path.resolve(dir, Path.dirname(firstEntryPoint))
  }
  return dir
}


export function getTSConfigFileForConfig(config :BuildConfig) :string|null {
  let file = config[TS_CONFIG_FILE]
  if (file === undefined) {
    if (
      config.tslint === "off" || config.tslint === false ||
      config.tsc === "off" || config.tsc === false
    ) {
      file = null
    } else {
      let dir = tsConfigFileSearchDirForConfig(config)
      file = findTSConfigFile(dir, config.cwd)
    }
    Object.defineProperty(config, TS_CONFIG_FILE, { value: file })
  }
  return file
}


export function getTSConfigForConfig(config :BuildConfig) :CompilerOptions|null {
  let tsconfig = config[TS_CONFIG]
  if (tsconfig === undefined) {
    const file = getTSConfigFileForConfig(config)
    if (file) try {
      tsconfig = jsonparseFile(file)
    } catch(err) {
      log.warn(()=> `failed to parse ${file}: ${err.stack||err}`)
    }
    if (!tsconfig) {
      tsconfig = null
    }
    Object.defineProperty(config, TS_CONFIG, { value: tsconfig })
  }
  return tsconfig
}

