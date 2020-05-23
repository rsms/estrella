const { build } = require("estrella")
const fs = require("fs")
const assert = require("assert")

process.chdir(__dirname)

const verbose = !!parseInt(process.env["ESTRELLA_TEST_VERBOSE"])
const log = verbose ? console.log.bind(console) : ()=>{}
const testInFile = "tmp-in.js"

function writeInFile(content) {
  fs.writeFileSync(testInFile, content, "utf8")
}

function fail(...msg) {
  console.error(...msg)
  process.exit(1)
}

process.on("exit", code => {
  console.log(code == 0 ? "PASS" : "FAIL")
  try { fs.unlinkSync(testInFile) } catch(_) {}
})


writeInFile("console.log(1);\n")

let expected_changedFiles = []
let testIsDone = false
let onEndCounter = 0

;(async () => {


// --------------------------------------
// first, verify that error handling in callbacks works

const onStartPromise = build({
  entry: testInFile,
  quiet: !verbose,
  onStart(config, changedFiles) { throw new Error("onStart") },
}).catch(err => onStartError = err)

const onEndPromise = build({
  entry: testInFile,
  quiet: !verbose,
  onStart(config, changedFiles) { throw new Error("onEnd") },
}).catch(err => onStartError = err)

// TODO add timeout?
const [ startErr, endErr ] = await Promise.all([ onStartPromise, onEndPromise ])
if (!startErr || startErr.message != "onStart") {
  assert.fail(`did not get expected error onStart`)
}
if (!endErr || endErr.message != "onEnd") {
  assert.fail(`did not get expected error onEnd`)
}
log(`errors in callbacks OK`)

// --------------------------------------
// next, verify that onStart receives the expected input in watch mode

const buildProcess = build({
  entry: testInFile,
  clear: false,
  watch: true,
  quiet: !verbose,
  onStart(config, changedFiles) {
    assert.deepStrictEqual(expected_changedFiles, changedFiles.sort())
    if (testIsDone) {
      assert.equal(onEndCounter, 1, "onEnd called once")
      process.exit(0)
    }
  },
  onEnd(config, result) {
    onEndCounter++
  },
})

buildProcess.catch(err => {
  console.error(`${err.stack||err}`)
  process.exit(1)
})

buildProcess.then(result => {
  console.error("build() resolved prematurely")
  process.exit(1)
})

setTimeout(() => {
  writeInFile("console.log(2);\n")
  expected_changedFiles = [ testInFile ]
  testIsDone = true
},50)

})().catch(err => {
  console.error(`${err.stack||err}`)
  process.exit(1)
})
