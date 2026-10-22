// Данные разделов хранятся в JavaScript-объекте
const data = {
  workouts: {
    title: "Расписание тренировок",
    items: [
      { title: "Йога", lines: ["Пн, Ср — 09:00", "Уровень: начальный"] },
      { title: "Кроссфит", lines: ["Вт, Чт — 18:30", "Уровень: средний"] },
      { title: "Плавание", lines: ["Пн, Пт — 19:00", "Уровень: любой"] },
      { title: "Бокс", lines: ["Ср, Сб — 17:00", "Уровень: средний"] },
    ],
  },
  trainers: {
    title: "Наши тренеры",
    items: [
      { title: "Алия Нурлановна", lines: ["Йога, пилатес", "Стаж: 8 лет"] },
      { title: "Данияр Сериков", lines: ["Кроссфит, силовые", "Стаж: 6 лет"] },
      { title: "Марат Ержанов", lines: ["Бокс", "Стаж: 11 лет"] },
    ],
  },
  plans: {
    title: "Абонементы",
    items: [
      { title: "Месячный", lines: ["12 000 ₸", "Безлимит на 30 дней"] },
      { title: "Квартальный", lines: ["30 000 ₸", "Безлимит на 90 дней + 1 персональная"] },
      { title: "Годовой", lines: ["96 000 ₸", "Безлимит + бассейн + сауна"] },
    ],
  },
};

const tabs = document.querySelector("#tabs");
const buttons = tabs.querySelectorAll("[data-page]");
const content = document.querySelector("#content");
const STORAGE_KEY = "sportclub:lastTab";

function createCard(item) {
  const card = document.createElement("div");
  card.className = "card";
  const h3 = document.createElement("h3");
  h3.textContent = item.title;
  card.append(h3);
  item.lines.forEach((line) => {
    const p = document.createElement("p");
    p.textContent = line;
    card.append(p);
  });
  return card;
}

function showPage(page) {
  if (!data[page]) page = "workouts";             // защита от неверного значения
  buttons.forEach((btn) => {
    const active = btn.dataset.page === page;
    btn.classList.toggle("active", active);        // выделение активной вкладки
    btn.setAttribute("aria-selected", active);
    btn.tabIndex = active ? 0 : -1;
  });
  const title = document.createElement("h2");
  title.textContent = data[page].title;
  const grid = document.createElement("div");
  grid.className = "grid";
  data[page].items.forEach((item) => grid.append(createCard(item)));
  content.replaceChildren(title, grid);
  try { localStorage.setItem(STORAGE_KEY, page); } catch (e) { /* хранилище недоступно */ }
}

buttons.forEach((btn) =>
  btn.addEventListener("click", () => showPage(btn.dataset.page))
);

// Дополнительная функция: клавиатурная навигация стрелками
tabs.addEventListener("keydown", (event) => {
  const list = [...buttons];
  const i = list.findIndex((b) => b.classList.contains("active"));
  let next = null;
  if (event.key === "ArrowRight") next = list[(i + 1) % list.length];
  if (event.key === "ArrowLeft") next = list[(i - 1 + list.length) % list.length];
  if (next) { showPage(next.dataset.page); next.focus(); }
});

// Дополнительная функция: запоминание последней вкладки
let last = null;
try { last = localStorage.getItem(STORAGE_KEY); } catch (e) {}
showPage(last || "workouts");
