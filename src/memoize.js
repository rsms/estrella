import { json } from "./util"

const memoizeMap = new Map()

export const isMemoized = Symbol("isMemoized")

export function memoize(fn) {
  return function memoizedCall(...args) {
    let k = args.map(json).join("\0")
    if (!memoizeMap.has(k)) {
      const result = fn(...args)
      memoizeMap.set(k, result)
      return result
    }
    let v = memoizeMap.get(k)
    if (v && typeof v == "object") {
      v[isMemoized] = true
    }
    return v
  }
}
