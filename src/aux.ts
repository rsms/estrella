import * as Path from "path"

import { runtimeRequire } from "./util"
import log from "./log"
import * as debugModule from "./debug/debug"

export type DebugModule = typeof debugModule

let _debugModule : null | DebugModule = null


export function debug() :DebugModule {
  if (!_debugModule) {
    log.debug(`loading debug module`)
    _debugModule = runtimeRequire(Path.join(__dirname, "debug.js"))
  }
  return _debugModule!
}
