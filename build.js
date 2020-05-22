#!/usr/bin/env node
const { build, cliopts } = require("./dist/estrella")

build({
  entry: "src/estrella.js",
  outfile: cliopts.debug ? "dist/estrella.g.js" : "dist/estrella.js",
  sourcemap: true,
  outfileMode: "+x",
  platform: "node",
  bundle: true,
  external: [ "esbuild" ],
  define: { VERSION: require("./package.json").version },
})
