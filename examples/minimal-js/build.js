#!/usr/bin/env node
const { build } = require("estrella")
build({
  entry: "main.js",
  outfile: "out/main.js",
  tslint: { format: "short" }
})
