import * as fs from "fs"
import { PathLike } from "fs"
import * as Path from "path"
import * as crypto from "crypto"
import { chmodp, Modifier as ChModModifier, editFileMode } from "./chmod"
import { clock, tildePath } from "./util"
import { stdoutStyle } from "./termstyle"
import log from "./log"
import { UserError } from "./error"

import { WatchOptions, file as filedecl, FileWriteOptions } from "../estrella.d"


const fsp = fs.promises

// fileModificationLog contains a list of [filename,Date.now()] of files that where
// modified through the API. This data is used by watch.
export const fileModificationLog :{[filename:string]:number} = {}

export function fileModificationLogAppend(filename :PathLike) {
  // TODO figure out a way to make it not grow unbounded with variable file names
  fileModificationLog[Path.resolve(String(filename))] = clock()
}

export function fileWasModifiedRecentlyByUser(filename :string) {
  const ageThreshold = 30000
  const time = fileModificationLog[Path.resolve(filename)]
  return time !== undefined && clock() - time <= ageThreshold
}

// trick to make TypeScript type check our definitions here against those in estrella.d.ts
export const _ts_check_file :typeof filedecl = file


// file() reads all contents of a file (same as file.read)
export function file(filename :PathLike, options :{encoding:string,flag?:string}|string) :Promise<string>
export function file(filename :PathLike, options :{encoding?:null,flag?:string}) :Promise<Buffer>
export function file(filename :PathLike) :Promise<Buffer>
export function file(
  filename: PathLike,
  options? :{encoding?:string|null,flag?:string}|string,
) :Promise<string|Buffer> {
  return fsp.readFile(filename, options as any)
}

file.editMode = editFileMode


file.chmod = (filename :PathLike, modifier :ChModModifier) => {
  fileModificationLogAppend(filename)
  return chmodp(filename, modifier)
}


type ReadOptions = fs.BaseEncodingOptions & { flag?: string | number; }
                 | BufferEncoding
                 | null

function read(
  filename :PathLike,
  options :{encoding:BufferEncoding, flag?:fs.OpenMode} | BufferEncoding
) :Promise<string>
function read(filename :PathLike,
  options :{encoding?:null, flag?:fs.OpenMode} | null
) :Promise<Buffer>
function read(filename :PathLike) :Promise<Buffer>
function read(filename :PathLike, options? :ReadOptions) :Promise<string|Buffer> {
  return fsp.readFile(filename, options)
}
file.read = read


function readSync(
  filename :PathLike,
  options :{encoding:BufferEncoding,flag?:fs.OpenMode} | BufferEncoding
) :string
function readSync(filename :PathLike, options :{encoding?:null,flag?:fs.OpenMode} | null) :Buffer
function readSync(filename :PathLike) :Buffer
function readSync(filename :PathLike, options? :ReadOptions) :string|Buffer {
  // Note: typecast of options since fs type defs for node12 are incorrect: type of flags
  // do not list number, even though the official nodejs documentation does.
  // https://nodejs.org/docs/latest-v12.x/api/fs.html#fs_file_system_flags
  return fs.readFileSync(filename, options as ReadOptions&{flag?: string})
}
file.readSync = readSync


file.stat = fsp.stat


function mtime(filename :PathLike) :Promise<number|null>
function mtime(...filenames :PathLike[]) :Promise<(number|null)[]>
function mtime(...filenames :PathLike[]) :Promise<number|null|(number|null)[]> {
  return Promise.all(filenames.map(filename =>
    fsp.stat(filename).then(st => st.mtimeMs).catch(_ => null)
  )).then(r => r.length == 1 ? r[0] : r)
}
file.mtime = mtime

file.readall = (...filenames :PathLike[]) =>
  Promise.all(filenames.map(fn => fsp.readFile(fn)))

file.readallText = (encoding :string|null|undefined, ...filenames :PathLike[]) =>
  Promise.all(filenames.map(fn => fsp.readFile(fn, {
    encoding: (encoding||"utf8") as BufferEncoding
  })))

