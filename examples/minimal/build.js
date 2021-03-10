#!/usr/bin/env node
// const { build } = require("estrella")
const { build } = require("../../dist/estrella.g.js")
build({
  entry: "main.ts",
  outfile: "out/main.js",
})
