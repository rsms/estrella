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
    // Note: \ec is reported to not work on the KDE console Konsole.
    // TODO: detect KDE Konsole and use \e[2J instead
    // Clear display: "\x1bc"
    // Clear Screen: \x1b[{n}J clears the screen
    //   n=0 clears from cursor until end of screen
    //   n=1 clears from cursor to beginning of screen
    //   n=2 clears entire screen
    ws.write("\x1bc")
  }
  // Note: we can clear past rows relatively using these two functions:
  // ws.moveCursor(0, -4)
  // ws.clearScreenDown()
}
