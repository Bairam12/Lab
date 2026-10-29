// Лабораторная №9, вариант 3: показать 10 задач /todos, выполненные выделять визуально
const API_URL = 'https://jsonplaceholder.typicode.com/todos?_limit=10';

const button = document.querySelector('#load');
const retryButton = document.querySelector('#retry');
const statusEl = document.querySelector('#status');
const results = document.querySelector('#results');
const summary = document.querySelector('#summary');

function setStatus(type, text) {
  statusEl.className = `status ${type}`;
  statusEl.textContent = text;
}

function renderTodo(todo) {
  const item = document.createElement('li');
  // Выполненные задачи выделяются классом (цвет + зачёркивание) и значком ✔
  item.className = `item todo ${todo.completed ? 'done' : 'open'}`;

  const mark = document.createElement('span');
  mark.className = 'mark';
  mark.textContent = todo.completed ? '✔' : '○';

  const text = document.createElement('span');
  text.className = 'text';
  text.textContent = `${todo.id}. ${todo.title ?? '(без названия)'}`;

  // Текстовая метка — состояние понятно не только по цвету
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = todo.completed ? 'выполнена' : 'не выполнена';

  item.append(mark, text, badge);
  return item;
}

async function loadTodos() {
  button.disabled = true;
  retryButton.hidden = true;
  results.replaceChildren();
  summary.textContent = '';
  setStatus('loading', 'Загрузка...');
  const startedAt = performance.now();

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const todos = await response.json();
    if (!Array.isArray(todos) || todos.length === 0) {
      setStatus('empty', 'Задач не найдено');
      return;
    }

    let done = 0;
    for (const todo of todos) {
      if (todo.completed) done++;
      results.append(renderTodo(todo));
    }

    // Творческая функция: счётчик выполненных задач и время ответа
    summary.textContent = `Выполнено: ${done} из ${todos.length}`;
    const ms = Math.round(performance.now() - startedAt);
    setStatus('success', `Загружено задач: ${todos.length} (за ${ms} мс)`);
  } catch (error) {
    setStatus('error', `Ошибка загрузки: ${error.message}`);
    retryButton.hidden = false;
  } finally {
    button.disabled = false;
  }
}

button.addEventListener('click', loadTodos);
retryButton.addEventListener('click', loadTodos);
