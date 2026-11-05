// Запасной файл: собран автоматически из main.js и src/modules/*.js (без import/export).
// Подключается, только если страница открыта двойным щелчком (file://), где браузер блокирует ES-модули.
(function () {
"use strict";
// ===== modules/validators.js =====
// Модуль проверки текста: только вычисления, без работы с DOM.
function isEmpty(value) {
  return value.trim() === "";
}

function checkLength(value, min, max) {
  const length = value.trim().length;
  return length >= min && length <= max;
}

// Возвращает текст ошибки или null, если поле корректно.
function validateField(value, { label, min, max }) {
  if (isEmpty(value)) {
    return `${label}: поле не должно быть пустым`;
  }
  if (!checkLength(value, min, max)) {
    return `${label}: длина должна быть от ${min} до ${max} символов (сейчас ${value.trim().length})`;
  }
  return null;
}

// ===== modules/stats.js =====
// Дополнительный модуль (творческое задание): статистика текста.
function countChars(text) {
  return text.trim().length;
}

function countWords(text) {
  const t = text.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

// ===== modules/ui.js =====
// Модуль интерфейса: все операции с DOM собраны здесь.
function renderErrors(listEl, errors) {
  listEl.innerHTML = "";
  for (const message of errors) {
    const li = document.createElement("li");
    li.textContent = message;
    listEl.append(li);
  }
}

function renderSuccess(el, message) {
  el.textContent = message;
}

function renderCounter(el, chars, words, max) {
  el.textContent = `Символов: ${chars} из ${max}; слов: ${words}`;
  el.classList.toggle("over", chars > max);
}

// ===== main.js =====

window.__modulesOk = true; // признак того, что ES-модули загрузились

const FIELDS = [
  { id: "username", label: "Имя пользователя", min: 3, max: 20 },
  { id: "comment", label: "Комментарий", min: 10, max: 200 },
];

const form = document.querySelector("#form");
const errorsEl = document.querySelector("#errors");
const successEl = document.querySelector("#success");

function updateCounter(field) {
  const text = document.querySelector(`#${field.id}`).value;
  renderCounter(document.querySelector(`#${field.id}-counter`), countChars(text), countWords(text), field.max);
}

for (const field of FIELDS) {
  updateCounter(field);
  document.querySelector(`#${field.id}`).addEventListener("input", () => updateCounter(field));
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const errors = FIELDS
    .map((f) => validateField(document.querySelector(`#${f.id}`).value, f))
    .filter(Boolean);
  renderErrors(errorsEl, errors);
  renderSuccess(successEl, errors.length === 0 ? "Все поля заполнены корректно" : "");
});

form.addEventListener("reset", () => {
  setTimeout(() => {
    FIELDS.forEach(updateCounter);
    renderErrors(errorsEl, []);
    renderSuccess(successEl, "");
  });
});

})();
