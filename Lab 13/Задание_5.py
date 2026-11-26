import json
import sys
from collections import deque
from datetime import datetime

try:  
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


class OperationLog:
    """Журнал операций: список словарей {время, действие, подробности}."""

    def __init__(self):
        self._records = [] 

    def add(self, action, details=""):
        self._records.append({
            "time": datetime.now().strftime("%H:%M:%S"),
            "action": action,
            "details": details,
        })

    def records(self):
        return list(self._records)

    def __len__(self):
        return len(self._records)

    def show(self):
        if not self._records:
            print("Журнал пуст.")
            return
        for i, r in enumerate(self._records, 1):
            print(f"{i:>2}. [{r['time']}] {r['action']}: {r['details']}")


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class VisitorQueue:
    def __init__(self):
        self._queue = deque()
        self.log = OperationLog()

    def register(self, name):
        name = name.strip()
        if not name:
            raise ValueError("Имя посетителя не может быть пустым")
        self._queue.append(name)
        self.log.add("регистрация", name)
        return len(self._queue)

    def serve(self):
        if not self._queue:
            self.log.add("обслуживание", "очередь пуста")
            return None
        visitor = self._queue.popleft()
        self.log.add("обслуживание", visitor)
        return visitor

    def view(self):
        return list(self._queue)

    def __len__(self):
        return len(self._queue)

    def save(self, path="visitors.json"):
        save_json(path, {"queue": list(self._queue), "log": self.log.records()})


def ask(prompt):
    try:
        return input(prompt).strip()
    except EOFError:
        return "0"


def run_tests():
    rows = build_tests()
    print(f"\n{'№':<3}{'Тест':<52}{'Ожидалось':<22}{'Получено':<22}Статус")
    print("-" * 106)
    passed = 0
    for i, (name, expected, actual) in enumerate(rows, 1):
        ok = expected == actual
        passed += ok
        print(f"{i:<3}{name:<52}{str(expected):<22}{str(actual):<22}"
              f"{'OK' if ok else 'ОШИБКА'}")
    print(f"\nИтого: пройдено {passed} из {len(rows)}")


def _raises_value_error(func, *args):
    try:
        func(*args)
    except ValueError:
        return "ValueError"
    return "нет ошибки"


def build_tests():
    rows = []
    q = VisitorQueue()
    q.register("Алия")
    q.register("Дамир")
    rows.append(("Обычный сценарий: Алия, Дамир -> serve()", "Алия", q.serve()))
    rows.append(("Пустая очередь: serve()", None, VisitorQueue().serve()))
    q = VisitorQueue()
    q.register("Алия")
    q.register("Алия")
    rows.append(("Дубликат: два раза «Алия» -> view()", ["Алия", "Алия"], q.view()))
    rows.append(("Пустое имя: register('   ')", "ValueError",
                 _raises_value_error(VisitorQueue().register, "   ")))
    q = VisitorQueue()
    q.register("Асем")
    q.serve()
    rows.append(("Граничный: один посетитель обслужен -> len()", 0, len(q)))
    q = VisitorQueue()
    for n in ("A", "B", "C"):
        q.register(n)
    rows.append(("Порядок FIFO: A, B, C -> три serve()", ["A", "B", "C"],
                 [q.serve(), q.serve(), q.serve()]))
    return rows


def demo():
    q = VisitorQueue()
    for name in ("Алия", "Дамир", "Асем"):
        print(f"Зарегистрирован {name}, место в очереди: {q.register(name)}")
    print("Очередь:", q.view())
    print("Обслужен:", q.serve())
    print("Очередь:", q.view())
    print("\nЖурнал операций:")
    q.log.show()


def menu():
    q = VisitorQueue()
    while True:
        print("\n=== Вариант 5: очередь посетителей ===")
        print("1-регистрация  2-обслужить  3-просмотр  4-журнал")
        print("5-сохранить в JSON  6-демонстрация  7-тесты  0-выход")
        c = ask("Выбор: ")
        if c == "1":
            try:
                print("Место в очереди:", q.register(ask("Имя: ")))
            except ValueError as e:
                print("Ошибка:", e)
        elif c == "2":
            v = q.serve()
            print("Обслужен:", v) if v else print("Очередь пуста.")
        elif c == "3":
            print("Очередь:", q.view() or "пуста")
        elif c == "4":
            q.log.show()
        elif c == "5":
            q.save()
            print("Сохранено в visitors.json")
        elif c == "6":
            demo()
        elif c == "7":
            run_tests()
        elif c == "0":
            print("До свидания!")
            return
        else:
            print("Неизвестная команда.")


if __name__ == "__main__":
    menu()
