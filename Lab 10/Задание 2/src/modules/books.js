// Модуль логики: фильтрация и сортировка. Исходный массив не изменяется.
export function filterByQuery(books, query) {
  const q = query.trim().toLowerCase();
  if (q === "") return [...books];
  return books.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
}

export function filterByGenre(books, genre) {
  return genre === "all" ? [...books] : books.filter((b) => b.genre === genre);
}

export function filterByMinYear(books, year) {
  return books.filter((b) => b.year >= year);
}

export function sortBooks(books, key, dir = "asc") {
  const k = dir === "desc" ? -1 : 1;
  return [...books].sort((a, b) => {
    const x = a[key], y = b[key];
    return (typeof x === "string" ? x.localeCompare(y, "ru") : x - y) * k;
  });
}

export function getGenres(books) {
  return [...new Set(books.map((b) => b.genre))].sort((a, b) => a.localeCompare(b, "ru"));
}

// Разбор поля «год»: пустая строка — фильтр не задан; иначе нужно целое число.
export function parseMinYear(text) {
  const t = text.trim();
  if (t === "") return { value: null, error: null };
  const n = Number(t);
  const max = new Date().getFullYear();
  if (!Number.isInteger(n) || n < 1000 || n > max) {
    return { value: null, error: `Год должен быть целым числом от 1000 до ${max}` };
  }
  return { value: n, error: null };
}

export function applyFilters(books, { query, genre, minYear, sortKey, sortDir }) {
  let result = filterByQuery(books, query);
  result = filterByGenre(result, genre);
  if (minYear !== null) result = filterByMinYear(result, minYear);
  return sortBooks(result, sortKey, sortDir);
}
