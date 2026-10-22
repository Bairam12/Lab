const KEY = "lab8_expenses";
const MODE_KEY = "lab8_expenses_mode";            // выбранный режим всегда хранится в localStorage
const form = document.querySelector("#expenseForm");
const category = document.querySelector("#category");
const amount = document.querySelector("#amount");
const dateInput = document.querySelector("#date");
const list = document.querySelector("#list");
const message = document.querySelector("#message");
const totalEl = document.querySelector("#total");
const modeSelect = document.querySelector("#mode");
const modeInfo = document.querySelector("#modeInfo");

let mode = "local";
try { if (localStorage.getItem(MODE_KEY) === "session") mode = "session"; } catch (e) {}
const getStore = () => (mode === "session" ? sessionStorage : localStorage);

// Проверка каждой записи: категория, положительная сумма, дата
function sanitize(data) {
  if (!Array.isArray(data)) return [];
  return data.filter((e) => e && typeof e.category === "string" && Number(e.amount) > 0 && typeof e.date === "string")
    .map((e) => ({ id: Number(e.id) || Date.now(), category: e.category, amount: Number(e.amount), date: e.date }));
}

function load() {
  try {
    const raw = getStore().getItem(KEY);
    return raw === null ? [] : sanitize(JSON.parse(raw));   // нет данных → пустой список
  } catch (e) {
    return [];                                              // повреждённый JSON → пустой список
  }
}

function save() {
  try { getStore().setItem(KEY, JSON.stringify(expenses)); }
  catch (e) { showMessage("Не удалось сохранить данные."); }
}

function showMessage(text, ok = false) {
  message.textContent = text;
  message.classList.toggle("ok", ok);
}

let expenses = load();

function render() {
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  list.replaceChildren();
  if (!sorted.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Расходов пока нет.";
    list.append(li);
  }
  sorted.forEach((e) => {
    const li = document.createElement("li");
    const info = document.createElement("div");
    info.className = "grow";
    const title = document.createElement("b");
    title.textContent = `${e.category} — ${e.amount.toLocaleString("ru-RU")} ₸`;
    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = e.date;
    info.append(title, sub);
    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Удалить";
    del.addEventListener("click", () => {
      expenses = expenses.filter((x) => x.id !== e.id);
      save(); render();
    });
    li.append(info, del);
    list.append(li);
  });
  totalEl.textContent = expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString("ru-RU");
  modeSelect.value = mode;
  modeInfo.textContent = mode === "local"
    ? "Данные сохранятся после закрытия браузера."
    : "Данные исчезнут после закрытия вкладки (обновление страницы их не удаляет).";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  [category, amount, dateInput].forEach((c) => c.classList.remove("invalid"));
  const value = Number(amount.value);
  if (!category.value) { category.classList.add("invalid"); showMessage("Выберите категорию."); return; }
  if (!(value > 0)) { amount.classList.add("invalid"); showMessage("Введите сумму больше нуля."); return; }
  if (!dateInput.value) { dateInput.classList.add("invalid"); showMessage("Укажите дату."); return; }
  showMessage("");
  expenses.push({ id: Date.now(), category: category.value, amount: value, date: dateInput.value });
  form.reset();
  dateInput.value = new Date().toISOString().slice(0, 10);
  save(); render();
});

document.querySelector("#clearBtn").addEventListener("click", () => {
  if (!expenses.length || !confirm("Удалить все расходы?")) return;
  expenses = [];
  getStore().removeItem(KEY);
  render();
});

// Дополнительная функция: переключатель режима хранения localStorage / sessionStorage
modeSelect.addEventListener("change", () => {
  const data = expenses;
  getStore().removeItem(KEY);                      // убираем данные из старого хранилища
  mode = modeSelect.value;
  try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
  expenses = data;
  save(); render();
  showMessage(`Данные перенесены в ${mode === "local" ? "localStorage" : "sessionStorage"}.`, true);
});

dateInput.value = new Date().toISOString().slice(0, 10);
render();
