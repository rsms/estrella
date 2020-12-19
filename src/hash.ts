import * as crypto from "crypto"

export type StringEncoding = crypto.BinaryToTextEncoding
export type InputData      = string | NodeJS.ArrayBufferView

export function sha1(input :InputData) :Buffer
export function sha1(input :InputData, outputEncoding :StringEncoding) :string

export function sha1(input :InputData, outputEncoding? :StringEncoding) :Buffer|string {
  const h = crypto.createHash('sha1').update(input)
  return outputEncoding ? h.digest(outputEncoding) : h.digest()
}
