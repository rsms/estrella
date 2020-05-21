import { A, B } from "./foo"

// DEBUG is true with -debug set in estrella, otherwise false.
declare const DEBUG :boolean

async function main() {
  console.log(A(B, 4))
  if (DEBUG) {
    console.log("Running in debug mode")
  }
}

main()
