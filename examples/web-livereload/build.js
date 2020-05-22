#!/usr/bin/env node
//
// This example builds a module in both debug and release mode.
// See estrella.d.ts for documentation of available options.
// You can also pass any options for esbuild (as defined in esbuild/lib/main.d.ts).
//
const { build, cliopts } = require("estrella")
const Path = require("path")

build({
  outfile: "docs/app.js",
  bundle: true,
  sourcemap: true,
})

// Run a local web server with livereload when -watch is set
cliopts.watch && require("serve-http").createServer({
  port: 8181,
  pubdir: Path.join(__dirname, "docs"),
})
