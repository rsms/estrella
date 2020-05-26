#!/usr/bin/env node
const { build, cliopts } = require("./dist/estrella")
const fs = require("fs")

build({
  entry: "src/estrella.js",
  outfile: cliopts.debug ? "dist/estrella.g.js" : "dist/estrella.js",
  sourcemap: true,
  outfileMode: "+x",
  platform: "node",
  bundle: true,
  external: [ "esbuild", "fsevents" ],
  define: {
    VERSION: fs.readFileSync("version.txt", "utf8").trim(),
  },
})
