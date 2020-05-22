import * as Path from "path"
import * as fs from "fs"

import { jsonparseFile } from "./util"

const { dirname, basename } = Path


export function findTSC(cwd) {
  let npmPath = ""
  let tmpcwd = process.cwd()
  if (cwd) { process.chdir(cwd) }
  try {
    npmPath = require.resolve("typescript")
  } catch (_) {
  } finally {
    if (cwd) { process.chdir(tmpcwd) }
  }
  if (npmPath) {
    const find = Path.sep + "node_modules" + Path.sep
    let i = npmPath.indexOf(find)
    if (i != -1) {
      return Path.join(npmPath.substr(0, i + find.length - Path.sep.length), ".bin", "tsc")
    }
  }
  // not found in node_modules
  return "tsc"
}


export function findTSConfigFile(dir) {
  // start at dir and search for dir + tsconfig.json,
  // moving to the parent dir until found or until parent dir is the root dir.
  dir = Path.resolve(dir)
  const root = Path.parse(dir).root
  while (true) {
    let path = Path.join(dir, "tsconfig.json")
    if (fs.existsSync(path)) {
      return path
    }
    dir = dirname(dir)
    if (dir == root) {
      // don't search "/"
      break
    }
  }
  return null
}


const TS_CONFIG_FILE = Symbol("TS_CONFIG_FILE")
const TS_CONFIG = Symbol("TS_CONFIG")


export function getTSConfigFileForConfig(config) {
  let file = config[TS_CONFIG_FILE]
  if (file === undefined) {
    if (config.tsc === "off" || config.tsc === false) {
      config[TS_CONFIG_FILE] = file = null
    } else {
      let dir = config.cwd || process.cwd()
      if (config.entryPoints && config.entryPoints.length > 0) {
        // TODO: pick the most specific common denominator dir path of all entryPoints
        dir = Path.resolve(dir, config.entryPoints[0])
      }
      config[TS_CONFIG_FILE] = file = findTSConfigFile(dir)
    }
  }
  return file
}


export function getTSConfigForConfig(config) {
  let tsconfig = config[TS_CONFIG]
  if (tsconfig !== undefined) {
    return tsconfig
  }
  const file = getTSConfigFileForConfig(config)
  if (file) {
    try {
      return config[TS_CONFIG] = jsonparseFile(file)
    } catch(err) {
      if (DEBUG) {
        console.warn(`[tsutil.getTSConfigForConfig] ${err.stack||err}`)
      }
    }
  }
  return config[TS_CONFIG] = null
}

