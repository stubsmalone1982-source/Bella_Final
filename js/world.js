// World Engine — Bella Project (Stable Zip Baseline + Click Injection)

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

/* ---------------- GLOBAL STATE ---------------- */

let intensity = 0.0;
let targetIntensity = 0.0;

let mouse = { x: 0, y: 0 };
let smoothMouse = { x: 0, y: 0 };
let velocity = { x: 0, y: 0 };

let lastMoveTime = 0;
let rippleTime = 0;
let rippleActive = false;

let worldActive = true;
let wordData = [];

/* ---------------- TEXTURES ---------------- */

function loadTexture(url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA,
    1, 1, 0,
    gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 255])
  );

  const image = new Image();
  image.src = url;

  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      gl.RGBA, gl.UNSIGNED_BYTE,
      image
    );

    const isPowerOf2 = v => (v & (v - 1)) === 0;

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

const damaskTexture = loadTexture("assets/damask.png");
const pentagramTexture = loadTexture("assets/pentagram.png");

/* ---------------- MOUSE ---------------- */

window.addEventListener("mousemove", e => {
  mouse.x = e.clientX / window.innerWidth - 0.5;
  mouse.y = e.clientY / window.innerHeight - 0.5;
  lastMoveTime = performance.now();
});

/* ---------------- INTENSITY ---------------- */

function updateIntensity(dt) {
  const speed = 4.0;
  intensity += (targetIntensity - intensity) * dt * speed;
}

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
uniform float uTime;
uniform float uIntensity;
uniform float uRippleTime;
uniform sampler2D uDamask;
uniform sampler2D uPentagram;

void main() {

  vec2 uv = vUv;

  vec2 damaskOffset = uMouse * 0.004 * uIntensity;
  vec2 glowOffset   = uMouse * 0.007 * uIntensity;
  vec2 pentOffset   = uMouse * 0.01  * uIntensity;

  vec2 damaskUV = uv + damaskOffset;
  vec2 glowUV   = uv + glowOffset;
  vec2 pentUV   = uv + pentOffset;

  if (uRippleTime > 0.0) {
    float dist = distance(uv, uMouse + 0.5);
    float maxRadius = 0.18;
    float radius = min(uRippleTime * 1.2, maxRadius);

    float edge = smoothstep(radius - 0.02, radius, dist)
               - smoothstep(radius, radius + 0.02, dist);

    float ripple = edge * (1.0 - uRippleTime);

    damaskUV += ripple * 0.01 * uIntensity;
    glowUV   += ripple * 0.013 * uIntensity;
    pentUV   += ripple * 0.016 * uIntensity;
  }

  vec3 base = vec3(0.06, 0.06, 0.09);

  vec3 damaskTex = texture2D(uDamask, damaskUV).rgb;
  float damaskLum = dot(damaskTex, vec3(0.299, 0.587, 0.114));
  vec3 damask = vec3(damaskLum) * 0.22;

  vec2 center = vec2(0.5, 0.6);
  float distGlow = distance(glowUV, center);
  float glow = smoothstep(0.7, 0.0, distGlow);
  vec3 plum = vec3(0.16, 0.02, 0.20) * glow * 0.45;

  vec4 pent = texture2D(uPentagram, pentUV);
  float pentStrength = pow(pent.r, 0.6);
  vec3 pentColor = vec3(0.75, 0.75, 0.8) * pentStrength * 0.12;

  vec3 finalColor = base + damask + plum + pentColor;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

/* ---------------- PROGRAM SETUP ---------------- */

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
const uTime = gl.getUniformLocation(program, "uTime");
const uIntensity = gl.getUniformLocation(program, "uIntensity");
const uRippleTime = gl.getUniformLocation(program, "uRippleTime");
const uDamask = gl.getUniformLocation(program, "uDamask");
const uPentagram = gl.getUniformLocation(program, "uPentagram");

gl.uniform1i(uDamask, 0);
gl.uniform1i(uPentagram, 1);

/* ---------------- LOOP ---------------- */

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

window.addEventListener("load", () => {
  const words = document.querySelectorAll(".hidden-word");
  wordData = Array.from(words).map(word => {
    const rect = word.getBoundingClientRect();
    return {
      el: word,
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: 1.0 - ((rect.top + rect.height / 2) / window.innerHeight)
    };
  });

  /* ---------------- WORD CLICK ---------------- */

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
      wordDisplay.style.opacity = 1;

      wordsFound++;

      setTimeout(() => {
        wordDisplay.style.opacity = 0;
        wordLock = false;
      }, 1800);

    });

  });

});
