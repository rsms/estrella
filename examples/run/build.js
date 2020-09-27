#!/usr/bin/env node
const { build } = require("estrella")

const p = build({
  entry: "main.ts",
  outfile: "out/main.js",
  platform: "node",
  bundle: true,

  // value of run can be...
  // - true to run outfile in node (or whatever js vm runs estrella)
  // - a shell command as a string (must be properly escaped for shell)
  // - direct program & arguments as an array of strings
  run: true,
})
