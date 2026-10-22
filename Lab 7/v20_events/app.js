// Данные приложения: мероприятия и участники (массивы объектов)
const events = [
  { id: 1, title: "Хакатон «Code Night»", date: "12 ноября, 10:00", place: "Аудитория 301", seats: 3 },
  { id: 2, title: "Лекция по кибербезопасности", date: "15 ноября, 14:00", place: "Актовый зал", seats: 5 },
  { id: 3, title: "Мастер-класс по JavaScript", date: "20 ноября, 16:00", place: "Аудитория 205", seats: 2 },
];
let participants = [];
let nextId = 1;
let preselected = "";

const tabs = document.querySelector("#tabs");
const buttons = tabs.querySelectorAll("[data-page]");
const content = document.querySelector("#content");
const badge = document.querySelector("#badge");

// Вспомогательная функция создания элементов
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

function seatsLeft(event) {
  return event.seats - participants.filter((p) => p.eventId === event.id).length;
}

function updateBadge() { badge.textContent = participants.length; }

function showPage(page) {
  buttons.forEach((btn) => {
    const active = btn.dataset.page === page;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active);
  });
  const view = { events: viewEvents, register: viewRegister, participants: viewParticipants }[page];
  content.replaceChildren(view());
  updateBadge();
}

// ---------- Вкладка «События» ----------
function viewEvents() {
  const grid = el("div", { className: "grid" });
  events.forEach((ev) => {
    const left = seatsLeft(ev);
    const btn = el("button", { className: "action", textContent: left > 0 ? "Зарегистрироваться" : "Мест нет", disabled: left === 0 });
    btn.addEventListener("click", () => { preselected = String(ev.id); showPage("register"); });
    grid.append(el("div", { className: "card" },
      el("h3", { textContent: ev.title }),
      el("p", { textContent: "📅 " + ev.date }),
      el("p", { textContent: "📍 " + ev.place }),
      el("p", { className: "seats" + (left === 0 ? " none" : ""), textContent: `Свободных мест: ${left} из ${ev.seats}` }),
      btn));
  });
  return el("section", {}, el("h2", { textContent: "Ближайшие события" }), grid);
}

// ---------- Вкладка «Регистрация» ----------
function viewRegister() {
  const name = el("input", { type: "text", id: "name", placeholder: "Фамилия Имя" });
  const email = el("input", { type: "email", id: "email", placeholder: "name@example.com" });
  const select = el("select", { id: "eventSelect" }, el("option", { value: "", textContent: "— выберите событие —" }));
  events.forEach((ev) => select.append(el("option", { value: ev.id, textContent: `${ev.title} (мест: ${seatsLeft(ev)})`, disabled: seatsLeft(ev) === 0 })));
  select.value = preselected;
  const error = el("p", { className: "error" });
  const field = (label, control) => el("div", { className: "field" }, el("label", { textContent: label, htmlFor: control.id }), control);
  const form = el("form", {}, field("Имя", name), field("Email", email), field("Событие", select), error, el("button", { type: "submit", textContent: "Зарегистрироваться" }));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    [name, email, select].forEach((c) => c.classList.remove("invalid"));
    const n = name.value.trim(), m = email.value.trim().toLowerCase(), evId = Number(select.value);
    let msg = "";
    if (n.length < 2) { name.classList.add("invalid"); msg = "Введите имя (минимум 2 символа)."; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) { email.classList.add("invalid"); msg = "Введите корректный email."; }
    else if (!evId) { select.classList.add("invalid"); msg = "Выберите событие."; }
    else if (participants.some((p) => p.email === m && p.eventId === evId)) { msg = "Этот email уже зарегистрирован на выбранное событие."; }
    else if (seatsLeft(events.find((e) => e.id === evId)) === 0) { msg = "На это событие мест не осталось."; }
    if (msg) { error.textContent = msg; return; }
    participants.push({ id: nextId++, name: n, email: m, eventId: evId });
    preselected = "";
    showPage("participants");
  });
  return el("section", {}, el("h2", { textContent: "Регистрация участника" }), form);
}

// ---------- Вкладка «Участники» ----------
function viewParticipants() {
  const search = el("input", { type: "search", className: "search", placeholder: "Поиск по имени или email..." });
  const list = el("ul", { className: "list" });
  const empty = el("p", { className: "empty" });

  function renderList() {
    const q = search.value.trim().toLowerCase();
    const shown = participants.filter((p) => p.name.toLowerCase().includes(q) || p.email.includes(q));
    list.replaceChildren(...shown.map((p) => {
      const ev = events.find((e) => e.id === p.eventId);
      const del = el("button", { className: "action danger", textContent: "Удалить" });
      del.addEventListener("click", () => {
        participants = participants.filter((x) => x.id !== p.id);
        showPage("participants");
      });
      return el("li", {}, el("div", { className: "grow" }, el("b", { textContent: p.name }), el("div", { textContent: `${p.email} · ${ev.title}` })), del);
    }));
    empty.textContent = shown.length ? "" : (participants.length ? "Ничего не найдено." : "Участников пока нет. Зарегистрируйтесь на вкладке «Регистрация».");
  }
  search.addEventListener("input", renderList);   // Дополнительная функция: поиск
  renderList();
  return el("section", {}, el("h2", { textContent: "Список участников" }), search, list, empty);
}

buttons.forEach((btn) => btn.addEventListener("click", () => showPage(btn.dataset.page)));
showPage("events");
