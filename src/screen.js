const stdoutIsTTY = !!process.stdout.isTTY
    , stderrIsTTY = !!process.stderr.isTTY

export const screen = {
  width: 60,
  height: 20,
  clear() {},
  banner(ch) {
    if (!ch) { ch = "-" }
    return ch.repeat(Math.floor((screen.width - 1) / ch.length))
  },
}

if (stdoutIsTTY || stderrIsTTY) {
  const ws = (stdoutIsTTY && process.stdout) || process.stderr
  const updateScreenSize = () => {
    screen.width = ws.columns
    screen.height = ws.rows
  }
  ws.on("resize", updateScreenSize)
  updateScreenSize()
  screen.clear = () => {
    // "\x1bc" -- clear bottom
    // "\x1b[2J" -- clear top (leaves empty lines in backscroll in some cases)
    ws.write("\x1bc")
  }
  // Note: we can clear past rows relatively using these two functions:
  // ws.moveCursor(0, -4)
  // ws.clearScreenDown()
}
