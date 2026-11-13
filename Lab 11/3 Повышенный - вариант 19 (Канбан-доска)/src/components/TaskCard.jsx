// Вариант 19: TaskCard получает задачу через props.
// Сам карточка ничего не хранит — о действиях сообщает родителю через onMove/onDelete.
export default function TaskCard({ task, canMoveLeft, canMoveRight, onMove, onDelete }) {
  return (
    <li className="card task">
      <p className="task__title">{task.title}</p>
      <div className="row">
        <button
          className="ghost"
          disabled={!canMoveLeft}
          onClick={() => onMove(task.id, -1)}
          aria-label="Переместить влево"
        >
          ←
        </button>
        <button
          className="ghost"
          disabled={!canMoveRight}
          onClick={() => onMove(task.id, 1)}
          aria-label="Переместить вправо"
        >
          →
        </button>
        <button className="danger" onClick={() => onDelete(task.id)}>
          Удалить
        </button>
      </div>
    </li>
  );
}
