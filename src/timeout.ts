export function createTimeout<T>(
  promise         :Promise<T>,
  timeout         :number,
  rejectOnTimeout :(e:Error)=>void,
) :Promise<T> {
  const timeoutTimer = setTimeout(() => {
    const e = new Error("timeout")
    e.name = "Timeout"
    rejectOnTimeout(e)
  }, timeout)
  return promise.then(r => {
    clearTimeout(timeoutTimer)
    return r
  }, e => {
    clearTimeout(timeoutTimer)
    throw e
  })
}
