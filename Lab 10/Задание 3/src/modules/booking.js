// Модуль логики бронирования: чистые функции, список не мутируется.
export function timeToMinutes(time) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// Интервалы [start, end) пересекаются, если каждый начинается раньше конца другого.
// Встык (конец одного = начало другого) пересечением не считается.
export function isOverlap(a, b) {
  return (
    a.roomId === b.roomId &&
    a.date === b.date &&
    timeToMinutes(a.start) < timeToMinutes(b.end) &&
    timeToMinutes(b.start) < timeToMinutes(a.end)
  );
}

export function hasConflict(bookings, candidate) {
  return bookings.some((b) => isOverlap(b, candidate));
}

export function addBooking(bookings, data) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return [...bookings, { ...data, id }];
}

export function removeBooking(bookings, id) {
  return bookings.filter((b) => b.id !== id);
}

export function filterByDate(bookings, date) {
  const list = date ? bookings.filter((b) => b.date === date) : [...bookings];
  return list.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}
