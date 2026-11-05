// Запасной файл: собран автоматически из main.js и src/modules/*.js (без import/export).
// Подключается, только если страница открыта двойным щелчком (file://), где браузер блокирует ES-модули.
(function () {
"use strict";
// ===== modules/data.js =====
// Модуль данных: только массив книг.
const BOOKS = [
  { id: 1, title: "Преступление и наказание", author: "Ф. Достоевский", genre: "Роман", year: 1866, rating: 4.9 },
  { id: 2, title: "Война и мир", author: "Л. Толстой", genre: "Роман", year: 1869, rating: 4.8 },
  { id: 3, title: "Путь Абая", author: "М. Ауэзов", genre: "Роман", year: 1942, rating: 4.8 },
  { id: 4, title: "Мастер и Маргарита", author: "М. Булгаков", genre: "Роман", year: 1967, rating: 4.9 },
  { id: 5, title: "1984", author: "Дж. Оруэлл", genre: "Антиутопия", year: 1949, rating: 4.7 },
  { id: 6, title: "Мы", author: "Е. Замятин", genre: "Антиутопия", year: 1924, rating: 4.5 },
  { id: 7, title: "Дюна", author: "Ф. Герберт", genre: "Фантастика", year: 1965, rating: 4.6 },
  { id: 8, title: "Солярис", author: "С. Лем", genre: "Фантастика", year: 1961, rating: 4.5 },
  { id: 9, title: "Чистый код", author: "Р. Мартин", genre: "Программирование", year: 2008, rating: 4.7 },
  { id: 10, title: "Совершенный код", author: "С. Макконнелл", genre: "Программирование", year: 1993, rating: 4.6 },
];

// ===== modules/books.js =====
// Модуль логики: фильтрация и сортировка. Исходный массив не изменяется.
function filterByQuery(books, query) {
  const q = query.trim().toLowerCase();
  if (q === "") return [...books];
  return books.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
}

function filterByGenre(books, genre) {
  return genre === "all" ? [...books] : books.filter((b) => b.genre === genre);
}

function filterByMinYear(books, year) {
  return books.filter((b) => b.year >= year);
}

function sortBooks(books, key, dir = "asc") {
  const k = dir === "desc" ? -1 : 1;
  return [...books].sort((a, b) => {
    const x = a[key], y = b[key];
    return (typeof x === "string" ? x.localeCompare(y, "ru") : x - y) * k;
  });
}

function getGenres(books) {
  return [...new Set(books.map((b) => b.genre))].sort((a, b) => a.localeCompare(b, "ru"));
}

// Разбор поля «год»: пустая строка — фильтр не задан; иначе нужно целое число.
function parseMinYear(text) {
  const t = text.trim();
  if (t === "") return { value: null, error: null };
  const n = Number(t);
  const max = new Date().getFullYear();
  if (!Number.isInteger(n) || n < 1000 || n > max) {
    return { value: null, error: `Год должен быть целым числом от 1000 до ${max}` };
  }
  return { value: n, error: null };
}

function applyFilters(books, { query, genre, minYear, sortKey, sortDir }) {
  let result = filterByQuery(books, query);
  result = filterByGenre(result, genre);
  if (minYear !== null) result = filterByMinYear(result, minYear);
  return sortBooks(result, sortKey, sortDir);
}

// ===== modules/ui.js =====
// Модуль интерфейса: создание карточек и обновление DOM.
function fillGenres(select, genres) {
  select.innerHTML = "";
  for (const g of ["all", ...genres]) {
    const option = document.createElement("option");
    option.value = g;
    option.textContent = g === "all" ? "Все жанры" : g;
    select.append(option);
  }
}

function renderBooks(container, books) {
  container.innerHTML = "";
  if (books.length === 0) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "Ничего не найдено. Измените условия поиска.";
    container.append(p);
    return;
  }
  for (const b of books) {
    const card = document.createElement("article");
    card.className = "card";
    const title = document.createElement("h3");
    title.textContent = b.title;
    const author = document.createElement("p");
    author.textContent = `${b.author}, ${b.year}`;
    const meta = document.createElement("p");
    meta.textContent = `${b.genre} · рейтинг ${b.rating}`;
    card.append(title, author, meta);
    container.append(card);
  }
}

function renderStatus(el, text, isError = false) {
  el.textContent = text;
  el.classList.toggle("error", isError);
}

// ===== modules/storage.js =====
// Дополнительный модуль (творческое задание): запоминает фильтры между запусками.
const KEY = "lab10-books-filters";

function saveFilters(filters) {
  try { localStorage.setItem(KEY, JSON.stringify(filters)); } catch { /* хранилище недоступно */ }
}

function loadFilters() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? null; } catch { return null; }
}

// ===== main.js =====

window.__modulesOk = true; // признак того, что ES-модули загрузились

const $ = (selector) => document.querySelector(selector);
const searchEl = $("#search"), genreEl = $("#genre"), yearEl = $("#min-year"), sortEl = $("#sort");

fillGenres(genreEl, getGenres(BOOKS));

const saved = loadFilters();
if (saved) {
  searchEl.value = saved.query ?? "";
  genreEl.value = saved.genre ?? "all";
  if (!genreEl.value) genreEl.value = "all";
  yearEl.value = saved.minYear ?? "";
  sortEl.value = saved.sort ?? "title:asc";
}

function update() {
  const { value: minYear, error } = parseMinYear(yearEl.value);
  const [sortKey, sortDir] = sortEl.value.split(":");
  const result = applyFilters(BOOKS, { query: searchEl.value, genre: genreEl.value, minYear, sortKey, sortDir });
  renderBooks($("#list"), result);
  renderStatus($("#status"), error ?? `Найдено книг: ${result.length} из ${BOOKS.length}`, Boolean(error));
  saveFilters({ query: searchEl.value, genre: genreEl.value, minYear: yearEl.value, sort: sortEl.value });
}

searchEl.addEventListener("input", update);
genreEl.addEventListener("change", update);
yearEl.addEventListener("input", update);
sortEl.addEventListener("change", update);
$("#reset").addEventListener("click", () => {
  searchEl.value = ""; genreEl.value = "all"; yearEl.value = ""; sortEl.value = "title:asc";
  update();
});

update();

})();
