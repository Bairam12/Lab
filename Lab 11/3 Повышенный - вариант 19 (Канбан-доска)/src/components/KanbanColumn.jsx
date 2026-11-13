import TaskCard from './TaskCard.jsx';

// Колонка получает название, задачи, свой индекс и обработчики от родителя.
export default function KanbanColumn({ title, index, total, tasks, onMove, onDelete }) {
  return (
    <section className="column">
      <h3>
        {title} <span className="badge">{tasks.length}</span>
      </h3>
      {tasks.length === 0 ? (
        <p className="empty">Нет задач</p>
      ) : (
        <ul className="list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canMoveLeft={index > 0}
              canMoveRight={index < total - 1}
              onMove={onMove}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
