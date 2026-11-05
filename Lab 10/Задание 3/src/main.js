import { ROOMS } from "./modules/rooms.js";
import { addBooking, removeBooking, filterByDate } from "./modules/booking.js";
import { validateBooking } from "./modules/validation.js";
import { fillRooms, renderErrors, renderBookings, renderMessage } from "./modules/ui.js";
import { loadBookings, saveBookings } from "./modules/storage.js";

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
