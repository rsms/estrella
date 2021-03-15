//
// This tests the file watcher's ability to track files as they are renamed,
// including rewiring renamed entryPoint entries.
//
process.chdir(__dirname)
const { build } = require("estrella")
const fs = require("fs")
const asserteq = require("assert").strictEqual

const verbose = !!parseInt(process.env["ESTRELLA_TEST_VERBOSE"])
const log = verbose ? console.log.bind(console) : ()=>{}
const repr = require("util").inspect
const testInFile1 = "tmp-in.ts"
const testInFile2 = "tmp-in-renamed.ts"
const testOutFile = "tmp-out.js"

function readOutFile() {
  return fs.readFileSync(testOutFile, "utf8")
}

function fail(...msg) {
  console.error(...msg)
  process.exit(1)
}

function assertOutFileContent(regexp) {
  if (!regexp.test(readOutFile())) {
    fail("unexpected outfile contents:", {content:readOutFile(), regexp})
  }
}

process.on("exit", code => {
  console.log(code == 0 ? "PASS" : "FAIL")
  try { fs.unlinkSync(testInFile1) } catch(_) {}
  try { fs.unlinkSync(testInFile2) } catch(_) {}
  try { fs.unlinkSync(testOutFile) } catch(_) {}
})

// -------------------------------------------------------------------------------

// Give estrella a short amount of time to do this before we consider it stalled
const stallTimeout = 1000
let resolutionExpected = false

fs.writeFileSync(testInFile1, "console.log(1);\n", "utf8")

let step = 1
let timeoutTimer = null

const buildProcess = build({
  entry: testInFile1,
  outfile: testOutFile,
  clear: false,
  watch: true,
  quiet: !verbose,
  onEnd(config, buildResult) {
    //assertOutFileContent(/^console\.log\(1\)/)
    setTimeout(() => {
      log(`~~~~~~~~~~~ step ${step} ~~~~~~~~~~~`)
      switch (step++) {
        case 1:
          log(`moving file ${repr(testInFile1)} -> ${repr(testInFile2)}`)
          fs.renameSync(testInFile1, testInFile2)
          break
        case 2:
          log(`writing to ${repr(testInFile2)}`)
          fs.writeFileSync(testInFile2, "console.log(2);\n", "utf8")
          break
        default: // DONE
          clearTimeout(timeoutTimer)
          resolutionExpected = true
          buildProcess.cancel()
          break
      }
      // (re)set stall timer
      clearTimeout(timeoutTimer)
      timeoutTimer = setTimeout(() => {
        fail(`stalled -- no progress during the past ${stallTimeout/1000}s`)
      }, stallTimeout)
      timeoutTimer.unref() // this takes it out of the "stop from exit" list of node's runloop
    },100)
  }
})

buildProcess.then(ok => {
  log(`buildProcess ended`, {ok})
  if (!resolutionExpected) {
    console.error("buildProcess ended prematurely")
    process.exit(1)
  } else {
    process.exit(ok ? 0 : 1)
  }
})

buildProcess.catch(fail)
