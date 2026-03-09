
const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

const portal = document.getElementById("portal");
const enterBtn = document.getElementById("enter-btn");

const wordEls = Array.from(document.querySelectorAll(".hidden-word"));
const wordDisplay = document.getElementById("word-display");

const ambience = document.getElementById("bg-ambience");

let currentPhase = "act2";

let width, height;
let mouseX = 0;
let mouseY = 0;
let intensity = 1;

let rippleActive = false;
let rippleX = 0;
let rippleY = 0;
let rippleStart = 0;
let currentRippleRadius = 0;

let rippleTimeout = null;
let showWordTimeout = null;
let wordDisplayActive = false;

let phase = 0;
let gravityShift = 0;
let phase2TextStarted = false;

let blackOverlay = null;
let stillnessGracePeriod = false;
let stillnessActive = false;
let stillnessTimer = null;
let stillnessStage = 0;
const STILLNESS_DURATION = 3000;

const damask = new Image();
damask.src = "../assets/damask.png";

const watermark = new Image();
watermark.src = "../assets/pentagram.png";

const giggle = new Audio("assets/giggle.wav");
const benVoice = new Audio("assets/Ben.wav");

giggle.volume = 0.45;
benVoice.volume = 0.65;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

/**
 * WORD STATE
 */
const words = wordEls.map(el => ({
  el,
  locked: false,
  visible: false
}));

function showWord(text) {
  wordDisplayActive = true;

  wordDisplay.textContent = text;
  wordDisplay.style.opacity = 1;

  if (showWordTimeout) clearTimeout(showWordTimeout);

  showWordTimeout = setTimeout(() => {
    wordDisplay.style.opacity = 0;
    wordDisplayActive = false; // unlock clicking
  }, 1500);
}

function allWordsFound() {
  return words.every(w => w.locked);
}

function endWordHunt() {
  phase = 2;

  rippleActive = false;
  rippleTimeout = null;
  intensity = 0.5;
  console.log("END WORD HUNT");
}

/*** INPUT: mouse move → start idle timer → trigger ripple at last position*/ 
document.addEventListener("mousemove", (e) => {

  if (phase !== 1) return; 

   mouseX = e.clientX;
   mouseY = e.clientY;

  if (rippleTimeout) clearTimeout(rippleTimeout);

  rippleTimeout = setTimeout(() => {
    rippleActive = true;
    rippleX = mouseX;
    rippleY = mouseY;
    rippleStart = performance.now();
  }, 300);
});

words.forEach(w => {
  w.el.addEventListener("click", () => {
    // Only allow click if currently visible and not already locked
    if (w.locked || wordDisplayActive) return;

    w.locked = true;
    w.el.style.display = "none"; // keep it visible permanently

    showWord(w.el.textContent);

    if (allWordsFound()) {
      endWordHunt();
    }
  });
});

function drawBackground() {
  ctx.clearRect(0, 0, width, height);

  let centerX = width / 2;
  let centerY = height * 0.7;

  if (phase === 2) {
    // Smooth easing toward new center
    gravityShift += 0.15;   // this was too small before

    if (gravityShift > 1) gravityShift = 1;

    if (gravityShift === 1 && !phase2TextStarted) {
    startPhase2Text();
    phase2TextStarted = true;
    }

    centerX = width / 2 + gravityShift * 220;
    centerY = height * 0.7 - gravityShift * 140;
  }

  const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    width
  );

  const pulse = Math.sin(performance.now() * 0.0015) * 0.04;

  gradient.addColorStop(0, `rgba(80,40,160,${0.55 * intensity + pulse})`);
  gradient.addColorStop(0.40, `rgba(40,14,90,${0.45 * intensity})`);
  gradient.addColorStop(0.92, "rgba(5,5,9,1)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawDamask() {

  if (!damask.complete) return;

  const offsetX = (mouseX - width / 2) * 0.02 * intensity;
  const offsetY = (mouseY - height / 2) * 0.02 * intensity;

  const scale = 0.32; // adjust this to control pattern size

  const patternWidth = damask.width * scale;
  const patternHeight = damask.height * scale;

  ctx.save();

  ctx.globalAlpha = 0.1;

  ctx.translate(offsetX % patternWidth, offsetY % patternHeight);

  for (let x = -patternWidth; x < width + patternWidth; x += patternWidth) {
    for (let y = -patternHeight; y < height + patternHeight; y += patternHeight) {

      ctx.drawImage(
        damask,
        x,
        y,
        patternWidth,
        patternHeight
      );

    }
  }

  ctx.restore();

}

