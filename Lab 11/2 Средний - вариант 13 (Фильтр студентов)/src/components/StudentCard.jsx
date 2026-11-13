// Дочерний компонент: только отображает данные, полученные через props.
export default function StudentCard({ name, group, specialty }) {
  return (
    <li className="card student">
      <strong>{name}</strong>
      <span className="badge">{group}</span>
      <span className="muted">{specialty}</span>
    </li>
  );
}
