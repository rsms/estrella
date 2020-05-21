import * as fs from "fs"
import { json } from "./util"

const fsconstants = fs.constants

const MOD_IRU = fsconstants.S_IRUSR,
      MOD_IWU = fsconstants.S_IWUSR,
      MOD_IXU = fsconstants.S_IXUSR,
      MOD_IRG = fsconstants.S_IRGRP,
      MOD_IWG = fsconstants.S_IWGRP,
      MOD_IXG = fsconstants.S_IXGRP,
      MOD_IRO = fsconstants.S_IROTH,
      MOD_IWO = fsconstants.S_IWOTH,
      MOD_IXO = fsconstants.S_IXOTH;

const chr = String.fromCharCode
const ord = (s, offs) => s.charCodeAt(offs || 0)


export function chmod(file, modifier) {
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


export function editFileMode(mode, modifier) {
  const expectedFormat = `Expected format: [ugoa]*[+-=][rwx]+`
  const err = (msg, m) => new Error(`${msg} in modifier ${json(m)}. ${expectedFormat}`)
  let mods = []
  for (let m of Array.isArray(modifier) ? modifier : [ modifier ]) {
    mods = mods.concat(m.trim().split(/\s*,+\s*/))
  }
  for (let m of mods) {
    let who = []
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


// lil' unit test for editFileMode
if (DEBUG) {
  const asserteq = require("assert").strictEqual
  const oct = v => "0o" + v.toString(8).padStart(3, '0')
  ;[// input, modifiers, expected
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

  ].map(([input, mods, expect]) => {
    let actual = editFileMode(input, mods)
    asserteq(actual, expect,
      `editFileMode(${oct(input)}, ${json(mods)}) => ` +
      `${oct(actual)} != expected ${oct(expect)}`
    )
  })
} // end of editFileMode tests