file.write = async (filename :PathLike, data :string|Uint8Array, options? :FileWriteOptions) => {
  fileModificationLogAppend(filename)
  const opt = options && typeof options == "object" ? options : {}
  try {
    await fsp.writeFile(filename, data, options)
  } catch (err) {
    if (!opt.mkdirOff && err.code == "ENOENT") {
      await file.mkdirs(Path.dirname(String(filename)), opt.mkdirMode)
      await fsp.writeFile(filename, data, options)
    } else {
      throw err
    }
  }
  if (opt.log) {
    let relpath = Path.relative(process.cwd(), String(filename))
    if (relpath.startsWith(".." + Path.sep)) {
      relpath = tildePath(filename)
    }
    log.info(stdoutStyle.green(`Wrote ${relpath}`))
  }
}

file.writeSync = (filename :PathLike, data :string|Uint8Array, options? :FileWriteOptions) => {
  // See note in readSync regarding the typecast
  fileModificationLogAppend(filename)
  fs.writeFileSync(filename, data, options as fs.WriteFileOptions)
}

function sha1(filename :PathLike) :Promise<Buffer>
function sha1(filename :PathLike, outputEncoding :crypto.BinaryToTextEncoding) :Promise<string>

function sha1(
  filename :PathLike,
  outputEncoding? :crypto.BinaryToTextEncoding,
) :Promise<Buffer|string> {
  return new Promise<Buffer|string>((resolve, reject) => {
    const reader = fs.createReadStream(filename)
    const h = crypto.createHash('sha1')
    reader.on('error', reject)
    reader.on('end', () => {
      h.end()
      resolve(outputEncoding ? h.digest(outputEncoding) : h.digest())
    })
    reader.pipe(h)
  })
}

file.sha1 = sha1

file.copy = (srcfile :PathLike, dstfile :PathLike, failIfExist? :boolean) => {
  let mode = fs.constants.COPYFILE_FICLONE  // copy-on-write (only used if OS supports it)
  if (failIfExist) {
    mode |= fs.constants.COPYFILE_EXCL
  }
  fileModificationLogAppend(dstfile)
  return fsp.copyFile(srcfile, dstfile, mode)
}

file.move = (oldfile :PathLike, newfile :PathLike) => {
  fileModificationLogAppend(newfile)
  return fsp.rename(oldfile, newfile)
}

file.mkdirs = (dir :PathLike, mode? :fs.Mode) :Promise<boolean> => {
  return fsp.mkdir(dir, {recursive:true, mode}).then(s => !!s && s.length > 0)
}


type LegacyWatchOptions = {
  recursive? :boolean
}


export async function scandir(
  dir      :string|string[],
  filter?  :RegExp|null,
  options? :(WatchOptions & LegacyWatchOptions)|null,
) :Promise<string[]> {
  if (!options) { options = {} }
  if (!fs.promises || !fs.promises.opendir) {
    // opendir was added in node 12.12.0
    throw new Error(`scandir not implemented for nodejs <12.12.0`) // TODO
  }
  const files :string[] = []
  const visited = new Set<String>()

  const maxdepth = (
    options.recursive !== undefined ? // legacy option from estrella <=1.1
      options.recursive ? Infinity : 0 :
    options.depth !== undefined ? options.depth :
    Infinity
  )

  async function visit(dir :string, reldir :string, depth :number) {
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
        if (maxdepth < depth) {
          await visit(Path.join(dir, name), Path.join(reldir, name), depth + 1)
        }
      } else if (ent.isFile() || ent.isSymbolicLink()) {
        if (filter && filter.test(name)) {
          files.push(Path.join(reldir, name))
        }
      }
    }
  }

  const dirs = Array.isArray(dir) ? dir : [dir]

  return Promise.all(dirs.map(dir =>
    visit(Path.resolve(dir), ".", 0)
  )).then(() => files.sort())
}
