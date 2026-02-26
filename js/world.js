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

void main() {
  vec2 center = vec2(0.5, 0.45);
  vec2 uv = vUv;

  // --- Parallax (subtle, max under 3px equivalent) ---
  uv += uMouse * 0.01 * uIntensity;

  // --- Plum radial glow ---
  float dist = distance(uv, center);
  float glow = smoothstep(0.7, 0.0, dist);
  vec3 plum = vec3(0.22, 0.0, 0.25) * glow * 0.6;

  // --- Ripple distortion (very low amplitude) ---
  if (uRippleTime > 0.0) {
    float rippleDist = distance(uv, uMouse + 0.5);
    float ripple = sin(rippleDist * 40.0 - uRippleTime * 4.0) * 0.002;
    uv += ripple * uIntensity;
  }

  vec3 base = vec3(0.055, 0.055, 0.07);

  gl_FragColor = vec4(base + plum, 1.0);
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

/* ---------------------------
   LOOP
---------------------------- */

let lastTime = performance.now();

function loop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  updateIntensity(dt);

  // smooth mouse
  smoothMouse.x += (mouse.x - smoothMouse.x) * dt * 6;
  smoothMouse.y += (mouse.y - smoothMouse.y) * dt * 6;

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

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
