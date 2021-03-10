#!/usr/bin/env node
const { build } = require("estrella")
build({
  entry: "main.ts",
  outfile: "out/main.js",
})
