console.log("Hello world")

if (process.env["SET_EXIT_CODE"]) {
  process.exit(parseInt(process.env["SET_EXIT_CODE"]))
}
