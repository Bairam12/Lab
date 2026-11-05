import { BOOKS } from "./modules/data.js";
import { applyFilters, getGenres, parseMinYear } from "./modules/books.js";
import { fillGenres, renderBooks, renderStatus } from "./modules/ui.js";
import { saveFilters, loadFilters } from "./modules/storage.js";

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
