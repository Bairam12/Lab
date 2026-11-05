// Дополнительный модуль (творческое задание): хранение бронирований в localStorage.
const KEY = "lab10-bookings";

export function saveBookings(bookings) {
  try { localStorage.setItem(KEY, JSON.stringify(bookings)); } catch { /* хранилище недоступно */ }
}

export function loadBookings() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
