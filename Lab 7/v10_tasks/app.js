const STORAGE_KEY = "tasks:list";
const titles = { all: "Все задачи", active: "Активные задачи", done: "Выполненные задачи" };
const emptyText = { all: "Задач пока нет.", active: "Активных задач нет.", done: "Выполненных задач нет." };

// Данные хранятся в массиве объектов
let tasks = [
  { id: 1, text: "Сделать лабораторную работу №7", done: false },
  { id: 2, text: "Подготовить отчёт", done: false },
  { id: 3, text: "Повторить DOM и события", done: true },
];
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (Array.isArray(saved)) tasks = saved;
} catch (e) { /* используем данные по умолчанию */ }

let currentTab = "all";
const buttons = document.querySelectorAll("[data-page]");
const content = document.querySelector("#content");
const form = document.querySelector("#taskForm");
const input = document.querySelector("#taskInput");
const errorBox = document.querySelector("#error");

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch (e) {}
}

function filtered() {
  if (currentTab === "active") return tasks.filter((t) => !t.done);
  if (currentTab === "done") return tasks.filter((t) => t.done);
  return tasks;
}

// Дополнительная функция: счётчики на вкладках
function updateBadges() {
  const counts = { all: tasks.length, active: tasks.filter((t) => !t.done).length, done: tasks.filter((t) => t.done).length };
  buttons.forEach((btn) => {
    btn.querySelector(".badge").textContent = counts[btn.dataset.page];
  });
}

function render() {
  buttons.forEach((btn) => {
    const active = btn.dataset.page === currentTab;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active);
  });
  const title = document.createElement("h2");
  title.textContent = titles[currentTab];
  const items = filtered();
  const body = document.createElement(items.length ? "ul" : "p");
  if (!items.length) {
    body.className = "empty";
    body.textContent = emptyText[currentTab];
  } else {
    body.className = "list";
    items.forEach((task) => body.append(createItem(task)));
  }
  content.replaceChildren(title, body);
  updateBadges();
}

function createItem(task) {
  const li = document.createElement("li");
  li.classList.toggle("done", task.done);
  const toggle = document.createElement("button");
  toggle.className = "toggle";
  toggle.textContent = task.done ? "✓" : "";
  toggle.setAttribute("aria-label", "Сменить статус задачи");
  toggle.addEventListener("click", () => {        // смена статуса
    task.done = !task.done;
    save();
    render();
  });
  const text = document.createElement("span");
  text.className = "grow";
  text.textContent = task.text;                    // textContent — без вставки HTML
  const del = document.createElement("button");
  del.className = "action danger";
  del.textContent = "Удалить";
  del.addEventListener("click", () => {
    tasks = tasks.filter((t) => t.id !== task.id);
    save();
    render();
  });
  li.append(toggle, text, del);
  return li;
}

buttons.forEach((btn) =>
  btn.addEventListener("click", () => {
    currentTab = btn.dataset.page;
    render();
  })
);

form.addEventListener("submit", (event) => {      // добавление задачи
  event.preventDefault();
  const text = input.value.trim();
  if (text === "") {
    errorBox.textContent = "Введите текст задачи.";
    return;
  }
  errorBox.textContent = "";
  const id = tasks.length ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
  tasks.push({ id, text, done: false });
  input.value = "";
  save();
  render();
});
input.addEventListener("input", () => { errorBox.textContent = ""; });

render();
