
export interface LineParserState {
  readonly line      :string  // current line contents (excluding line break)
  readonly startoffs :number  // current line start offset
  readonly endoffs   :number  // current line end offset (including line break)

  // lineno is the current line number, starting at 1 for the first line.
  // Change this to alter line numbers (e.g. to emulate M4/C's "#line" macro.)
  lineno :number
}

// LineParser reads and yields each line of the input, including line number
// and character range.
// Returns true if at least one line was parsed.
export function* LineParser(input :string) :Generator<LineParserState,boolean> {
  const state :LineParserState = { line: "", lineno: 0, startoffs: 0, endoffs: 0 }
  let re = /(.*)\r?\n/g, m = null
  while (m = re.exec(input)) {
    ;(state as any).line = m[1]
    ;(state as any).startoffs = m.index
    ;(state as any).endoffs = re.lastIndex
    state.lineno++
    yield state
  }
  if (state.endoffs < input.length) {
    // inclue last line which does not end with a line break
    ;(state as any).line = input.substr(state.endoffs)
    ;(state as any).startoffs = state.endoffs
    ;(state as any).endoffs = input.length
    state.lineno++
    yield state
  }
  return state.lineno > 0
}
