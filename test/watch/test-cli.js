const { spawn } = require("child_process")
const fs = require("fs")
const asserteq = require("assert").strictEqual

process.chdir(__dirname)

const verbose = !!parseInt(process.env["ESTRELLA_TEST_VERBOSE"])
const log = verbose ? console.log.bind(console) : ()=>{}
const testInFile = "tmp-in.js"
const testOutFile = "tmp-out.js"

function writeInFile(content) {
  fs.writeFileSync(testInFile, content, "utf8")
}
function readOutFile() {
  return fs.readFileSync(testOutFile, "utf8")
}

writeInFile("console.log(1);\n")

const command = process.env["$ESTRELLA_PROGAM"] || "./node_modules/estrella/dist/estrella.js"
const args = ["-watch", "-no-clear", "-o", testOutFile, testInFile]
log("spawn", command, args.join(" "))

const p = spawn(command, args, {
  cwd: __dirname,
  stdio: ['inherit', 'pipe', 'inherit'],
})

let step = 1
let expectedExit = false

setTimeout(() => {
  fail("timeout")
}, 5000)

p.stdout.on('data', (data) => {
  if (verbose) {
    process.stdout.write(">>")
    process.stdout.write(data)
  }
  const s = data.toString("utf8")

  function assertStdout(re) {
    if (re.test(s)) {
      step++
    } else {
      return fail("unexpected stdout data:", {s})
    }
  }

  switch (step) {

  case 1:
    assertStdout(/^Wrote /i)
    break

  case 2:
    assertStdout(/(?:^|\n)Watching files for changes/i)
    // note: nodejs fs.watch has some amount real-time delay between invoking fs.watch and the
    // file system actually being watched.
    // To work around this, we sleep for a long enough time so that it is very likely to work.
    setTimeout(()=>{
      assertOutFileContent(/^\"use strict\";console\.log\(1\)/)
      writeInFile("console.log(2)")
    },20)
    break

  case 3:
    assertStdout(/file changed/i)
    break

  case 4:
    assertStdout(/^Wrote /i)
    assertOutFileContent(/^\"use strict\";console\.log\(2\)/)
    expectedExit = true
    process.exit(0)
    break

  default:
    fail(`test step ${step} ??`)
  }
})

p.on('exit', code => {
  if (!expectedExit) {
    console.log(`estrella subprocess exited prematurely with code ${code}`)
    process.exit(1)
  }
})

process.on("exit", code => {
  console.log(code == 0 ? "PASS" : "FAIL")
  try { fs.unlinkSync(testInFile) } catch(_) {}
  try { fs.unlinkSync(testOutFile) } catch(_) {}
  try { p.kill() } catch(_) {}
})

function fail(...msg) {
  console.error(...msg)
  process.exit(1)
}

function assertOutFileContent(regexp) {
  if (!regexp.test(readOutFile())) {
    fail("unexpected outfile contents:", {content:readOutFile(), regexp})
  }
}
