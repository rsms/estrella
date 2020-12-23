import { Writable, Readable } from "stream"
import * as fs from "fs"

import { TYPE } from "./util"
import * as extra from "./extra"


export function isReadableStream(s :Readable|Writable|null|undefined) :s is Readable {
  return s && (s as any).read
}

export function isWritableStream(s :Readable|Writable|null|undefined) :s is Writable {
  return s && (s as any).write
}


export interface Reader extends AsyncIterable<Buffer> {
  // read data with optional size limit.
  //
  // size -- max number of bytes to read.
  //   If size is not given or negative, read everything.
  //   If size is given and the returned buffer's length is smaller than size, then
  //   the stream has ended (EOF.)
  //
  // encoding -- how to decode the data into a string.
  //   If provided, decode the read bytes as `encoding`.
  //   Note that the size parameter always denotes bytes to read, not characters.
  //
  read(size? :number) :Promise<Buffer>
  read(size :number|undefined|null, encoding :BufferEncoding) :Promise<string>
  read(encoding :BufferEncoding) :Promise<string>

  // read chunks as they arrive into the underlying buffer.
  //
  // Example:
  //   for await (const chunk of r) {
  //     console.log(chunk)  // Buffer<48 65 6c 6c 6f>
  //   }
  //
  [Symbol.asyncIterator](): AsyncIterableIterator<Buffer>

  // underlying nodejs stream object
  readonly stream :Readable

  readonly [TYPE] :"Reader"
}

export interface Writer {
  readonly stream :Writable
  readonly [TYPE] :"Writer"
}

export const emptyBuffer = Buffer.allocUnsafe(0)


export function isReader(value :any) :value is Reader {
  return value && typeof value == "object" && value[TYPE] == "Reader"
}

export function isWriter(value :any) :value is Writer {
  return value && typeof value == "object" && value[TYPE] == "Writer"
}

export function createReader(stream? :Readable|null) :Reader {
  return stream ? new StreamReader(stream) : InvalidReader
}

export function createWriter(stream? :Writable|null) :Writer {
  // TODO
  return stream ? {
    [TYPE]: "Writer",
    stream,
  } : InvalidWriter
}

export function createFileReader(filename :string) :Reader {
  return new FileReader(filename)
}


export const InvalidReader = new class implements Reader {
  readonly [TYPE] = "Reader"
  _E() { return new Error("stream not readable") }
  get stream() :Readable { throw this._E() }
  [Symbol.asyncIterator]() :AsyncIterableIterator<Buffer> { throw this._E() }
  read() { return Promise.reject(this._E()) }
}

export const InvalidWriter = new class implements Writer {
  readonly [TYPE] = "Writer"
  _E() { return new Error("stream not writable") }
  get stream() :Writable { throw this._E() }
}

// ------------------------------------------------------------------------------------
// Reader

export class StreamReader implements Reader {
  readonly [TYPE] = "Reader"
  readonly stream :Readable

  _ended = false

  constructor(stream :Readable) {
    this.stream = stream
    stream.pause()  // makes it possible to use read()
    stream.once("end", () => {
      this._ended = true
    })
  }

  [Symbol.asyncIterator]() :AsyncIterableIterator<Buffer> {
    return this.stream[Symbol.asyncIterator]()
  }

