// Дополнительный модуль (творческое задание): запоминает фильтры между запусками.
const KEY = "lab10-books-filters";

export function saveFilters(filters) {
  try { localStorage.setItem(KEY, JSON.stringify(filters)); } catch { /* хранилище недоступно */ }
}

export function loadFilters() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? null; } catch { return null; }
}
