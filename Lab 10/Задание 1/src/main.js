import { validateField } from "./modules/validators.js";
import { countChars, countWords } from "./modules/stats.js";
import { renderErrors, renderSuccess, renderCounter } from "./modules/ui.js";

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
