// Модуль интерфейса: создание карточек и обновление DOM.
export function fillGenres(select, genres) {
  select.innerHTML = "";
  for (const g of ["all", ...genres]) {
    const option = document.createElement("option");
    option.value = g;
    option.textContent = g === "all" ? "Все жанры" : g;
    select.append(option);
  }
}

export function renderBooks(container, books) {
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

export function renderStatus(el, text, isError = false) {
  el.textContent = text;
  el.classList.toggle("error", isError);
}
