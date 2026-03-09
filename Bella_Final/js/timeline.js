
import {Engine} from "./engine.js"

export class Timeline{

constructor(){
this.queue=[]
}

wait(ms){
this.queue.push(()=>Engine.sleep(ms))
return this
}

text(el,content){
this.queue.push(async ()=>{
el.classList.remove("fade-in","fade-out")
el.textContent=content
await Engine.sleep(50)
el.classList.add("fade-in")
})
return this
}

fadeOut(el){
this.queue.push(async ()=>{
el.classList.remove("fade-in")
el.classList.add("fade-out")
})
return this
}

async play(){

for(const step of this.queue){
await step()
}

}

}
