// World Engine — Bella Project v2
// Phase 1: Canvas + Shader + Motion System

const canvas = document.getElementById("world");
const gl = canvas.getContext("webgl");

if (!gl) {
  alert("WebGL not supported");
}

resize();
window.addEventListener("resize", resize);

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}

/* ---------------------------
   GLOBAL STATE
---------------------------- */

let intensity = 1.0;          // global motion multiplier
let targetIntensity = 1.0;
let mouse = { x: 0, y: 0 };
let smoothMouse = { x: 0, y: 0 };
let lastMoveTime = 0;
let rippleTime = 0;
let rippleActive = false;
let velocity = { x: 0, y: 0 };
let worldActive = true; 

// Texture holders
let damaskTexture;
let pentagramTexture;

function loadTexture(url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // temporary 1px placeholder
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 255])
  );

  const image = new Image();
  image.src = url;
  image.onload = () => {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    image
  );

  const isPowerOf2 = (value) => (value & (value - 1)) === 0;

  if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
    gl.generateMipmap(gl.TEXTURE_2D);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
};

  return texture;
}

// Load assets
damaskTexture = loadTexture("assets/damask.png");
pentagramTexture = loadTexture("assets/pentagram.png");

/* ---------------------------
   MOUSE TRACKING
---------------------------- */

window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX / window.innerWidth - 0.5;
  mouse.y = e.clientY / window.innerHeight - 0.5;
  lastMoveTime = performance.now();
});

/* ---------------------------
   INTENSITY CONTROL
---------------------------- */

export function setIntensity(value) {
  targetIntensity = value;
}

export function freezeWorld() {
  targetIntensity = 0;
}

function updateIntensity(dt) {
  const speed = 4.0; // 400ms ease
  intensity += (targetIntensity - intensity) * dt * speed;
}

/* ---------------------------
   SHADERS
---------------------------- */

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
uniform float uTime;
uniform float uIntensity;
uniform float uRippleTime;

uniform sampler2D uDamask;
uniform sampler2D uPentagram;

void main() {
  vec2 uv = vUv;

  // --- Parallax layers ---
  vec2 damaskOffset = uMouse * 0.004 * uIntensity;
  vec2 glowOffset = uMouse * 0.007 * uIntensity;
  vec2 pentOffset = uMouse * 0.01 * uIntensity;

  vec2 damaskUV = uv + damaskOffset;
  vec2 glowUV = uv + glowOffset;
  vec2 pentUV = uv + pentOffset;

  // --- Ripple distortion ---
if (uRippleTime > 0.0) {

  float dist = distance(uv, uMouse + 0.5);

  // expanding radius over time
  float maxRadius = 0.18;        // how far it can travel
float radius = min(uRippleTime * 1.2, maxRadius);

  // thin moving edge
  float edge = smoothstep(radius - 0.02, radius, dist) 
             - smoothstep(radius, radius + 0.02, dist);

  float ripple = edge * (1.0 - uRippleTime);

  damaskUV += ripple * 0.01 * uIntensity;
  glowUV   += ripple * 0.013 * uIntensity;
  pentUV   += ripple * 0.016 * uIntensity;
}

  // --- Base ---
  vec3 base = vec3(0.06, 0.06, 0.09);

  // --- Damask ---
  vec3 damaskTex = texture2D(uDamask, damaskUV).rgb;
  float damaskLum = dot(damaskTex, vec3(0.299, 0.587, 0.114));
  vec3 damask = vec3(damaskLum) * 0.22;

  // --- Plum Glow ---
  vec2 center = vec2(0.5, 0.6);
  float distGlow = distance(glowUV, center);
  float glow = smoothstep(0.7, 0.0, distGlow);
  vec3 plum = vec3(0.16, 0.02, 0.20) * glow * 0.45;

// --- Pentagram ---
vec4 pent = texture2D(uPentagram, pentUV);

  // lift contrast
  float pentStrength = pow(pent.r, 0.6);

  // soft antique silver tone
  vec3 pentColor = vec3(0.75, 0.75, 0.8) * pentStrength * 0.12;

  vec3 finalColor = base + damask + plum + pentColor;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

/* ---------------------------
   SHADER SETUP
---------------------------- */

function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

const vertexShader = compile(gl.VERTEX_SHADER, vertexSrc);
const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSrc);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

/* ---------------------------
   GEOMETRY
---------------------------- */

const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
  ]),
  gl.STATIC_DRAW
);

const position = gl.getAttribLocation(program, "position");
gl.enableVertexAttribArray(position);
gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

/* ---------------------------
   UNIFORMS
---------------------------- */

const uMouse = gl.getUniformLocation(program, "uMouse");
const uTime = gl.getUniformLocation(program, "uTime");
const uIntensity = gl.getUniformLocation(program, "uIntensity");
const uRippleTime = gl.getUniformLocation(program, "uRippleTime");
const uDamask = gl.getUniformLocation(program, "uDamask");
const uPentagram = gl.getUniformLocation(program, "uPentagram");

gl.uniform1i(uDamask, 0);
gl.uniform1i(uPentagram, 1);

/* ---------------------------
   LOOP
---------------------------- */

let lastTime = performance.now();

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  updateIntensity(dt);

  const stiffness = 22.0;
const damping = 8.0;

let forceX = (mouse.x - smoothMouse.x) * stiffness;
let forceY = (mouse.y - smoothMouse.y) * stiffness;

velocity.x += forceX * dt;
velocity.y += forceY * dt;

velocity.x *= Math.exp(-damping * dt);
velocity.y *= Math.exp(-damping * dt);

