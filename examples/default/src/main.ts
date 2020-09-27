import { A, B } from "./foo"
import { C } from "./c"
console.log(C)

// DEBUG is true with -debug set in estrella, otherwise false.
declare const DEBUG :boolean

async function main() {
  console.log(A(B, 4))
  if (DEBUG) {
    console.log("Running in debug mode")
  }
}

main()
