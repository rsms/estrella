const fs = require("fs")
const markfile = __filename + ".mark"
if (!fs.existsSync(markfile)) {
  fs.closeSync(fs.openSync(markfile, "w"))
  console.log(`
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Welcome to fun development with Estrella & esbuild!
Create a build.js file to get started. Here's a simple one:

#!/usr/bin/env node
const { build } = require("estrella")
const pkg = require("./package.json")
build({
  entry: "src/main.ts",
  outfile: pkg.main,
})

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`)
}