smoothMouse.x += velocity.x * dt;
smoothMouse.y += velocity.y * dt;

  // ripple trigger after 300ms pause
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
  gl.uniform1f(uTime, now * 0.001);
  gl.uniform1f(uIntensity, intensity);
  gl.uniform1f(uRippleTime, rippleTime);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, damaskTexture);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, pentagramTexture);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

// --- Hidden word reveal ---
if (worldActive) {

  const words = document.querySelectorAll(".hidden-word");

  words.forEach(word => {
    const rect = word.getBoundingClientRect();

    const wordX = (rect.left + rect.width / 2) / window.innerWidth;
    const wordY_dom = (rect.top + rect.height / 2) / window.innerHeight;
    const wordY_uv = 1.0 - wordY_dom;

    const dx = (mouse.x + 0.5) - wordX;
    const dy = (-mouse.y + 0.5) - wordY_uv;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const currentRadius = Math.min(rippleTime * 1.2, 0.18);

    if (rippleTime > 0 && dist < currentRadius) {
      word.style.opacity = 1;
      word.style.filter = "blur(0px)";
    } else {
      word.style.opacity = 0;
      word.style.filter = "blur(4px)";
    }
  });

}

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// --- Word Click Behavior ---
const words = document.querySelectorAll(".hidden-word");
const wordDisplay = document.getElementById("word-display");

let wordLock = false;
let wordsFound = 0;

words.forEach(word => {
  word.addEventListener("click", () => {

    if (wordLock) return;
    wordLock = true;

    // hide clicked word permanently
    word.style.opacity = 0;
    word.style.pointerEvents = "none";
    wordsFound++;
    if (wordsFound === 3) worldActive = false;

    // show in top center
    wordDisplay.textContent = word.textContent;
    wordDisplay.style.opacity = 1;

    // fade out after 1.8s
    setTimeout(() => {
      wordDisplay.style.opacity = 0;
    }, 1800);

    // unlock after fade
    setTimeout(() => {
      wordLock = false;
    }, 2200);

    if (wordsFound === 3) {
  setTimeout(() => {
    beginNarrative();
  }, 1000);
}

function beginNarrative() {

  worldActive = false;
  targetIntensity = 0;

  // fade canvas out
  canvas.style.transition = "opacity 1.5s ease";
  canvas.style.opacity = 0;

  // hide any remaining hidden words
  document.querySelectorAll(".hidden-word").forEach(word => {
    word.style.opacity = 0;
  });

  // after fade, start text sequence
  setTimeout(() => {
    startTextSequence();
  }, 1500);
}

function startTextSequence() {

  const text = document.createElement("div");
  text.id = "narrative-text";
  text.style.position = "absolute";
  text.style.top = "50%";
  text.style.left = "50%";
  text.style.transform = "translate(-50%, -50%)";
  text.style.color = "rgba(255,255,255,0.9)";
  text.style.fontSize = "32px";
  text.style.fontFamily = "serif";
  text.style.opacity = 0;
  text.style.transition = "opacity 1s ease";

  document.body.appendChild(text);

  const lines = [
    "I know that look.",
    "You're having fun...",
    "So...",
    "...are we behaving?"
  ];

  let i = 0;

  function nextLine() {
    if (i >= lines.length) {
  showSteering();
  return;
}

    text.textContent = lines[i];
    text.style.opacity = 1;

    setTimeout(() => {
  text.style.opacity = 0;
  setTimeout(() => {
    i++;
    nextLine();
  }, 1200);
}, 2000);
  }

  nextLine();
}

function showSteering() {

  const container = document.createElement("div");
  container.id = "steering";

  container.style.position = "absolute";
  container.style.top = "60%";
  container.style.left = "50%";
  container.style.transform = "translateX(-50%)";
  container.style.display = "flex";
  container.style.gap = "40px";
  container.style.opacity = "0";
  container.style.transition = "opacity 1s ease";

  const yes = document.createElement("button");
  const no = document.createElement("button");

  yes.textContent = "Yes";
  no.textContent = "No";

  [yes, no].forEach(btn => {
    btn.style.background = "transparent";
    btn.style.border = "1px solid rgba(220,220,230,0.6)";
    btn.style.color = "rgba(220,220,230,0.9)";
    btn.style.padding = "10px 28px";
    btn.style.fontSize = "18px";
    btn.style.cursor = "pointer";
    btn.style.transition = "all 0.3s ease";
  });

  yes.onmouseenter = () => yes.style.boxShadow = "0 0 12px rgba(150,0,255,0.4)";
  yes.onmouseleave = () => yes.style.boxShadow = "none";

  no.onmouseenter = () => no.style.boxShadow = "0 0 12px rgba(150,0,255,0.4)";
  no.onmouseleave = () => no.style.boxShadow = "none";

  container.appendChild(yes);
  container.appendChild(no);
  document.body.appendChild(container);

  setTimeout(() => {
    container.style.opacity = "1";
  }, 100);

  yes.onclick = () => handleChoice("yes", container);
  no.onclick = () => handleChoice("no", container);
}

function handleChoice(choice, container) {

  container.remove();

  const text = document.getElementById("narrative-text");

  setTimeout(() => {

    if (choice === "yes") {
      text.textContent = "Oh really.";
    } else {
      text.textContent = "I thought so.";
    }

    text.style.opacity = "1";

    document.getElementById("steering")?.remove();

    setTimeout(() => {
      text.style.opacity = "0";

      setTimeout(() => {
        text.textContent = "Then you should follow me...";
        text.style.opacity = "1";

        setTimeout(() => {
          text.style.opacity = "0";

          setTimeout(() => {
            text.textContent = "...to the end of the journey.";
            text.style.opacity = "1";
          }, 800);

        }, 2000);

      }, 800);

    }, 2000);

  }, 800);
}

  });
});
