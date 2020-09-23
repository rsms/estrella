import * as fs from "fs"
import { json } from "./util"

const chr = String.fromCharCode
const ord = (s :string, offs :number) => s.charCodeAt(offs || 0)


export type Modifier = number
                     | string
                     | string[]

// chmod edits mode of a file (synchronous)
// If m is a number, the mode is simply set to m.
// If m is a string or list of strings, the mode is updated using editFileMode.
// Returns the new mode set on file.
export function chmod(file :fs.PathLike, modifier :Modifier) :number {
  if (typeof modifier == "number") {
    fs.chmodSync(file, modifier)
    return modifier
  }
  let mode = fs.statSync(file).mode
  let newMode = editFileMode(mode, modifier)
  if (mode != newMode) {
    fs.chmodSync(file, newMode)
  }
  return newMode
}

// async version of chmod
export function chmodp(file :fs.PathLike, modifier :Modifier) :Promise<number> {
  return new Promise<number>((resolve, reject) => {
    if (typeof modifier == "number") {
      return fs.chmod(file, modifier, err => {
        err ? reject(err) : resolve(modifier)
      })
    }
    fs.stat(file, (err, st) => {
      if (err) return reject(err)
      let newMode = editFileMode(st.mode, modifier)
      if (st.mode == newMode) {
        return resolve(newMode)
      }
      fs.chmod(file, newMode, err => {
        err ? reject(err) : resolve(newMode)
      })
    })
  })
}


// editFileMode takes a file mode (e.g. 0o764), applies modifiers and returns the resulting mode.
// It accepts the same format as the Posix chmod program.
// If multiple modifiers are provided, they are applied to mode in order.
//
// Grammar of modifier format:
//
//   mode   := clause [, clause ...]
//   clause := [who ...] [action ...] action
//   action := op [perm ...]
//   who    := a | u | g | o
//   op     := + | - | =
//   perm   := r | w | x
//
// Examples:
//
//   // Set execute bit for user and group
//   newMode = editFileMode(0o444, "ug+x") // => 0o554
//
//   // Set execute bit for user, write bit for group and remove all access for others
//   newMode = editFileMode(0o444, "+x,g+w,o-") // => 0o560
//
export function editFileMode(mode :number, modifier :string|string[]) :number {
  const expectedFormat = `Expected format: [ugoa]*[+-=][rwx]+`

  const err = (msg :string, m :any) =>
    new Error(`${msg} in modifier ${json(m)}. ${expectedFormat}`)

  let mods :string[] = []
  for (let m of Array.isArray(modifier) ? modifier : [ modifier ]) {
    mods = mods.concat(m.trim().split(/\s*,+\s*/))
  }

  for (let m of mods) {
    let who :number[] = []
    let all = false
    let op = 0
    let perm = 0

    for (let i = 0; i < m.length; i++) {
      let c = ord(m, i)
      if (op == 0) {
        switch (c) {
          case 0x75: // u
          case 0x67: // g
          case 0x6F: // o
            if (!all) {
              who.push(c)
            }
            break
          case 0x61: // a
            who = [ 0x75, 0x67, 0x6F ]
            all = true
            break
          case 0x2B: // +
          case 0x2D: // -
          case 0x3D: // =
            op = c
            break
          default:
            if (op == 0) {
              throw err(`Invalid target or operation ${json(chr(c))}`, m)
            }
            break
        }
      } else {
        switch (c) {
          case 0x72: perm |= 0o4 ; break // r
          case 0x77: perm |= 0o2 ; break // w
          case 0x78: perm |= 0o1 ; break // x
          default: throw err(`Invalid permission ${json(chr(c))}`, m)
        }
      }
    }
    if (op == 0) {
      throw err(`Missing operation`, m)
    }
    if (who.length == 0) {
      who = [ 0x75 ] // u
    }
    if (perm == 0) {
      perm = 0o4 | 0o2 | 0o1
    }

    let mode2 = 0
    for (let w of who) {
      switch (w) {
        case 0x75: mode2 |= (perm << 6) ; break  // u
        case 0x67: mode2 |= (perm << 3) ; break  // g
        case 0x6F: mode2 |= perm        ; break  // o
      }
    }
    switch (op) {
      case 0x2B: mode |= mode2 ; break  // +
      case 0x2D: mode &= ~mode2 ; break // -
      case 0x3D: mode = mode2 ; break   // =
    }
    // For debugging:
    // console.log({
    //   who: who.map(n => '0o' + n.toString(8)),
    //   op: String.fromCharCode(op),
    //   perm: '0o' + perm.toString(8),
    // })
  } // for each m in modifier
  return mode
}


declare const DEBUG :boolean

