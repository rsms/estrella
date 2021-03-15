#!/usr/bin/env node
const { build } = require(process.env.ESTRELLA_PROGAM || "../../dist/estrella")

function fail(...msg) {
  console.error(...msg)
  process.exit(1)
}

if ("TEST_OUTPUT_TO_STDOUT" in process.env) {
  // test output to stdout
  build({
    entry: "main.js",
    outfile: "-",
  })
} else {
  // test output to API (onEnd)
  setTimeout(()=>{ fail("timeout") }, 10000)
  build({
    entry: "main.js",
    sourcemap: true,

    // Examples of output configuration: (just use ONE OF THESE)
    // outdir: "out",     // write to directory
    // outfile: "out.js", // write to file
    // outfile: "-",      // write to stdout
    // outfile: "",       // (any falsy value) output to onEnd

    // Setting write:false makes esbuild skip generating code; no output.
    // write: false,

    onEnd(config, result) {
      if (!result.js) {
        // outfile or outdir was set; don't run test
        console.warn("SKIP test since outfile or outdir is set")
        process.exit(0)
        return
      }
      // console.log("result.map:", JSON.parse(result.map))
      if (result.js.trim() != `console.log("a");`) {
        fail("unexpected result.js:", result.js)
      }
      try {
        const map = JSON.parse(result.map)
        if (!map || !map.sources || map.sources.length != 1 || map.sources[0] != "main.js") {
          fail("unexpected sourcemap:", map)
        }
      } catch (err) {
        fail("failed to parse sourcemap as JSON", err, result.map)
      }
      // ok
      process.exit(0)
    }
  })
}
