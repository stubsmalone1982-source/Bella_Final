// Bella Project — Clean Stable Build

const canvas = document.getElementById("world");
const gl = canvas.getContext("webgl");
if (!gl) alert("WebGL not supported");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}
resize();
window.addEventListener("resize", resize);

/* ---------------- GLOBAL ---------------- */

let intensity = 0;
let targetIntensity = 0;

let mouse = { x: 0, y: 0 };
let smoothMouse = { x: 0, y: 0 };
let velocity = { x: 0, y: 0 };

let lastMoveTime = 0;
let rippleTime = 0;
let rippleActive = false;

let worldActive = true;
let wordData = [];

/* ---------------- MOUSE ---------------- */

window.addEventListener("mousemove", e => {
  mouse.x = e.clientX / window.innerWidth - 0.5;
  mouse.y = e.clientY / window.innerHeight - 0.5;
  lastMoveTime = performance.now();
});

/* ---------------- SHADERS ---------------- */

const vertexSrc = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentSrc = `
precision mediump float;
varying vec2 vUv;
uniform vec2 uMouse;
uniform float uIntensity;
uniform float uRippleTime;

void main() {

  vec2 uv = vUv;

  vec3 base = vec3(0.06, 0.06, 0.09);

  if (uRippleTime > 0.0) {
    float dist = distance(uv, uMouse + 0.5);
    float radius = min(uRippleTime * 1.2, 0.18);
    float edge = smoothstep(radius - 0.02, radius, dist)
               - smoothstep(radius, radius + 0.02, dist);
    base += vec3(edge * 0.15);
  }

  gl_FragColor = vec4(base, 1.0);
}
`;

/* ---------------- PROGRAM ---------------- */

function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

const program = gl.createProgram();
gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSrc));
gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSrc));
gl.linkProgram(program);
gl.useProgram(program);

const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1,-1, 1,-1, -1,1, 1,1
]), gl.STATIC_DRAW);

const position = gl.getAttribLocation(program, "position");
gl.enableVertexAttribArray(position);
gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

const uMouse = gl.getUniformLocation(program, "uMouse");
const uIntensity = gl.getUniformLocation(program, "uIntensity");
const uRippleTime = gl.getUniformLocation(program, "uRippleTime");

/* ---------------- LOOP ---------------- */

let lastTime = performance.now();

function loop(now) {

  const dt = (now - lastTime) / 1000;
  lastTime = now;

  intensity += (targetIntensity - intensity) * dt * 4;

  const stiffness = 22;
  const damping = 8;

  let forceX = (mouse.x - smoothMouse.x) * stiffness;
  let forceY = (mouse.y - smoothMouse.y) * stiffness;

  velocity.x += forceX * dt;
  velocity.y += forceY * dt;

  velocity.x *= Math.exp(-damping * dt);
  velocity.y *= Math.exp(-damping * dt);

  smoothMouse.x += velocity.x * dt;
  smoothMouse.y += velocity.y * dt;

  if (now - lastMoveTime > 300 && !rippleActive) {
    rippleActive = true;
    rippleTime = 0.001;
  }

  if (rippleActive) {
    rippleTime += dt;
    if (rippleTime > 0.8) {
      rippleActive = false;
      rippleTime = 0;
    }
  }

  gl.uniform2f(uMouse, smoothMouse.x, -smoothMouse.y);
  gl.uniform1f(uIntensity, intensity);
  gl.uniform1f(uRippleTime, rippleTime);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  if (worldActive) {
    wordData.forEach(word => {
      const dx = (mouse.x + 0.5) - word.x;
      const dy = (-mouse.y + 0.5) - word.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const currentRadius = Math.min(rippleTime * 1.2, 0.18);

      if (rippleTime > 0 && dist < currentRadius) {
        word.el.style.opacity = 1;
        word.el.style.filter = "blur(0px)";
      } else {
        word.el.style.opacity = 0;
        word.el.style.filter = "blur(4px)";
      }
    });
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------------- WORD CACHE ---------------- */

window.addEventListener("DOMContentLoaded", () => {
  const words = document.querySelectorAll(".hidden-word");
  wordData = Array.from(words).map(word => {
    const rect = word.getBoundingClientRect();
    return {
      el: word,
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: 1 - ((rect.top + rect.height / 2) / window.innerHeight)
    };
  });

  /* --- CLICK LOGIC --- */

  const wordDisplay = document.getElementById("word-display");

  let wordLock = false;
  let wordsFound = 0;

  words.forEach(word => {
    word.addEventListener("click", () => {

      if (wordLock) return;
      wordLock = true;

      word.style.opacity = 0;
      word.style.pointerEvents = "none";

      wordDisplay.textContent = word.textContent;
      wordDisplay.style.opacity = "1";

      wordsFound++;

      setTimeout(() => {
        wordDisplay.style.opacity = "0";
        wordLock = false;
      }, 1800);

      if (wordsFound === 3) {
        setTimeout(() => {
          worldActive = false;
          startActThree();
        }, 1200);
      }

    });
  });

});

/* ---------------- ACT THREE ---------------- */

function startActThree() {

  const text = document.createElement("div");
  text.style.position = "absolute";
  text.style.top = "50%";
  text.style.left = "50%";
  text.style.transform = "translate(-50%, -50%)";
  text.style.color = "white";
  text.style.fontSize = "32px";
  text.style.fontFamily = "serif";
  text.style.opacity = "0";
  text.style.transition = "opacity 1s ease";
  document.body.appendChild(text);

  text.textContent = "You get quiet.";
  text.style.opacity = "1";

  setTimeout(() => {
    text.style.opacity = "0";
  }, 2000);
}

/* ---------------- PORTAL ---------------- */

window.addEventListener("load", () => {
  const readyText = document.querySelector("#portal h1");
  const button = document.getElementById("enter-btn");

  setTimeout(() => readyText.style.opacity = "1", 700);
  setTimeout(() => button.style.opacity = "1", 1700);
});

const portal = document.getElementById("portal");
const enterBtn = document.getElementById("enter-btn");

enterBtn.addEventListener("click", () => {

  portal.classList.add("collapse");

  setTimeout(() => {
    targetIntensity = 1;
  }, 700);

  setTimeout(() => {
    portal.style.display = "none";
  }, 1200);

});