  async read(size? :number) :Promise<Buffer>
  async read(size :number|undefined|null, encoding :BufferEncoding) :Promise<string>
  async read(encoding :BufferEncoding) :Promise<string>
  async read(size? :number|null|BufferEncoding, encoding? :BufferEncoding) :Promise<Buffer|string> {
    const stream = this.stream

    // stream must be paused in order to call stream.read()
    stream.pause()

    // stream.read(size) semantics:
    //   if size is undefined:
    //     return any data in the internal buffer
    //     returns null if the internal buffer is empty
    //   else
    //     if size bytes are available
    //       return buffer of that length
    //     else if EOF
    //       return whatever is in the internal buffer
    //     else
    //       return null
    //

    if (typeof size == "string") {
      encoding = size
      size = Number.MAX_SAFE_INTEGER
    } else if (size === undefined || size === null || size < 0) {
      size = Number.MAX_SAFE_INTEGER
    } else if (size == 0) {
      return encoding ? "" : emptyBuffer
    }

    if (stream.readable) {
      // if we are lucky, the requested amount of data is already in the stream's buffer.
      // in the case the stream ended, pass undefined for size which causes this call to return
      // whatever remains in the buffer.
      let buf = stream.read(this._ended ? undefined : size)
      if (buf) {
        return encoding ? buf.toString(encoding) : buf
      }
    }

    // stream ended and there is nothing else to read.
    // Return an empty buffer
    if (this._ended) {
      return encoding ? "" : emptyBuffer
    }

    // data not yet available
    const buffers :Buffer[] = []
    let buffersLen = 0  // accumulative length of `buffers`

    if (stream.readable) {
      const buf = stream.read() // read what is in the buffer
      if (buf) {
        buffers.push(buf)
        buffersLen += buf.length
      }
    }

    // console.log(
    //   `READ 2 awaiting more data`+
    //   ` (has ${buffersLen}, want ${size == Number.MAX_SAFE_INTEGER ? "ALL" : size} bytes)`)

    while (buffersLen < size && !this._ended) {
      await new Promise((resolve, reject) => {
        stream.once('error', reject)
        stream.once('end', resolve)
        stream.once('readable', resolve)
      })

      // read no more than what we need
      let buf = stream.read(size - buffersLen)
      if (!buf) {
        // if that fails it means that the stream's buffer is smaller.
        // retrieve whatever is in the buffer
        buf = stream.read()
      }
      if (buf) {
        buffers.push(buf)
        buffersLen += buf.length
      }
    }

    const buf = joinbufs(buffers)

    return encoding ? buf.toString(encoding) : buf
  }
}


export class FileReader extends StreamReader {
  constructor(filename :string) {
    super(fs.createReadStream(filename))
  }
}


export function joinbufs(bufs :Buffer[], totalLength? :number) :Buffer {
  return (
    bufs.length == 0 ? emptyBuffer :
    bufs.length == 1 ? bufs[0] :
    Buffer.concat(bufs, totalLength)
  )
}


export type WBuf = Buffer[] & _WBuf
interface _WBuf {
  buffer() :Buffer // returns everything added so far as one contiguous byte array
}

export function createWriteBuffer() :WBuf {
  const w = [] as any as WBuf
  let totalLength = 0
  const push = w.push
  w.push = (b :Buffer) => {
    totalLength += b.length
    return push.call(w, b)
  }
  w.buffer = () => {
    return joinbufs(w, totalLength)
  }
  return w
}

// readlines yields line by line while reading from source
export function readlines(source :AsyncIterable<Buffer>) :AsyncGenerator<Buffer,void>
//
export function readlines(
  source :AsyncIterable<Buffer>,
  encoding :BufferEncoding,
) :AsyncGenerator<string,void>
//
export async function* readlines(
  source :AsyncIterable<Buffer>,
  encoding? :BufferEncoding,
) :AsyncGenerator<Buffer|string,void> {
  let bufs :Buffer[] = []
  let bufz = 0

  for await (const data of source) {
    let offs = 0
    while (true) {
      let i = data.indexOf(0x0A, offs)
      if (i == -1) {
        if (offs < data.length - 1) {
          const chunk = data.subarray(offs)
          bufs.push(chunk)
          bufz += chunk.length
        }
        break
      }
      i++
      let buf = data.subarray(offs, i)
      if (bufz > 0) {
        buf = Buffer.concat(bufs.concat(buf), bufz + buf.length)
        bufs.length = 0
        bufz = 0
      }
      yield encoding ? buf.toString(encoding) : buf
      offs = i
    }
  }

  if (bufs.length > 0) {
    // last line does not end with a line break
    const buf = Buffer.concat(bufs, bufz)
    yield encoding ? buf.toString(encoding) : buf
  }
}



// -------------------------------------------------------------------------------

type LibUVErrors = extra.DebugModule["libuv_errors"]

export function errorCodeMsg(errorCode :string) :string {
  const libuv_errors = extra.debug().libuv_errors
  return libuv_errors[errorCode as keyof LibUVErrors] || ""
}
