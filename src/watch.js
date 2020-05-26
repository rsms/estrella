import * as fs from "fs"
import * as Path from "path"
import * as chokidar from "chokidar"



export function watch(path, options, cb) {
  if (cb === undefined) { // call form: watch(path, cb)
    cb = options
    options = undefined
  }
  options = {
    // Defaults
    persistent: true,
    ignoreInitial: true,
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    disableGlobbing: true,
    followSymlinks: false,

    // user override
    ...(options || {})
  }

  // extract non-chokidar options
  const latency = options.latency === undefined ? 100 : options.latency
  delete options.latency
  const filter = options.filter === undefined ? /\.[tj]s$/ : options.filter
  delete options.filter

  const changedFiles = new Set()
  let timer = null

  function flush() {
    timer = null
    const p = cb(Array.from(changedFiles))
    changedFiles.clear()
    if (p instanceof Promise) {
      // pause dispatch (just enqueue) until resolved
      p.then(() => {
        timer = null
        if (changedFiles.size > 0) {
          flush()
        }
      }).catch(err => {
        watchPromise.cancel(err)
      })
      timer = 1 // this prevent flushing
    }
  }

  const onchange = (ev, file) => {
    // console.log("watch/onchange", ev, file)
    if (filter && !filter.test(file)) {
      return  // ignored by filter
    }
    changedFiles.add(file)
    if (timer === null) {
      timer = setTimeout(flush, latency)
    }
  }

  // Initialize chokidar watcher.
  // arg0: path; file, dir, glob, or array
  const watcher = chokidar.watch(path, options);

  // Something to use when events are received.
  const log = console.log.bind(console);
  // Add event listeners.
  watcher
    .on('all', onchange)
    .on('error', error => log(`Watcher error: ${error}`))
    .on('ready', () => log('Initial scan complete. Ready for changes'))

  var reject_, resolve_
  var watchPromise = new Promise((resolve, reject) => {
    resolve_ = resolve
    reject_ = reject
  })

  let cancelled = false
  watchPromise.cancel = error => {
    clearTimeout(timer)
    if (!cancelled) {
      cancelled = true
      watcher.close().then(resolve_).catch(reject_)
    }
    if (error) {
      reject_(error)
    }
  }

  return watchPromise
}


// scandir(
//   dir      :string|string[],
//   filter?  :RegExp|null,
//   options? :WatchOptions|null,
// ) :Promise<string[]>
export async function scandir(dir, filter, options) {
  if (!options) { options = {} }
  if (!fs.promises || !fs.promises.opendir) {
    // opendir was added in node 12.12.0
    throw new Error(`not implemented for nodejs <12.12.0`) // TODO
  }
  const files = []
  const basedir = dir
  const visited = new Set()
  async function visit(dir, reldir) {
    if (visited.has(dir)) {
      // cycle
      return
    }
    visited.add(dir)
    const d = await fs.promises.opendir(dir)
    // Note: d.close() is called implicitly by the iterator/generator
    for await (const ent of d) {
      let name = ent.name
      if (ent.isDirectory()) {
        if (options.recursive) {
          await visit(Path.join(dir, name), Path.join(reldir, name))
        }
      } else if (ent.isFile() || ent.isSymbolicLink()) {
        if (filter && filter.test(name)) {
          files.push(Path.join(reldir, name))
        }
      }
    }
  }
  return visit(Path.resolve(dir), ".").then(() => files.sort())
}
