const GOAL = 10;                                  
const field = document.querySelector("#field");
const target = document.querySelector("#target");
const result = document.querySelector("#result");
const resultText = document.querySelector("#resultText");
const restartBtn = document.querySelector("#restartBtn");
const scoreEl = document.querySelector("#score");
const timeEl = document.querySelector("#time");
const bestEl = document.querySelector("#best");
document.querySelector("#goal").textContent = GOAL;

let score = 0, startTime = 0, timerId = null, best = null;

function moveTarget() {
  const maxX = field.clientWidth - target.offsetWidth;
  const maxY = field.clientHeight - target.offsetHeight;
  target.style.left = Math.floor(Math.random() * maxX) + "px";
  target.style.top = Math.floor(Math.random() * maxY) + "px";
}

function startGame() {
  score = 0;
  scoreEl.textContent = 0;
  timeEl.textContent = "0.0";
  result.classList.add("hidden");
  target.disabled = false;
  startTime = 0;
  clearInterval(timerId);
  moveTarget();
}

function endGame() {
  clearInterval(timerId);
  target.disabled = true;
  const total = ((Date.now() - startTime) / 1000).toFixed(1);
  if (best === null || Number(total) < best) {
    best = Number(total);
    bestEl.textContent = best + " с";
  }
  resultText.textContent = `Вы поймали объект ${GOAL} раз за ${total} с.`;
  result.classList.remove("hidden");
}

target.addEventListener("click", () => {
  if (score === 0) {                              
    startTime = Date.now();
    timerId = setInterval(() => {
      timeEl.textContent = ((Date.now() - startTime) / 1000).toFixed(1);
    }, 100);
  }
  score++;
  scoreEl.textContent = score;
  target.classList.remove("flash");
  void target.offsetWidth;                        
  target.classList.add("flash");
  if (score >= GOAL) endGame(); else moveTarget();
});

restartBtn.addEventListener("click", startGame);
document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "r") startGame();
});
window.addEventListener("load", startGame);
