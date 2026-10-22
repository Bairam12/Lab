const KEY = "lab8_shopping";
const form = document.querySelector("#addForm");
const input = document.querySelector("#itemInput");
const list = document.querySelector("#list");
const message = document.querySelector("#message");
const count = document.querySelector("#count");
const boughtCount = document.querySelector("#boughtCount");
const fileInput = document.querySelector("#importFile");

// Проверка структуры данных: оставляем только корректные записи
function sanitize(data) {
  if (!Array.isArray(data)) return [];
  return data
    .filter((i) => i && typeof i.name === "string" && i.name.trim() !== "")
    .map((i) => ({ id: Number(i.id) || Date.now() + Math.random(), name: i.name.trim(), bought: Boolean(i.bought) }));
}

// Чтение из localStorage: защита от отсутствия данных и повреждённого JSON
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return [];                   // первый запуск
    return sanitize(JSON.parse(raw));
  } catch (e) {
    console.warn("Повреждённые данные, список сброшен", e);
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    showMessage("Не удалось сохранить данные (хранилище недоступно).");
  }
}

function showMessage(text, ok = false) {
  message.textContent = text;
  message.classList.toggle("ok", ok);
}

let items = load();

function render() {
  list.replaceChildren();
  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Список пуст. Добавьте первый товар.";
    list.append(li);
  }
  items.forEach((item) => {
    const li = document.createElement("li");
    li.classList.toggle("bought", item.bought);
    const name = document.createElement("span");
    name.className = "grow";
    name.textContent = item.name;                  // textContent — без вставки HTML
    name.title = "Клик — отметить как купленное";
    name.addEventListener("click", () => {
      item.bought = !item.bought;
      save(); render();
    });
    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Удалить";
    del.addEventListener("click", () => {
      items = items.filter((i) => i.id !== item.id);
      save(); render();
    });
    li.append(name, del);
    list.append(li);
  });
  count.textContent = items.length;
  boughtCount.textContent = items.filter((i) => i.bought).length;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = input.value.trim();
  if (name === "") {                               // пустой ввод не сохраняется
    input.classList.add("invalid");
    showMessage("Введите название товара.");
    return;
  }
  input.classList.remove("invalid");
  showMessage("");
  items.push({ id: Date.now(), name, bought: false });
  input.value = "";
  save(); render();
});
input.addEventListener("input", () => { input.classList.remove("invalid"); showMessage(""); });

document.querySelector("#clearBtn").addEventListener("click", () => {
  if (!items.length || !confirm("Удалить все товары?")) return;
  items = [];
  localStorage.removeItem(KEY);                    // удаление ключа из хранилища
  render();
});

// Дополнительная функция: экспорт данных в JSON-файл
document.querySelector("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "shopping-list.json";
  a.click();
  URL.revokeObjectURL(url);
  showMessage("Список экспортирован.", true);
});

// Дополнительная функция: импорт данных из JSON-файла
document.querySelector("#importBtn").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = sanitize(JSON.parse(reader.result));
      if (!data.length) throw new Error("empty");
      items = data;
      save(); render();
      showMessage(`Импортировано товаров: ${data.length}.`, true);
    } catch (e) {
      showMessage("Файл не содержит корректный список товаров.");
    }
    fileInput.value = "";
  };
  reader.readAsText(file);
});

render();
