const guessInput = document.querySelector("#guess");
const checkBtn = document.querySelector("#check");
const restartBtn = document.querySelector("#restart");
const hint = document.querySelector("#hint");
const attemptsBox = document.querySelector("#attempts");
const historyList = document.querySelector("#history");

let secret = randomNumber();
let attempts = 0;
let finished = false;

function randomNumber() {
  return Math.floor(Math.random() * 100) + 1;
}

function setHint(text, cssClass) {
  hint.textContent = text;
  hint.className = cssClass || "";
}

function check() {
  if (finished) return;
  const value = Number(guessInput.value);
  if (guessInput.value === "" || !Number.isInteger(value) || value < 1 || value > 100) {
    setHint("Введите целое число от 1 до 100");
    return;
  }
  attempts++;
  attemptsBox.textContent = `Попыток: ${attempts}`;
  let note;
  if (value === secret) {
    note = "угадали!";
    setHint(`Верно! Число ${secret}. Попыток: ${attempts}`, "win");
    finished = true;
  } else if (value < secret) {
    note = "больше";
    setHint("Загаданное число БОЛЬШЕ", "low");
  } else {
    note = "меньше";
    setHint("Загаданное число МЕНЬШЕ", "high");
  }
  // доп. функция: история попыток
  const li = document.createElement("li");
  li.textContent = `${value} — ${note}`;
  historyList.appendChild(li);
  guessInput.value = "";
  guessInput.focus();
}

function restart() {
  secret = randomNumber();
  attempts = 0;
  finished = false;
  attemptsBox.textContent = "Попыток: 0";
  historyList.innerHTML = "";
  setHint("");
  guessInput.value = "";
}

checkBtn.addEventListener("click", check);
restartBtn.addEventListener("click", restart);
guessInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") check();
});
