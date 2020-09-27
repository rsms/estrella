#!/usr/bin/env node
const { build } = require("../../dist/estrella.g")

const p = build({
  entry: "main.ts",
  outfile: "out/main.js",
  bundle: true,
  platform: "node",
  run: true,
})
