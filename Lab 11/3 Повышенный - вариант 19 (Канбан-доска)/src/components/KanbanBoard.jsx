import { useEffect, useState } from 'react';
import KanbanColumn from './KanbanColumn.jsx';

const STATUSES = [
  { id: 'todo', title: 'К выполнению' },
  { id: 'doing', title: 'В работе' },
  { id: 'done', title: 'Готово' },
];

const STORAGE_KEY = 'lab11-kanban-tasks';
const MAX_LENGTH = 60;

const DEFAULT_TASKS = [
  { id: 1, title: 'Установить Node.js', status: 'done' },
  { id: 2, title: 'Создать проект на Vite', status: 'doing' },
  { id: 3, title: 'Написать отчёт', status: 'todo' },
];

// Творческое задание: сохранение карточек в localStorage.
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_TASKS;
  } catch {
    return DEFAULT_TASKS;
  }
}

// Вариант 19 (повышенный): родитель хранит карточки по статусам
// и перемещает их кнопками.
export default function KanbanBoard() {
  const [tasks, setTasks] = useState(loadTasks);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      /* хранилище недоступно — работаем без сохранения */
    }
  }, [tasks]);

  const handleAdd = (e) => {
    e.preventDefault();
    const text = title.trim();
    if (text === '') {
      setError('Введите название задачи.');
      return;
    }
    if (text.length > MAX_LENGTH) {
      setError(`Название не должно быть длиннее ${MAX_LENGTH} символов.`);
      return;
    }
    setTasks((prev) => [...prev, { id: Date.now(), title: text, status: 'todo' }]);
    setTitle('');
    setError('');
  };

  const handleMove = (id, direction) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const index = STATUSES.findIndex((s) => s.id === task.status);
        const next = STATUSES[index + direction];
        return next ? { ...task, status: next.id } : task;
      })
    );
  };

  const handleDelete = (id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const handleReset = () => {
    setTasks(DEFAULT_TASKS);
    setTitle('');
    setError('');
  };

  const doneCount = tasks.filter((t) => t.status === 'done').length;

  return (
    <section>
      <h2>Канбан-доска</h2>

      <form className="row" onSubmit={handleAdd}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название новой задачи"
          aria-label="Название новой задачи"
        />
        <button type="submit">Добавить</button>
        <button type="button" className="ghost" onClick={handleReset}>
          Сбросить доску
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      <p className="muted">
        Всего задач: {tasks.length} · Выполнено: {doneCount}
      </p>

      <div className="board">
        {STATUSES.map((status, index) => (
          <KanbanColumn
            key={status.id}
            title={status.title}
            index={index}
            total={STATUSES.length}
            tasks={tasks.filter((t) => t.status === status.id)}
            onMove={handleMove}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </section>
  );
}
