#!/usr/bin/env node
const { build, cliopts } = require("./dist/estrella")
const pkg = require("./package.json")

build({
  entry: "src/estrella.js",
  outfile: cliopts.debug ? "dist/estrella.g.js" : "dist/estrella.js",
  sourcemap: true,
  outfileMode: "+x",
  target: "node12",
  platform: "node",
  bundle: true,
  external: [ "esbuild", "fsevents" ],
  define: {
    VERSION: pkg.version,
  },
})
