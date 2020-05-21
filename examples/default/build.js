#!/usr/bin/env node
//
// This example builds a module in both debug and release mode.
// See estrella.d.ts for documentation of available options.
// You can also pass any options for esbuild (as defined in esbuild/lib/main.d.ts).
//
const { build, cliopts } = require("estrella")

// config shared by products
const baseConfig = {
  entry: "src/main.ts",
  bundle: true,

  // Examples of TypeScript diagnostic code rules:
  // tsrules: { 6133: "IGNORE" }, // uncomment this to silence the TS6133 warning
  // tsrules: { 6133: "ERROR" }, // uncomment this to cause build to fail with an error
}

build({ ...baseConfig,
  outfile: "out/foo.js",
  sourcemap: true,
})

build({ ...baseConfig,
  outfile: "out/foo.debug.js",
  sourcemap: "inline",
  debug: true,
})
