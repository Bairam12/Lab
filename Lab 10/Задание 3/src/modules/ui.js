// Модуль интерфейса: работа с DOM.
import { getRoom } from "./rooms.js";

export function fillRooms(select, rooms) {
  select.innerHTML = "";
  for (const room of rooms) {
    const option = document.createElement("option");
    option.value = room.id;
    option.textContent = `${room.name} (до ${room.capacity} чел.)`;
    select.append(option);
  }
}

export function renderErrors(listEl, errors) {
  listEl.innerHTML = "";
  for (const message of errors) {
    const li = document.createElement("li");
    li.textContent = message;
    listEl.append(li);
  }
}

export function renderMessage(el, text) {
  el.textContent = text;
}

export function renderBookings(tbody, bookings) {
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
