
function updateClock() {
  const el = document.querySelector("#clock") as HTMLElement
  const now = new Date()
  el.innerText = `Time is now ${now.toLocaleTimeString()}`
}

setInterval(updateClock, 1000)
updateClock()
