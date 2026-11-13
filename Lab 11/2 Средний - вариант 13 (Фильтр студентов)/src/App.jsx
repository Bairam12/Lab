import StudentList from './components/StudentList.jsx';
import { STUDENTS } from './data/students.js';

export default function App() {
  return (
    <main className="app">
      <h1>Лабораторная работа №11 — вариант 13 (средний)</h1>
      <StudentList students={STUDENTS} />
    </main>
  );
}
