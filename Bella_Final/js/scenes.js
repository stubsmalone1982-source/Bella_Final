
import {Engine} from "./engine.js"

export async function playLines(lineEl, lines){

for(let i=0;i<lines.length;i++){

lineEl.classList.remove("fade-in","fade-out")

lineEl.textContent=lines[i]

await Engine.sleep(50)

lineEl.classList.add("fade-in")

await Engine.sleep(2000)

lineEl.classList.remove("fade-in")
lineEl.classList.add("fade-out")

await Engine.sleep(800)

}

}
