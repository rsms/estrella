import { say } from "./say.coffee"

sleep = (ms) ->
  new Promise (resolve) ->
    setTimeout resolve, ms

countdown = (seconds) ->
  for i in [seconds..1]
    say i
    await sleep 100 # wait for a short while
  say "Blastoff!"

countdown 3
