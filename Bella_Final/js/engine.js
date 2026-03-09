
export const Engine = {

sleep(ms){
return new Promise(r=>setTimeout(r,ms))
},

layer(name){
return getComputedStyle(document.documentElement)
.getPropertyValue(name)
}

}
