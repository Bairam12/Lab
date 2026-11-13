import { useState } from 'react';

// Вариант 6 (базовый): Spoiler получает заголовок и текст через props,
// а состояние (open) управляет видимостью текста.
export default function Spoiler({ title, text, initiallyOpen = false }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [openCount, setOpenCount] = useState(0);

  const handleToggle = () => {
    if (!open) {
      setOpenCount((n) => n + 1);
    }
    setOpen((value) => !value);
  };

  const handleReset = () => {
    setOpen(false);
    setOpenCount(0);
  };

  return (
    <article className="card">
      <header className="card__header">
        <h3>{title}</h3>
        <span className="badge">Раскрыт раз: {openCount}</span>
      </header>

      {open ? (
        <p className="spoiler__text">{text}</p>
      ) : (
        <p className="muted">Текст скрыт. Нажмите «Показать».</p>
      )}

      <div className="row">
        <button onClick={handleToggle} aria-expanded={open}>
          {open ? 'Скрыть' : 'Показать'}
        </button>
        <button className="ghost" onClick={handleReset}>
          Сброс
        </button>
      </div>
    </article>
  );
}