function drawWatermark() {
  if (!watermark.complete) return;

  const offsetX = (mouseX - width / 2) * 0.04 * intensity;
  const offsetY = (mouseY - height / 2) * 0.04 * intensity;

  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.translate(offsetX, offsetY);
  ctx.drawImage(watermark, width / 2 - 300, height / 2 - 300, 600, 600);
  ctx.restore();
}

function updateRipple(time) {
  if (!rippleActive) {
    currentRippleRadius = 0;
    return;
  }

  const elapsed = time - rippleStart;
  const duration = 700;

  if (elapsed >= duration) {
    rippleActive = false;
    currentRippleRadius = 0;
    console.log("Ripple ended");
    return;
  }

  const maxRadius = 120;
  const progress = elapsed / duration;
  const eased = 1 - Math.pow(1 - progress, 3); 
  currentRippleRadius = eased * maxRadius;
  }

  function drawRipple() {
  if (!rippleActive || currentRippleRadius <= 0) return;

  const band = 60;

  const outer = currentRippleRadius;
  const inner = outer - band;

  // Prevent invalid gradient values
  if (inner < 0 || outer <= 0 || inner >= outer) return;

  ctx.save();
  ctx.globalAlpha = 0.28;

  const g = ctx.createRadialGradient(
    rippleX, rippleY, inner,
    rippleX, rippleY, outer
  );

  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.5, "rgba(150,110,255,0.25)");
  g.addColorStop(0.7, "rgba(200,160,255,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(rippleX, rippleY, outer, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function updateWordReveal() {
  if (!rippleActive) {
    // If no ripple, hide any non-locked words
    words.forEach(w => {
      if (!w.locked) {
        w.visible = false;
        w.el.classList.remove("visible");
      }
    });
    return;
  }

  const radius = currentRippleRadius;
  const band = 20; // reveal band thickness

  words.forEach(w => {
    if (w.locked) {
      w.visible = true;
      w.el.classList.add("visible");
      return;
    }

    const rect = w.el.getBoundingClientRect();
    const wordX = rect.left + rect.width / 2;
    const wordY = rect.top + rect.height / 2;

    const dx = wordX - rippleX;
    const dy = wordY - rippleY;
    const dist = Math.hypot(dx, dy);

    // Spatial, radius-based reveal: visible only when the wave reaches it
    const hit = Math.abs(dist - radius) <= band;

    w.visible = hit;

    if (hit) w.el.classList.add("visible");
    else w.el.classList.remove("visible");
  });
}

