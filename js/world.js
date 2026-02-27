// ===== BASELINE ENGINE (UNCHANGED ABOVE) =====
// KEEP ALL YOUR ORIGINAL WORLD.JS CONTENT EXACTLY AS-IS
// INCLUDING SHADER, RIPPLE, ANIMATE LOOP, ETC.


// =========================
// STEP 1 + STEP 2 EXTENSION
// =========================

let activeDisplay = false;
let displayStartTime = 0;
let displayDuration = 1400;
let clickedWordElement = null;

const wordDisplay = document.getElementById("word-display");
const hiddenWords = document.querySelectorAll(".hidden-word");

// ---- Safe Click Handler ----
hiddenWords.forEach(word => {
  word.addEventListener("click", () => {

    // Block if display already running
    if (activeDisplay) return;

    const computedOpacity = parseFloat(getComputedStyle(word).opacity);

    // Only clickable if sufficiently visible
    if (computedOpacity < 0.4) return;

    activeDisplay = true;
    clickedWordElement = word;
    displayStartTime = performance.now();

    // Disable pointer events on all words during display
    hiddenWords.forEach(w => w.style.pointerEvents = "none");

    // Fade out clicked word in place
    word.style.transition = "opacity 0.3s ease";
    word.style.opacity = 0;

    // Show top display
    wordDisplay.textContent = word.textContent;
    wordDisplay.style.opacity = 0;

    requestAnimationFrame(() => {
      wordDisplay.style.opacity = 1;
    });
  });
});


// ---- Extend Existing Animate Loop Safely ----
const originalAnimate = animate;

animate = function(time) {
  originalAnimate(time);

  if (!activeDisplay) return;

  const elapsed = time - displayStartTime;

  // Fade out display toward end
  if (elapsed > displayDuration * 0.6) {
    wordDisplay.style.opacity = 0;
  }

  // End display cycle cleanly
  if (elapsed > displayDuration) {
    activeDisplay = false;

    // Restore pointer events
    hiddenWords.forEach(w => w.style.pointerEvents = "auto");

    clickedWordElement = null;
    wordDisplay.textContent = "";
  }
};
