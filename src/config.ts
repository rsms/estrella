import * as filepath from "path"
import { sha1 } from "./hash"
import { BuildConfig as UserBuildConfig } from "../estrella.d"


export interface BuildConfig extends UserBuildConfig {
  // unique but stable ID of the build, used for temp files and caching
  readonly projectID :string

  // true if the build is cancelled (BuildProcess.cancel() was called)
  buildIsCancelled :boolean

  // true if outfile is a temporary file
  outfileIsTemporary :boolean
}

export function createBuildConfig(userConfig :UserBuildConfig) :BuildConfig {
  let projectID = ""
  let buildIsCancelled = false
  let outfileIsTemporary = false

  const config :BuildConfig = Object.create({
    // unique but stable ID of the build, used for temp files and caching
    get projectID() :string {
      if (!projectID) {
        const projectKey = [config.cwd, config.outfile||"", ...(
          Array.isArray(config.entryPoints) ? config.entryPoints :
          config.entryPoints ? [config.entryPoints] :
          []
        )].join(filepath.delimiter)
        projectID = base36EncodeBuf(sha1(Buffer.from(projectKey, "utf8")))
      }
      return projectID
    },

    get buildIsCancelled() :boolean { return buildIsCancelled },
    set buildIsCancelled(y :boolean) { buildIsCancelled = y },

    get outfileIsTemporary() :boolean { return outfileIsTemporary },
    set outfileIsTemporary(y :boolean) { outfileIsTemporary = y },
  })

  Object.assign(config, userConfig)

  return config
}


function base36EncodeBuf(buf :Buffer) {
  let s = ""
  for (let i = 0; i < buf.length; i += 4) {
    s += buf.readUInt32LE(i).toString(36)
  }
  return s
}
