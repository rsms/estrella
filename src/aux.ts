import * as Path from "path"

import { runtimeRequire } from "./util"
import log from "./log"
import * as debugModule from "./debug/debug"
import * as watchModule from "./watch/watch"

export type DebugModule = typeof debugModule
export type WatchModule = typeof watchModule

// used by tests
let estrellaDir = __dirname
export function setEstrellaDir(dir :string) {
  estrellaDir = dir
}


function createLazyModuleAccessor<T>(filename :string) :()=>T {
  let m : T | null = null
  return function getLazyModule() :T {
    if (!m) {
      log.debug(`loading ${filename} module`)
      m = runtimeRequire(Path.join(estrellaDir, filename))
    }
    return m!
  }
}

export const debug = createLazyModuleAccessor<DebugModule>("debug.js")
export const watch = createLazyModuleAccessor<WatchModule>("watch.js")