function animate(time) {
  drawBackground();
  drawDamask();
  drawWatermark();

  updateRipple(time);
  drawRipple();

  updateWordReveal();

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

/* Portal */
window.addEventListener("load", () => {

  // Fade in Ready slowly
  setTimeout(() => {
    document.querySelector("#portal h1").style.opacity = 1;
  }, 1200);

  // After Ready fully fades in, pause slightly, then fade button
  setTimeout(() => {
    enterBtn.style.opacity = 1;
  }, 3000); // 400 + 2200 fade duration
});

enterBtn.addEventListener("click", () => {

  if (ambience) {
  ambience.volume = 0.35;
  ambience.play().catch(() => {});
  }

  // world starts immediately
  phase = 1;
  intensity = 1;

  portal.classList.add("collapse");

  setTimeout(() => {
    portal.style.display = "none";
  }, 2600);

});

function startPhase2Text() {

  const textLines = [
    "I know that look.",
    "You’re having fun…",
    "So…",
    "…are we behaving?"
  ];

  let index = 0;

  function showNextLine() {

    wordDisplay.textContent = textLines[index];
    wordDisplay.style.opacity = 1;

    setTimeout(() => {

      wordDisplay.style.opacity = 0;

      if (index === textLines.length - 1) {

        // Fade text out first
        wordDisplay.style.opacity = 0;

        // After fade completes, THEN show choices
        setTimeout(() => {
          showChoices();
        }, 900); // match your fade duration

        return;
      }

      setTimeout(() => {
        index++;
        showNextLine();
      }, 900);

    }, 1800);
  }

  showNextLine();
}

function showChoices() {

  const choiceContainer = document.createElement("div");
  choiceContainer.id = "choice-container";
  choiceContainer.style.position = "absolute";
  choiceContainer.style.top = "60%";
  choiceContainer.style.left = "50%";
  choiceContainer.style.transform = "translateX(-50%)";
  choiceContainer.style.color = "white";
  choiceContainer.style.opacity = "0";
  choiceContainer.style.transition = "opacity 0.6s ease";

  const yes = document.createElement("span");
  yes.textContent = "Yes";
  yes.style.margin = "0 40px";
  yes.style.cursor = "pointer";
  yes.style.fontSize = "42px";
  yes.style.letterSpacing = "1px";
  yes.onmouseenter = () => {
  yes.style.textShadow =
    "0 8px 26px rgba(180,140,255,0.65), 0 0 18px rgba(180,140,255,0.55)";
  };yes.onmouseleave = () => {
  yes.style.textShadow =
    "0 6px 18px rgba(160,120,255,0.35), 0 0 10px rgba(160,120,255,0.25)";
  };

  const no = document.createElement("span");
  no.textContent = "No";
  no.style.margin = "0 40px";
  no.style.cursor = "pointer";
  no.style.fontSize = "42px";
  no.style.letterSpacing = "1px";
  no.onmouseenter = () => {
  no.style.textShadow =
    "0 8px 26px rgba(180,140,255,0.65), 0 0 18px rgba(180,140,255,0.55)";
  };
  no.onmouseleave = () => {
  no.style.textShadow =
    "0 6px 18px rgba(160,120,255,0.35), 0 0 10px rgba(160,120,255,0.25)";
};

  choiceContainer.appendChild(yes);
  choiceContainer.appendChild(no);
  document.body.appendChild(choiceContainer);

  // Fade in
  requestAnimationFrame(() => {
    choiceContainer.style.opacity = "1";
  });

  // Click handlers
  yes.onclick = () => handleChoice("yes");
  no.onclick = () => handleChoice("no");
}

function handleChoice(selection) {

  const container = document.getElementById("choice-container");
  if (!container) return;

  container.style.opacity = "0";

  setTimeout(() => {

    container.remove();

    setTimeout(() => {

      if (selection === "yes") {
        showResponse("Oh really.");
      } else {
        showResponse("I thought so.");
      }

    }, 400);

  }, 500);
}

function showResponse(text) {

  wordDisplay.textContent = text;
  wordDisplay.style.opacity = 1;

  setTimeout(() => {

    wordDisplay.style.opacity = 0;

    setTimeout(() => {
      showConvergence();
    }, 700);

  }, 1400);
}

function showConvergence() {

  wordDisplay.textContent = "Then you should follow me.";
  wordDisplay.style.opacity = 1;

  setTimeout(() => {

    wordDisplay.style.opacity = 0;

    setTimeout(() => {
      startConvergence();
    }, 800);

  }, 1800);
}

function fadeToBlack(callback) {

  console.log("Fade started");

  const blackOverlay = document.createElement("div");
  blackOverlay.style.position = "fixed";
  blackOverlay.style.top = "0";
  blackOverlay.style.left = "0";
  blackOverlay.style.width = "100%";
  blackOverlay.style.height = "100%";
  blackOverlay.style.background = "black";
  blackOverlay.style.opacity = "0";
  blackOverlay.style.transition = "opacity 1.5s ease";
  blackOverlay.style.pointerEvents = "none";
  blackOverlay.style.zIndex = "8";

  document.body.appendChild(blackOverlay);

  // Trigger fade
  requestAnimationFrame(() => {
    blackOverlay.style.opacity = "1";
  });

  // After fade completes, run callback
  setTimeout(() => {
    console.log("Fade finished — running callback");

    if (typeof callback === "function") {
      callback();
    }

    blackOverlay.remove(); // <-- add this
  }, 1000); // slightly longer than CSS transition
}

function startConvergence() {

  const overlay = document.createElement("div");

  overlay.style.position = "fixed";
  overlay.style.inset = "0"; 
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "9";

 
  overlay.style.background =
  "radial-gradient(circle at center, rgba(0,0,0,0) 78%, rgba(0,0,0,0.35) 90%)";

  overlay.style.transition = "background 5.2s ease";

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {

    overlay.style.background =
      "radial-gradient(circle at center, rgba(0,0,0,0) 3%, rgba(0,0,0,0.98) 40%)";

  });

  setTimeout(() => {

    overlay.remove();
    startStillnessGate();

  }, 5200);

}

function startStillnessGate() {

  console.log("still start")

  stillnessActive = true;
  stillnessStage = 0;

  // Grace period starts
  stillnessGracePeriod = true;

  console.log("grace")

  setTimeout(() => {
    stillnessGracePeriod = false;
  }, 300); // 300ms buffer

  wordDisplay.textContent = "Hold still.";
  wordDisplay.style.opacity = 1;

  beginStillnessTimer();
}

