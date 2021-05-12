// set RUN_SLEEP=seconds to make this process sleep before exiting
const log = console.log.bind(console)
const env = process.env

log(`Hello from a running program ${process.argv[1]}`)
log(`env["ESTRELLA_PATH"] = ${env["ESTRELLA_PATH"]}`)
log(`env["ESTRELLA_VERSION"] = ${env["ESTRELLA_VERSION"]}`)
log(`Hello...`)
console.error(`Hello on stderr`)
setTimeout(() => {
  log(`...world!`)
}, 200)

const sleepsecs = parseFloat(env["RUN_SLEEP"])
if (sleepsecs > 0 && !isNaN(sleepsecs)) {
  log(`waiting ${sleepsecs}s until exiting`)
  setTimeout(() => {}, sleepsecs * 1000)
}
