const input = document.querySelector("#num");
const button = document.querySelector("#btn");
const table = document.querySelector("#table");
const errorBox = document.querySelector("#error");
const stats = document.querySelector("#stats");

// Проверка ввода: целое число от 1 до 10
function isValid(n) {
  return Number.isInteger(n) && n >= 1 && n <= 10;
}

function buildTable(n) {
  table.innerHTML = "";
  let sum = 0;
  for (let i = 1; i <= 10; i++) {
    const result = n * i;
    sum += result;
    const li = document.createElement("li");
    li.textContent = `${n} × ${i} = ${result}`;
    if (result % 2 === 0) li.classList.add("even"); // доп. функция: подсветка чётных
    table.appendChild(li);
  }
  stats.textContent = `Сумма всех результатов: ${sum}`; // доп. функция: статистика
}

button.addEventListener("click", () => {
  const n = Number(input.value);
  if (input.value === "" || !isValid(n)) {
    errorBox.textContent = "Введите целое число от 1 до 10";
    table.innerHTML = "";
    stats.textContent = "";
  } else {
    errorBox.textContent = "";
    buildTable(n);
  }
});

// Второе событие: при вводе убираем сообщение об ошибке
input.addEventListener("input", () => {
  errorBox.textContent = "";
});