// lil' unit test for editFileMode
if (DEBUG) {
  const asserteq = require("assert").strictEqual
  const oct = (v :number) => "0o" + v.toString(8).padStart(3, '0')
  //  input, modifiers, expected
  const samples :
    [ number, string[], number ][] = [
    [ 0o444, ["u+r"],   0o444 ],
    [ 0o444, ["u+x"],   0o544 ],
    [ 0o444, ["u+w"],   0o644 ],
    [ 0o444, ["u+wx"],  0o744 ],
    [ 0o444, ["u+rwx"], 0o744 ],
    [ 0o444, ["u+r,u+w,u+x"],    0o744 ],
    [ 0o444, ["u+r", "u+w,u+x"], 0o744 ],
    [ 0o444, ["u+"],    0o744 ], // no perm spec = all

    [ 0o777, ["u-r"],   0o377 ],
    [ 0o777, ["u-wx"],  0o477 ],
    [ 0o777, ["u-w"],   0o577 ],
    [ 0o777, ["u-x"],   0o677 ],
    [ 0o777, ["u-"],    0o077 ],
    [ 0o777, ["u-rwx"], 0o077 ],

    [ 0o444, ["g+r"],   0o444 ],
    [ 0o444, ["g+x"],   0o454 ],
    [ 0o444, ["g+w"],   0o464 ],
    [ 0o444, ["g+wx"],  0o474 ],
    [ 0o444, ["g+rwx"], 0o474 ],
    [ 0o444, ["g+"],    0o474 ],

    [ 0o777, ["g-r"],   0o737 ],
    [ 0o777, ["g-wx"],  0o747 ],
    [ 0o777, ["g-w"],   0o757 ],
    [ 0o777, ["g-x"],   0o767 ],
    [ 0o777, ["g-"],    0o707 ],
    [ 0o777, ["g-rwx"], 0o707 ],

    [ 0o444, ["o+r"],   0o444 ],
    [ 0o444, ["o+x"],   0o445 ],
    [ 0o444, ["o+w"],   0o446 ],
    [ 0o444, ["o+wx"],  0o447 ],
    [ 0o444, ["o+rwx"], 0o447 ],
    [ 0o444, ["o+"],    0o447 ],

    [ 0o777, ["o-r"],   0o773 ],
    [ 0o777, ["o-wx"],  0o774 ],
    [ 0o777, ["o-w"],   0o775 ],
    [ 0o777, ["o-x"],   0o776 ],
    [ 0o777, ["o-"],    0o770 ],
    [ 0o777, ["o-rwx"], 0o770 ],


    [ 0o444, ["ug+r"],   0o444 ],
    [ 0o444, ["ug+x"],   0o554 ],
    [ 0o444, ["ug+w"],   0o664 ],
    [ 0o444, ["ug+wx"],  0o774 ],
    [ 0o444, ["ug+rwx"], 0o774 ],
    [ 0o444, ["ug+"],    0o774 ],

    [ 0o444, ["ugo+r"],   0o444 ],  [ 0o444, ["a+r"],   0o444 ],
    [ 0o444, ["ugo+x"],   0o555 ],  [ 0o444, ["a+x"],   0o555 ],
    [ 0o444, ["ugo+w"],   0o666 ],  [ 0o444, ["a+w"],   0o666 ],
    [ 0o444, ["ugo+wx"],  0o777 ],  [ 0o444, ["a+wx"],  0o777 ],
    [ 0o444, ["ugo+rwx"], 0o777 ],  [ 0o444, ["a+rwx"], 0o777 ],
    [ 0o444, ["ugo+"],    0o777 ],  [ 0o444, ["a+"],    0o777 ],

    [ 0o777, ["ug-r"],   0o337 ],
    [ 0o777, ["ug-wx"],  0o447 ],
    [ 0o777, ["ug-w"],   0o557 ],
    [ 0o777, ["ug-x"],   0o667 ],
    [ 0o777, ["ug-"],    0o007 ],
    [ 0o777, ["ug-rwx"], 0o007 ],

    [ 0o777, ["ugo-r"],   0o333 ],  [ 0o777, ["a-r"],   0o333 ],
    [ 0o777, ["ugo-wx"],  0o444 ],  [ 0o777, ["a-wx"],  0o444 ],
    [ 0o777, ["ugo-w"],   0o555 ],  [ 0o777, ["a-w"],   0o555 ],
    [ 0o777, ["ugo-x"],   0o666 ],  [ 0o777, ["a-x"],   0o666 ],
    [ 0o777, ["ugo-"],    0o000 ],  [ 0o777, ["a-"],    0o000 ],
    [ 0o777, ["ugo-rwx"], 0o000 ],  [ 0o777, ["a-rwx"], 0o000 ],
  ] // samples

  samples.map(([input, mods, expect]) => {
    let actual = editFileMode(input, mods)
    asserteq(actual, expect,
      `editFileMode(${oct(input)}, ${json(mods)}) => ` +
      `${oct(actual)} != expected ${oct(expect)}`
    )
  })
} // end of editFileMode tests
