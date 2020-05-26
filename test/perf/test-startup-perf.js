const { spawnSync } = require("child_process")
const Path = require("path")
const asserteq = require("assert").strictEqual
const { performance } = require("perf_hooks")

process.chdir(__dirname)

const verbose = !!parseInt(process.env["ESTRELLA_TEST_VERBOSE"])
const clock = () => performance.now()
const estrellajs = Path.resolve(__dirname, "..", "..", "dist", "estrella.js")
const args = [
  estrellajs,
  "-help",
  !verbose && "-quiet",
].filter(v => v)


let maxTime = 1000
let minSamples = 20
let startTime = clock()
let samples = []

while (true) {
  let t = clock()
  const { status } = spawnSync(process.execPath, args, {})
  asserteq(status, 0)
  samples.push(clock() - t)

  if (samples.length >= minSamples && clock() - startTime >= maxTime) {
    break
  }
}

const avg = samples.reduce((a, v) => (a + v)/2)
console.log(`avg startup time: ${fmtDuration(avg)} sampled from ${samples.length} runs`)

function fmtDuration(ms) { // from src/util
  return (
    ms >= 59500 ? (ms/60000).toFixed(0) + "min" :
    ms >= 999.5 ? (ms/1000).toFixed(1) + "s" :
    ms.toFixed(2) + "ms"
  )
}