function beginStillnessTimer() {

  clearTimeout(stillnessTimer);

  stillnessTimer = setTimeout(() => {
    stillnessSuccess();
  }, STILLNESS_DURATION);
}

function stillnessSuccess() {

  console.log("stillsuccess");

  stillnessActive = false;

  wordDisplay.textContent = "Good Girl";
  wordDisplay.style.opacity = 1;
  
  setTimeout(() => {
    wordDisplay.style.opacity = 0;

    setTimeout(() => {
      startActThreeTransition();
    }, 800); // match fade-out duration

  }, 1600);
}

document.addEventListener("mousemove", () => {

  if (!stillnessActive || stillnessGracePeriod) return;

  clearTimeout(stillnessTimer);

  stillnessStage = Math.min(stillnessStage + 1, 5);

    if (stillnessStage === 1) {
      wordDisplay.textContent = "Don't move.";
    } 
    else if (stillnessStage === 2) {
      wordDisplay.textContent = "I'm adding a tally to the column.";
    }
    else if (stillnessStage >= 3) {
      wordDisplay.textContent = "You're doing that on purpose.";
    }

    stillnessActive = false; // temporarily disable movement detection

    setTimeout(() => {
      stillnessActive = true;
      beginStillnessTimer();
    }, 1000); // 1 second warning pause
} );

/* ======================================= */
/* ACT III TRANSITION + SEQUENCE */
/* ======================================= */

function startActThreeTransition() {

  console.log("act3 running");

  const worldCanvas = document.getElementById("world");
  const act3Container = document.getElementById("act3-container");
  const wrapper = document.getElementById("portrait-wrapper");
  const textBox = document.getElementById("act3-text");
  const line = document.getElementById("act3-line");
  const frame = document.querySelector(".frame-overlay");
  const buttons = document.querySelectorAll(".choice-btn");

  const FADE_IN = 1200;
  const FADE_OUT = 800;
  const LINGER = 1200;

  const act3Lines = [
    "You get quiet.",
    "You tilt your head.",
    "You bite your finger…"
  ];

  let index = 0;

  worldCanvas.style.display = "none";
  act3Container.classList.add("active");

  setTimeout(() => {
    beginActThreeSequence();
  }, FADE_IN);

  function beginActThreeSequence() {

    // Force first narration line to top
    textBox.classList.remove("text-bottom");
    textBox.classList.add("text-top");

    index = 0;
    showLine();
  }

  function showLine() {

    console.log("showLine running", index);

    // Hard reset classes every cycle
    line.classList.remove("fade-in", "fade-out");

    line.textContent = act3Lines[index];
    line.style.opacity = 1;

    requestAnimationFrame(() => {
    line.classList.add("fade-in");
    });

    const visibleDuration = FADE_IN + LINGER;

    setTimeout(() => {

      line.classList.remove("fade-in");
      line.classList.add("fade-out");
      line.style.opacity = 0;

      setTimeout(() => {

        index++;

        if (index === 1) {

          wrapper.classList.add("enter");

          // After first line finishes, move narration to bottom
          textBox.classList.remove("text-top");
          textBox.classList.add("text-bottom");

        }

        if (index < act3Lines.length) {
          showLine();
        } 
        else {
          finalMoment();
        }

      }, FADE_OUT);

    }, visibleDuration);
  }

  function finalMoment() {

    if (frame) frame.classList.add("shimmer");
    wrapper.classList.add("choice-mode");

    // Giggle shortly after the last line fades away
    setTimeout(() => {
      giggle.currentTime = 0;
      giggle.play().catch(() => {});
    }, 1000);

    // Your voice after the giggle
    setTimeout(() => {
      benVoice.currentTime = 0;
      benVoice.play().catch(() => {});
    }, 3200);

    // Buttons fade in after your voice
    setTimeout(() => {

      const right = document.getElementById("choice-right");
      const left = document.getElementById("choice-left");

      right.classList.add("show");
      left.classList.add("show");

      right.onclick = () => handleFinalChoice("hang");
      left.onclick = () => handleFinalChoice("game");

    }, 3600);
  }
}

function handleFinalChoice(choice) {

  if (choice === "hang") {

    console.log("Opening Zoom");

    window.open("hangout.html", "_blank");

  } 
  else {

    console.log("Opening escape room");

    window.open("escape.html", "_blank");

  }

}

startActThreeTransition();