import {
  TermStyle as TermStyleAPI,
  TermStyleFun,
  TTYStream,
  NoTTYStream,
} from "../estrella"


export interface TermStyle extends TermStyleAPI {
  _hint :boolean|undefined  // original hint

  // Like calling termStyle but instead of returning a new TermStyle object,
  // the receiver (this) is updated/mutated.
  reconfigure(w :TTYStream|NoTTYStream, hint? :boolean) :TermStyle
}


function numColors(w :TTYStream|NoTTYStream, hint? :boolean) {
  let ncolors = 0
  if (hint === true) {
    // use colors regardless of TTY or not
    let t = process.env.TERM || ""
    ncolors = (
      t && ['xterm','screen','vt100'].some(s => t.indexOf(s) != -1) ? (
        t.indexOf('256color') != -1 ? 8 : 4
      ) : 2
    )
  } else if (hint !== false && w.isTTY) {
    // unless hint is explicitly false, use colors if stdout is a TTY
    ncolors = w.getColorDepth()
  }
  return ncolors
}

type TermStyleFunCons = (open16 :string, open256 :string, close :string) => TermStyleFun


export function termStyle(w :TTYStream|NoTTYStream, hint? :boolean) :TermStyle {
  return createTermStyle(numColors(w, hint), hint)
}


export function createTermStyle(ncolors :number, hint? :boolean) :TermStyle {
  const CODE = (s :string) => `\x1b[${s}m`

  const effect :(open :string, close :string)=>TermStyleFun = (
    ncolors > 0 || hint ? (open, close) => {
      const a = CODE(open), b = CODE(close)
      return s => a + s + b
    } :
    (_) => s => s
  )

  const color :TermStyleFunCons = (

    // 256 colors support
    ncolors >= 8 ? (_open16, open256, close) => {
      // const open = CODE(code), close = CODE('2' + code)
      let a = '\x1b[' + open256 + 'm', b = '\x1b[' + close + 'm'
      return s => a + s + b
    } :

    // 16 colors support
    ncolors > 0 ? (open16, _open256, close) => {
      let a = '\x1b[' + open16 + 'm', b = '\x1b[' + close + 'm'
      return s => a + s + b
    } :

    // no colors
    (_open16, _open256, _close) => s => s
  )

  return {
    _hint: hint,
    ncolors,

    reset     : hint || ncolors > 0 ? "\e[0m" : "",

    bold      : effect('1', '22'),
    italic    : effect('3', '23'),
    underline : effect('4', '24'),
    inverse   : effect('7', '27'),

    // name           16c    256c                 close
    white       : color('37',  '38;2;255;255;255',  '39'),
    grey        : color('90',  '38;5;244',          '39'),
    black       : color('30',  '38;5;16',           '39'),
    blue        : color('34',  '38;5;75',           '39'),
    cyan        : color('36',  '38;5;87',           '39'),
    green       : color('32',  '38;5;84',           '39'),
    magenta     : color('35',  '38;5;213',          '39'),
    purple      : color('35',  '38;5;141',          '39'),
    pink        : color('35',  '38;5;211',          '39'),
    red         : color('31',  '38;2;255;110;80',   '39'),
    yellow      : color('33',  '38;5;227',          '39'),
    lightyellow : color('93',  '38;5;229',          '39'),
    orange      : color('33',  '38;5;215',          '39'),

    reconfigure(w :TTYStream|NoTTYStream, hint? :boolean) :TermStyle {
      const ncolors = numColors(w, hint)
      if (ncolors != this.ncolors && hint != this._hint) {
        Object.assign(this, createTermStyle(ncolors, hint))
      }
      return this
    },

  }
}

export const stdoutStyle = termStyle(process.stdout)
export const stderrStyle = termStyle(process.stderr)
