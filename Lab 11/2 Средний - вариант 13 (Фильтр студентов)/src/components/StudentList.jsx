import { useState } from 'react';
import StudentCard from './StudentCard.jsx';

// Вариант 13 (средний): StudentList получает массив студентов через props,
// state хранит поисковую строку и выбранную группу и фильтрует список.
export default function StudentList({ students }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('Все');

  const groups = ['Все', ...new Set(students.map((s) => s.group))];
  const normalized = query.trim().toLowerCase();

  const filtered = students.filter((s) => {
    const matchesGroup = group === 'Все' || s.group === group;
    const matchesQuery =
      normalized === '' ||
      s.name.toLowerCase().includes(normalized) ||
      s.specialty.toLowerCase().includes(normalized);
    return matchesGroup && matchesQuery;
  });

  const handleClear = () => {
    setQuery('');
    setGroup('Все');
  };

  return (
    <section>
      <h2>Фильтр студентов</h2>

      <div className="row filters">
        <label>
          Поиск по имени или специальности
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Например: Алия"
          />
        </label>

        <label>
          Группа
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <button className="ghost" onClick={handleClear}>
          Сбросить фильтры
        </button>
      </div>

      <p className="muted">
        Найдено: {filtered.length} из {students.length}
      </p>

      {filtered.length === 0 ? (
        <p className="empty">Студенты не найдены. Измените запрос или сбросьте фильтры.</p>
      ) : (
        <ul className="list">
          {filtered.map((s) => (
            <StudentCard
              key={s.id}
              name={s.name}
              group={s.group}
              specialty={s.specialty}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
