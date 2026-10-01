const form = document.querySelector("#form");
const nameInput = document.querySelector("#name");
const emailInput = document.querySelector("#email");
const passInput = document.querySelector("#password");
const strengthBox = document.querySelector("#strength");
const success = document.querySelector("#success");

// Каждая функция возвращает текст ошибки или пустую строку
function checkName(v) {
  v = v.trim();
  if (v.length < 2) return "Имя должно содержать минимум 2 символа";
  if (!/^[A-Za-zА-Яа-яЁё\s-]+$/.test(v)) return "Имя может содержать только буквы";
  return "";
}

function checkEmail(v) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return "Введите корректный email";
  return "";
}

function checkPassword(v) {
  if (v.length < 8) return "Пароль минимум 8 символов";
  if (!/\d/.test(v)) return "Добавьте хотя бы одну цифру";
  if (!/[A-Za-zА-Яа-я]/.test(v)) return "Добавьте хотя бы одну букву";
  return "";
}

// Показ ошибки рядом с полем
function showError(input, message) {
  document.querySelector(`#${input.id}Error`).textContent = message;
  input.classList.toggle("invalid", message !== "");
  input.classList.toggle("valid", message === "");
}

function validateField(input, checker) {
  const message = checker(input.value);
  showError(input, message);
  return message === "";
}

// Доп. функция: индикатор надёжности пароля (цикл по критериям)
function updateStrength(v) {
  const rules = [v.length >= 8, /\d/.test(v), /[A-Z]/.test(v), /[^A-Za-z0-9]/.test(v)];
  let score = 0;
  for (const ok of rules) if (ok) score++;
  const labels = ["", "слабый", "средний", "хороший", "сильный"];
  strengthBox.textContent = v ? `Надёжность: ${labels[score] || "слабый"}` : "";
}

// Событие 1: проверка при вводе
nameInput.addEventListener("input", () => validateField(nameInput, checkName));
emailInput.addEventListener("input", () => validateField(emailInput, checkEmail));
passInput.addEventListener("input", () => {
  validateField(passInput, checkPassword);
  updateStrength(passInput.value);
});

// Событие 2: отправка формы без перезагрузки страницы
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const ok1 = validateField(nameInput, checkName);
  const ok2 = validateField(emailInput, checkEmail);
  const ok3 = validateField(passInput, checkPassword);
  if (ok1 && ok2 && ok3) {
    success.textContent = `Регистрация прошла успешно, ${nameInput.value.trim()}!`;
  } else {
    success.textContent = "";
  }
});
