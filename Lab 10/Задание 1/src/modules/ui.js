// Модуль интерфейса: все операции с DOM собраны здесь.
export function renderErrors(listEl, errors) {
  listEl.innerHTML = "";
  for (const message of errors) {
    const li = document.createElement("li");
    li.textContent = message;
    listEl.append(li);
  }
}

export function renderSuccess(el, message) {
  el.textContent = message;
}

export function renderCounter(el, chars, words, max) {
  el.textContent = `Символов: ${chars} из ${max}; слов: ${words}`;
  el.classList.toggle("over", chars > max);
}
