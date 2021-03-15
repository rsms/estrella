import * as Path from "path"

import { runtimeRequire } from "./util"
import { log, LogLevel } from "./log"
import * as file from "./file"
import * as debugModule from "./debug/debug"
import * as watchModule from "./watch/watch"

export type DebugModule = typeof debugModule
export type WatchModule = typeof watchModule

type FileModule = typeof file

interface AuxModule {
  initModule(logLevel :LogLevel, file :FileModule) :void
}

// used by tests
let estrellaDir = __dirname
export function setEstrellaDir(dir :string) {
  estrellaDir = dir
}


function createLazyModuleAccessor<T extends AuxModule>(filename :string) :()=>T {
  let m : T | null = null
  return function getLazyModule() :T {
    if (!m) {
      log.debug(`loading ${filename} module`)
      m = runtimeRequire(Path.join(estrellaDir, filename))
      m!.initModule(log.level, file)
    }
    return m!
  }
}

export const debug = createLazyModuleAccessor<DebugModule>(DEBUG ? "debug.g.js" : "debug.js")
export const watch = createLazyModuleAccessor<WatchModule>(DEBUG ? "watch.g.js" : "watch.js")
