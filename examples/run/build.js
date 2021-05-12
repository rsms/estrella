#!/usr/bin/env node
const { build } = require("estrella")

const p = build({
  entry: "main.ts",
  outfile: "out/main.js",
  platform: "node",
  bundle: true,

  // The following demonstrates that the onEnd function is run before the
  // program or command is executed. This allows you to do things like move
  // files around before running a program.
  async onEnd() {
    console.log("user onEnd begin")
    await new Promise(r => setTimeout(r, 200))
    console.log("user onEnd done")
  },

  // value of run can be...
  // - true to run outfile in node (or whatever js vm runs estrella)
  // - a shell command as a string (must be properly escaped for shell)
  // - direct program & arguments as an array of strings
  // This can also be specified on the command line (-run)
  run: true,
})
