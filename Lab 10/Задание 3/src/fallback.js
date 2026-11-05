// Запасной файл: собран автоматически из main.js и src/modules/*.js (без import/export).
// Подключается, только если страница открыта двойным щелчком (file://), где браузер блокирует ES-модули.
(function () {
"use strict";
// ===== modules/rooms.js =====
// Модуль данных об аудиториях.
const ROOMS = [
  { id: "A-101", name: "Аудитория A-101", capacity: 30 },
  { id: "A-205", name: "Аудитория A-205", capacity: 60 },
  { id: "LAB-3", name: "Компьютерный класс LAB-3", capacity: 20 },
  { id: "HALL", name: "Актовый зал", capacity: 150 },
];

function getRoom(id) {
  return ROOMS.find((room) => room.id === id) ?? null;
}

// ===== modules/booking.js =====
// Модуль логики бронирования: чистые функции, список не мутируется.
function timeToMinutes(time) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// Интервалы [start, end) пересекаются, если каждый начинается раньше конца другого.
// Встык (конец одного = начало другого) пересечением не считается.
function isOverlap(a, b) {
  return (
    a.roomId === b.roomId &&
    a.date === b.date &&
    timeToMinutes(a.start) < timeToMinutes(b.end) &&
    timeToMinutes(b.start) < timeToMinutes(a.end)
  );
}

function hasConflict(bookings, candidate) {
  return bookings.some((b) => isOverlap(b, candidate));
}

function addBooking(bookings, data) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return [...bookings, { ...data, id }];
}

function removeBooking(bookings, id) {
  return bookings.filter((b) => b.id !== id);
}

function filterByDate(bookings, date) {
  const list = date ? bookings.filter((b) => b.date === date) : [...bookings];
  return list.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

// ===== modules/validation.js =====
// Модуль проверки данных формы. Возвращает массив сообщений об ошибках.

const WORK_START = "08:00";
const WORK_END = "21:00";
const MIN_DURATION = 30;

function validateBooking(data, bookings) {
  const errors = [];
  const room = getRoom(data.roomId);
  if (!room) errors.push("Выберите аудиторию");
  if (!data.date) errors.push("Укажите дату");

  const start = timeToMinutes(data.start);
  const end = timeToMinutes(data.end);
  if (start === null || end === null) {
    errors.push("Укажите время начала и окончания в формате ЧЧ:ММ");
  } else {
    if (start >= end) {
      errors.push("Время окончания должно быть позже времени начала");
    } else if (end - start < MIN_DURATION) {
      errors.push(`Минимальная длительность — ${MIN_DURATION} минут`);
    }
    if (start < timeToMinutes(WORK_START) || end > timeToMinutes(WORK_END)) {
      errors.push(`Бронирование возможно с ${WORK_START} до ${WORK_END}`);
    }
  }

  if (data.purpose.trim().length < 3) errors.push("Укажите цель бронирования (не менее 3 символов)");

  const people = Number(data.attendees);
  if (!Number.isInteger(people) || people < 1) {
    errors.push("Количество участников — целое число не меньше 1");
  } else if (room && people > room.capacity) {
    errors.push(`Вместимость аудитории — ${room.capacity} мест`);
  }

  if (errors.length === 0 && hasConflict(bookings, data)) {
    errors.push("Аудитория уже занята в это время");
  }
  return errors;
}

// ===== modules/ui.js =====
// Модуль интерфейса: работа с DOM.

function fillRooms(select, rooms) {
  select.innerHTML = "";
  for (const room of rooms) {
    const option = document.createElement("option");
    option.value = room.id;
    option.textContent = `${room.name} (до ${room.capacity} чел.)`;
    select.append(option);
  }
}

function renderErrors(listEl, errors) {
  listEl.innerHTML = "";
  for (const message of errors) {
    const li = document.createElement("li");
    li.textContent = message;
    listEl.append(li);
  }
}

function renderMessage(el, text) {
  el.textContent = text;
}

function renderBookings(tbody, bookings) {
  tbody.innerHTML = "";
  if (bookings.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "Бронирований нет";
    tr.append(td);
    tbody.append(tr);
    return;
  }
  for (const b of bookings) {
    const tr = document.createElement("tr");
    const cells = [b.date, `${b.start}–${b.end}`, getRoom(b.roomId)?.name ?? b.roomId, b.purpose, b.attendees];
    for (const value of cells) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    }
    const actionTd = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";
    button.dataset.id = b.id;
    button.textContent = "Отменить";
    actionTd.append(button);
    tr.append(actionTd);
    tbody.append(tr);
  }
}

// ===== modules/storage.js =====
// Дополнительный модуль (творческое задание): хранение бронирований в localStorage.
const KEY = "lab10-bookings";

function saveBookings(bookings) {
  try { localStorage.setItem(KEY, JSON.stringify(bookings)); } catch { /* хранилище недоступно */ }
}

function loadBookings() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ===== main.js =====

window.__modulesOk = true; // признак того, что ES-модули загрузились

const $ = (selector) => document.querySelector(selector);
let bookings = loadBookings();

fillRooms($("#room"), ROOMS);

function refresh() {
  renderBookings($("#bookings"), filterByDate(bookings, $("#filter-date").value));
}

$("#booking-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = {
    roomId: $("#room").value,
    date: $("#date").value,
    start: $("#start").value,
    end: $("#end").value,
    purpose: $("#purpose").value,
    attendees: $("#attendees").value,
  };
  const errors = validateBooking(data, bookings);
  renderErrors($("#errors"), errors);
  if (errors.length > 0) {
    renderMessage($("#message"), "");
    return;
  }
  bookings = addBooking(bookings, { ...data, purpose: data.purpose.trim(), attendees: Number(data.attendees) });
  saveBookings(bookings);
  refresh();
  renderMessage($("#message"), "Бронирование создано");
  event.target.reset();
});

$("#filter-date").addEventListener("change", refresh);
$("#clear-filter").addEventListener("click", () => {
  $("#filter-date").value = "";
  refresh();
});
$("#bookings").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  bookings = removeBooking(bookings, button.dataset.id);
  saveBookings(bookings);
  refresh();
});

refresh();

})();
