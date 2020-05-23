import * as fs from "fs"
import * as Path from "path"

export function watchdir(dir, filter, options, cb) {
  if (cb === undefined) {
    if (options === undefined) {
      // call form: watchdir(dir, cb)
      cb = filter
      filter = null
    } else {
      // call form: watchdir(dir, filter, cb)
      cb = options
      options = null
    }
  }
  if (!options) { options = {} }
  const latency = options.latency === undefined ? 100 : options.latency
  const recursive = !!options.recursive
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
    // console.log("fsevent", ev, file)
    if (filter && !filter.test(file)) {
      return  // ignored by filter
    }
    changedFiles.add(file)
    if (timer === null) {
      timer = setTimeout(flush, latency)
    }
  }
  let watchers = (Array.isArray(dir) ? dir : [dir]).map(dir =>
    fs.watch(dir, { recursive }, onchange)
  )

  var reject_
  var watchPromise = new Promise((resolve, reject) => {
    reject_ = reject
    Promise.all(watchers.map(w => new Promise((resolve, reject) => {
      w.on("close", resolve)
      w.on("error", reject)
    }))).then(resolve)
  })

  let cancelled = false
  watchPromise.cancel = error => {
    clearTimeout(timer)
    if (!cancelled) {
      cancelled = true
      watchers.map(w => w.close())
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
