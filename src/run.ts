import { BuildConfig } from "../estrella"
import log from "./log"

export function configure(config :BuildConfig) {
  if (!config.run) {
    return
  }
  log.debug("run.configure")
  console.log("TODO config")
}
