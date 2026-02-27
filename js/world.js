// ===== KEEP ALL YOUR EXISTING BASELINE ENGINE CODE =====
// (Shader, ripple system, animate loop, word reveal logic, etc.)

// =========================
// STEP 1 + 2 (UNCHANGED)
// =========================

let activeDisplay = false;
let displayStartTime = 0;
let displayDuration = 1400;
let clickedWordElement = null;

let act3Unlocked = false; // NEW GATE

const wordDisplay = document.getElementById("word-display");
const hiddenWords = document.querySelectorAll(".hidden-word");

hiddenWords.forEach(word => {
  word.addEventListener("click", () => {

    if (activeDisplay) return;

    const computedOpacity = parseFloat(getComputedStyle(word).opacity);
    if (computedOpacity < 0.4) return;

    activeDisplay = true;
    clickedWordElement = word;
    displayStartTime = performance.now();

    hiddenWords.forEach(w => w.style.pointerEvents = "none");

    word.style.transition = "opacity 0.3s ease";
    word.style.opacity = 0;

    wordDisplay.textContent = word.textContent;
    wordDisplay.style.opacity = 0;

    requestAnimationFrame(() => {
      wordDisplay.style.opacity = 1;
    });
  });
});

const originalAnimate = animate;

animate = function(time) {
  originalAnimate(time);

  if (activeDisplay) {
    const elapsed = time - displayStartTime;

    if (elapsed > displayDuration * 0.6) {
      wordDisplay.style.opacity = 0;
    }

    if (elapsed > displayDuration) {
      activeDisplay = false;
      hiddenWords.forEach(w => w.style.pointerEvents = "auto");
      clickedWordElement = null;
      wordDisplay.textContent = "";
    }
  }

  // ===== ACT III BLOCKER =====
  // If your baseline had any condition triggering Act III,
  // wrap it like this:

  if (!act3Unlocked) {
    return;
  }

  // (Existing Act III logic continues below if unlocked)
};
