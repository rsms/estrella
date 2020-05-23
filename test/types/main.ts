import { build, BuildConfig, CancellablePromise } from "estrella"
function mybuild(config :BuildConfig) {
  const r :CancellablePromise<boolean> = build(config)
  r.cancel()
}
mybuild({ entryPoints:["main.ts"] })
