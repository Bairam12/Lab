// Структура в хранилище: { "version": 1, "operations": [ {id, type, category, amount, date}, ... ] }
const KEY = "lab8_budget";
const CATEGORIES = {
  income: ["Стипендия", "Зарплата", "Подарок", "Другое"],
  expense: ["Еда", "Транспорт", "Жильё", "Развлечения", "Учёба", "Другое"],
};
const $ = (s) => document.querySelector(s);
const typeSel = $("#type"), catSel = $("#category"), amountInput = $("#amount"), dateInput = $("#date");
const monthInput = $("#month"), list = $("#list"), message = $("#message");
const submitBtn = $("#submitBtn"), cancelBtn = $("#cancelBtn"), fileInput = $("#importFile");

const fmt = (n) => n.toLocaleString("ru-RU");
const today = () => new Date().toISOString().slice(0, 10);

function sanitize(ops) {
  if (!Array.isArray(ops)) return [];
  return ops.filter((o) => o && (o.type === "income" || o.type === "expense") && typeof o.category === "string"
      && Number(o.amount) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(o.date))
    .map((o) => ({ id: Number(o.id) || Date.now() + Math.random(), type: o.type, category: o.category, amount: Number(o.amount), date: o.date }));
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return [];                           // первый запуск
    const data = JSON.parse(raw);
    return sanitize(Array.isArray(data) ? data : data.operations);
  } catch (e) {
    return [];                                             // повреждённый JSON
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ version: 1, operations })); }
  catch (e) { showMessage("Не удалось сохранить данные."); }
}

function showMessage(text, ok = false) {
  message.textContent = text;
  message.classList.toggle("ok", ok);
}

let operations = load();
let editingId = null;

function fillCategories(selected) {
  catSel.replaceChildren(...CATEGORIES[typeSel.value].map((c) => new Option(c, c)));
  if (selected) catSel.value = selected;
}

function resetForm() {
  editingId = null;
  typeSel.value = "income";
  fillCategories();
  amountInput.value = "";
  dateInput.value = today();
  submitBtn.textContent = "Добавить";
  cancelBtn.hidden = true;
}

function render() {
  const month = monthInput.value;                          // "" = всё время
  const shown = operations.filter((o) => !month || o.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Месячная сводка
  const sum = (t) => shown.filter((o) => o.type === t).reduce((s, o) => s + o.amount, 0);
  const income = sum("income"), expense = sum("expense"), balance = income - expense;
  $("#sumIncome").textContent = fmt(income) + " ₸";
  $("#sumExpense").textContent = fmt(expense) + " ₸";
  const bal = $("#sumBalance");
  bal.textContent = fmt(balance) + " ₸";
  bal.className = balance >= 0 ? "plus" : "minus";

  const byCat = {};
  shown.filter((o) => o.type === "expense").forEach((o) => { byCat[o.category] = (byCat[o.category] || 0) + o.amount; });
  const parts = Object.entries(byCat).map(([c, v]) => `${c}: ${fmt(v)} ₸`);
  $("#byCategory").textContent = parts.length ? "Расходы по категориям — " + parts.join("; ") : "Расходов за выбранный период нет.";

  list.replaceChildren();
  if (!shown.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Операций за выбранный период нет.";
    list.append(li);
  }
  shown.forEach((o) => {
    const li = document.createElement("li");
    const info = document.createElement("div");
    info.className = "grow";
    const title = document.createElement("b");
    title.className = o.type === "income" ? "plus" : "minus";
    title.textContent = `${o.type === "income" ? "+" : "−"}${fmt(o.amount)} ₸`;
    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = `${o.category} · ${o.date}`;
    info.append(title, sub);
    const edit = document.createElement("button");
    edit.className = "light";
    edit.textContent = "Изменить";
    edit.addEventListener("click", () => {                 // редактирование операции
      editingId = o.id;
      typeSel.value = o.type;
      fillCategories(o.category);
      amountInput.value = o.amount;
      dateInput.value = o.date;
      submitBtn.textContent = "Сохранить";
      cancelBtn.hidden = false;
      showMessage("Режим редактирования операции.", true);
    });
    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Удалить";
    del.addEventListener("click", () => {
      operations = operations.filter((x) => x.id !== o.id);
      if (editingId === o.id) resetForm();
      save(); render();
    });
    li.append(info, edit, del);
    list.append(li);
  });
}

typeSel.addEventListener("change", () => fillCategories());
cancelBtn.addEventListener("click", () => { resetForm(); showMessage(""); });

$("#opForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const value = Number(amountInput.value);
  if (!(value > 0)) { amountInput.classList.add("invalid"); showMessage("Введите сумму больше нуля."); return; }
  if (!dateInput.value) { dateInput.classList.add("invalid"); showMessage("Укажите дату."); return; }
  amountInput.classList.remove("invalid"); dateInput.classList.remove("invalid");
  const op = { id: editingId ?? Date.now(), type: typeSel.value, category: catSel.value, amount: value, date: dateInput.value };
  if (editingId) operations = operations.map((o) => (o.id === editingId ? op : o));
  else operations.push(op);
  showMessage(editingId ? "Операция изменена." : "Операция добавлена.", true);
  resetForm();
  save(); render();
});

monthInput.addEventListener("change", render);
$("#allBtn").addEventListener("click", () => { monthInput.value = ""; render(); });

$("#clearBtn").addEventListener("click", () => {
  if (!operations.length || !confirm("Удалить все операции?")) return;
  operations = [];
  localStorage.removeItem(KEY);
  resetForm(); render();
});

// Дополнительная функция: экспорт / импорт данных в JSON-файл
$("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ version: 1, operations }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "budget.json"; a.click();
  URL.revokeObjectURL(url);
  showMessage("Данные экспортированы.", true);
});
$("#importBtn").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const ops = sanitize(Array.isArray(data) ? data : data.operations);
      if (!ops.length) throw new Error("empty");
      operations = ops;
      save(); render();
      showMessage(`Импортировано операций: ${ops.length}.`, true);
    } catch (e) {
      showMessage("Файл не содержит корректных данных бюджета.");
    }
    fileInput.value = "";
  };
  reader.readAsText(file);
});

monthInput.value = today().slice(0, 7);                    // по умолчанию — текущий месяц
resetForm();
render();
