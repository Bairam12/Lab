import Spoiler from './Spoiler.jsx';

const SPOILERS = [
  {
    id: 1,
    title: 'Что такое props?',
    text: 'Props — входные данные компонента. Их передаёт родитель, а дочерний компонент только читает их и не изменяет.',
    initiallyOpen: false,
  },
  {
    id: 2,
    title: 'Что такое state?',
    text: 'State — локальные данные компонента. При изменении state через сеттер (например, setOpen) React перерисовывает интерфейс.',
    initiallyOpen: false,
  },
  {
    id: 3,
    title: 'Этот спойлер открыт сразу',
    text: 'Начальное значение берётся из props initiallyOpen. Каждый экземпляр Spoiler хранит своё независимое состояние.',
    initiallyOpen: true,
  },
];

export default function SpoilerDemo() {
  return (
    <section>
      <h2>Показ/скрытие текста (Spoiler)</h2>
      <p className="muted">
        Три экземпляра одного компонента — состояния независимы друг от друга.
      </p>
      <div className="stack">
        {SPOILERS.map((item) => (
          <Spoiler
            key={item.id}
            title={item.title}
            text={item.text}
            initiallyOpen={item.initiallyOpen}
          />
        ))}
      </div>
    </section>
  );
}
