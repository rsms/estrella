import * as fs from "fs"
import { PathLike } from "fs"
import * as Path from "path"
import * as crypto from "crypto"
import { chmodp, Modifier as ChModModifier, editFileMode } from "./chmod"
import { clock, tildePath } from "./util"
import { stdoutStyle } from "./termstyle"
import log from "./log"
import { file as filedecl, FileWriteOptions } from "../estrella"

const fsp = fs.promises

// fileModificationLog contains a list of [filename,Date.now()] of files that where
// modified through the API. This data is used by watch.
export const fileModificationLog :{[filename:string]:number} = {}

function fileModificationLogAppend(filename :PathLike) {
  // TODO figure out a way to make it not grow unbounded with variable file names
  fileModificationLog[Path.resolve(String(filename))] = clock()
}

export function fileWasModifiedRecentlyByUser(filename :string) {
  const ageThreshold = 30000
  const time = fileModificationLog[Path.resolve(filename)]
  if (time !== undefined && clock() - time <= ageThreshold) {
    return true
  }
  return false
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


function read(
  filename :PathLike,
  options :{encoding:BufferEncoding, flag?:fs.OpenMode} | BufferEncoding
) :Promise<string>

function read(
  filename :PathLike,
  options :{encoding?:null, flag?:fs.OpenMode} | null
) :Promise<Buffer>

function read(filename :PathLike) :Promise<Buffer>

function read(
  filename :PathLike,
  options? : { encoding? :BufferEncoding|null, flag? :fs.OpenMode }
           | BufferEncoding
           | null
) :Promise<string|Buffer> {
  return fsp.readFile(filename, options)
}

file.read = read

file.stat = fsp.stat

file.mtime = (filename :PathLike) :Promise<number|null> => {
  return fsp.stat(filename).then(st => st.mtimeMs).catch(_ => null)
}

file.readall = (...filenames :PathLike[]) =>
  Promise.all(filenames.map(fn => fsp.readFile(fn)))

file.readallText = (encoding :string|null|undefined, ...filenames :PathLike[]) =>
  Promise.all(filenames.map(fn => fsp.readFile(fn, {
    encoding: (encoding||"utf8") as BufferEncoding
  })))

file.write = (filename :PathLike, data :string|Uint8Array, options? :FileWriteOptions) => {
  fileModificationLogAppend(filename)
  return fsp.writeFile(filename, data, options).then(() => {
    let relpath = Path.relative(process.cwd(), String(filename))
    if (relpath.startsWith(".." + Path.sep)) {
      relpath = tildePath(filename)
    }
    log.info(stdoutStyle.green(`Wrote ${relpath}`))
  })
}

function sha1(filename :PathLike) :Promise<Buffer>
function sha1(filename :PathLike, outputEncoding :"latin1"|"hex"|"base64") :Promise<string>

function sha1(
  filename :PathLike,
  outputEncoding? :crypto.HexBase64Latin1Encoding,
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
