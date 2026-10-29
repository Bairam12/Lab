// Лабораторная №9, вариант 18: параллельная загрузка /users и /posts через Promise.all()
const BASE_URL = 'https://jsonplaceholder.typicode.com';

const button = document.querySelector('#load');
const retryButton = document.querySelector('#retry');
const statusEl = document.querySelector('#status');
const table = document.querySelector('#table');
const rows = document.querySelector('#rows');
const timing = document.querySelector('#timing');

function setStatus(type, text) {
  statusEl.className = `status ${type}`;
  statusEl.textContent = text;
}

// Один запрос: проверка response.ok, разбор JSON и замер времени
async function fetchJson(path) {
  const startedAt = performance.now();
  const response = await fetch(BASE_URL + path);
  if (!response.ok) throw new Error(`HTTP ${response.status} (${path})`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error(`Некорректный формат ответа (${path})`);
  return { data, ms: Math.round(performance.now() - startedAt) };
}

function renderTable(users, counts) {
  rows.replaceChildren();
  const max = Math.max(1, ...counts.values());

  for (const user of users) {
    const count = counts.get(user.id) ?? 0;
    const tr = document.createElement('tr');

    const cells = [user.id, user.name ?? '—', user.email ?? '—', count];
    for (const value of cells) {
      const td = document.createElement('td');
      td.textContent = String(value);
      tr.append(td);
    }

    // Столбик пропорционален числу публикаций
    const barCell = document.createElement('td');
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.width = `${Math.round((count / max) * 100)}%`;
    barCell.append(bar);
    tr.append(barCell);

    rows.append(tr);
  }
}

async function loadAll() {
  button.disabled = true;
  retryButton.hidden = true;
  table.hidden = true;
  timing.textContent = '';
  setStatus('loading', 'Загрузка...');
  const startedAt = performance.now();

  try {
    // Оба запроса стартуют одновременно; ждём, пока завершатся оба
    const [users, posts] = await Promise.all([fetchJson('/users'), fetchJson('/posts')]);
    const total = Math.round(performance.now() - startedAt);

    if (users.data.length === 0) {
      setStatus('empty', 'Список пользователей пуст');
      return;
    }

    // Подсчёт публикаций каждого пользователя
    const counts = new Map();
    for (const post of posts.data) {
      counts.set(post.userId, (counts.get(post.userId) ?? 0) + 1);
    }

    renderTable(users.data, counts);
    table.hidden = false;
    setStatus('success', `Пользователей: ${users.data.length}, публикаций: ${posts.data.length}`);

    // Творческая функция: сравнение параллельной и последовательной загрузки
    timing.textContent =
      `/users: ${users.ms} мс · /posts: ${posts.ms} мс · ` +
      `параллельно: ${total} мс (последовательно было бы ≈ ${users.ms + posts.ms} мс)`;
  } catch (error) {
    setStatus('error', `Ошибка загрузки: ${error.message}`);
    retryButton.hidden = false;
  } finally {
    button.disabled = false;
  }
}

button.addEventListener('click', loadAll);
retryButton.addEventListener('click', loadAll);
