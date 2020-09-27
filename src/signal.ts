import * as fs from "fs"
import * as os from "os"

export type Signal = NodeJS.Signals
export type SignalsListener = NodeJS.SignalsListener


interface ListenerEntry {
  listeners :Set<SignalsListener>
  rootListener :(sig :Signal)=>void
}

const _listenermap = new Map<Signal,ListenerEntry>()

// addListener registers f to be called upon receiving signal sig.
//
// The semantics of this function is different than process.on(sig, f): The process is always
// terminated after all handlers have been invoked.
//
export function addListener(sig :Signal, f :SignalsListener) {
  // any log messages must be sync since process is about to terminate
  const logerr = (msg :string) => fs.writeSync((process.stderr as any).fd, msg + "\n")

  let ent = _listenermap.get(sig)
  if (ent) {
    ent.listeners.add(f)
  } else {
    const listeners = new Set<SignalsListener>([f])
    const rootListener = (sig :Signal) => {
      // output linebreak after sigint as it is most likely from user pressing ^C in terminal
      if (sig == "SIGINT") {
        fs.writeSync(/*STDOUT*/1, "\n")
      }

      // invoke all listeners
      DEBUG && logerr(`[signal.ts] calling ${listeners.size} registered listeners`)
      try {
        for (let f of listeners) {
          f(sig)
        }
      } catch (err) {
        logerr(`error in signal listener: ${err.stack||err}`)
      }

      // exit process
      process.exit(-(os.constants.signals[sig] || 1))

      // // remove all listeners from process
      // for (let [sig, ent] of _listenermap.entries()) {
      //   process.removeListener(sig, ent.rootListener)
      // }
      // // Signal process again, which will cause a proper "signal" termination.
      // // This may be important for a parent program running estrella.
      // process.kill(process.pid, sig)
    }
    process.on(sig, rootListener)
    _listenermap.set(sig, { rootListener, listeners })
  }
}

export function removeListener(sig :Signal, f :SignalsListener) {
  const ent = _listenermap.get(sig)
  if (ent) {
    ent.listeners.delete(f)
    if (ent.listeners.size == 0) {
      _listenermap.delete(sig)
      process.removeListener(sig, ent.rootListener)
    }
  }
}
