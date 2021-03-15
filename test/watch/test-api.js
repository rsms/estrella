process.chdir(__dirname)
const { build } = require("estrella")
const fs = require("fs")
const asserteq = require("assert").strictEqual

const verbose = !!parseInt(process.env["ESTRELLA_TEST_VERBOSE"])
const log = verbose ? console.log.bind(console) : ()=>{}
const testInFile = "tmp-in.ts"
const testTSFile = "tsconfig.json"
const testOutFile = "tmp-out.js"

function writeInFile(content) {
  fs.writeFileSync(testInFile, content, "utf8")
}
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
  try { fs.unlinkSync(testInFile) } catch(_) {}
  try { fs.unlinkSync(testOutFile) } catch(_) {}
  try { fs.unlinkSync(testTSFile) } catch(_) {}
})

let resolutionExpected = false

writeInFile("console.log(1);\n")
fs.writeFileSync(testTSFile, `{
  "files":["${testInFile}"],
  "compilerOptions": {}
}`, "utf8")

const buildProcess = build({
  entry: testInFile,
  outfile: testOutFile,
  clear: false,
  watch: true,
  quiet: !verbose,

  onEnd(config, buildResult) {
    asserteq(buildResult.warnings.length, 0)
    asserteq(buildResult.errors.length, 0, JSON.stringify(buildResult.errors))
    assertOutFileContent(/^console\.log\(1\)/)
    setTimeout(() => {
      try {
        writeInFile("console.log(2);\n")

        // stop the build process
        log("calling buildProcess.cancel()")
        resolutionExpected = true
        buildProcess.cancel()

        // at this point all subprocesses should be cancelled by estrella
        // and the node process should exit when the runloop is empty.
        //
        // Give estrella a short amount of time to do this before we consider it
        // stalled:
        const timeout = 2000
        const timer = setTimeout(() => {
          fail(`stalled -- has not exited after being canceled ${timeout/1000}s ago`)
        }, timeout)
        timer.unref() // this takes it out of the "stop from exit" list of node's runloop
        //
        // Note: To verify this test is sound, empty out the cancel() function inside
        // the build() function in src/estrella.js
        //
      } catch (err) {
        fail(err.stack||String(err))
      }
    },100)
  }
})

// console.log({"buildProcess.cancel": buildProcess.cancel.toString()})

// Note: intentionally avoiding using onStart and onEnd to reduce bug surface area

buildProcess.then(result => {
  log(`buildProcess ended with`, {result})
  if (!resolutionExpected) {
    console.error("build() resolved prematurely")
    process.exit(1)
  }
})

buildProcess.catch(fail)


// process.nextTick(() => {
//   writeInFile("console.log(2);\n")
// })
