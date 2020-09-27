import * as Path from "path"

import { runtimeRequire } from "./util"
import log from "./log"
import * as debugModule from "./debug/debug"

export type DebugModule = typeof debugModule

let _debugModule : null | DebugModule = null

// used by tests
let estrellaDir = __dirname
export function setEstrellaDir(dir :string) {
  estrellaDir = dir
}


export function debug() :DebugModule {
  if (!_debugModule) {
    log.debug(`loading debug module`)
    _debugModule = runtimeRequire(Path.join(estrellaDir, "debug.js"))
  }
  return _debugModule!
}
