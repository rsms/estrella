#!/usr/bin/env node
const { build } = require("estrella")
build({
  entry: "test-cmd.ts",
  outfile: "test-cmd.js",
  bundle: true,
  platform: "node",
})
