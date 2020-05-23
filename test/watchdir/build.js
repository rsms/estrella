#!/usr/bin/env node
const { build } = require("estrella")

const p = build({
  entry: "main.js",
  watch: true,
})

// repro what main() does, when run from CLI
p.then(()=> process.exit(0))

process.nextTick(() => {
  console.log("hi")
})
