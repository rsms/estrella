#!/usr/bin/env node
const { build } = require("estrella")

build({
  entry: "main.tsx",
  outfile: "out/app.ts.js",
})

build({
  entry: "main.jsx",
  outfile: "out/app.js.js",
})
