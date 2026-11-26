import json
import sys
from collections import deque
from datetime import datetime

try:  # чтобы русский текст выводился нормально и во вкладке OUTPUT в VS Code
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


class OperationLog:
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


class TaskScheduler:
    def __init__(self):
        self._urgent = deque()
        self._normal = deque()
        self.log = OperationLog()

    def add(self, task, urgent=False):
        task = task.strip()
        if not task:
            raise ValueError("Название задачи не может быть пустым")
        (self._urgent if urgent else self._normal).append(task)
        self.log.add("добавление", f"{task} ({'срочная' if urgent else 'обычная'})")

    def next_task(self):
        if self._urgent:
            task, level = self._urgent.popleft(), "срочная"
        elif self._normal:
            task, level = self._normal.popleft(), "обычная"
        else:
            self.log.add("выполнение", "задач нет")
            return None
        self.log.add("выполнение", f"{task} ({level})")
        return task

    def view(self):
        return {"urgent": list(self._urgent), "normal": list(self._normal)}

    def __len__(self):
        return len(self._urgent) + len(self._normal)

    def save(self, path="scheduler.json"):
        save_json(path, {**self.view(), "log": self.log.records()})


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
    s = TaskScheduler()
    s.add("t1")
    s.add("t2")
    rows.append(("Обычный сценарий: t1, t2 -> next_task()", "t1", s.next_task()))
    s = TaskScheduler()
    s.add("t1")
    s.add("u1", urgent=True)
    rows.append(("Срочная раньше обычной: t1, u1(срочная)", ["u1", "t1"],
                 [s.next_task(), s.next_task()]))
    rows.append(("Пустой планировщик: next_task()", None, TaskScheduler().next_task()))
    s = TaskScheduler()
    s.add("u1", urgent=True)
    s.add("u2", urgent=True)
    rows.append(("FIFO внутри срочных: u1, u2", ["u1", "u2"],
                 [s.next_task(), s.next_task()]))
    s = TaskScheduler()
    s.add("отчёт")
    s.add("отчёт")
    rows.append(("Дубликат: две одинаковые задачи -> len()", 2, len(s)))
    rows.append(("Пустое название: add('')", "ValueError",
                 _raises_value_error(TaskScheduler().add, "")))
    s = TaskScheduler()
    s.add("t1")
    s.next_task()
    rows.append(("Граничный: после выполнения всех -> len()", 0, len(s)))
    return rows


def demo():
    s = TaskScheduler()
    s.add("Написать отчёт")
    s.add("Починить сервер", urgent=True)
    s.add("Ответить на письма")
    s.add("Восстановить базу", urgent=True)
    print("Состояние:", s.view())
    while len(s):
        print("Выполняется:", s.next_task())
    print("\nЖурнал операций:")
    s.log.show()


def menu():
    s = TaskScheduler()
    while True:
        print("\n=== Вариант 16: планировщик задач ===")
        print("1-обычная задача  2-срочная задача  3-выполнить  4-просмотр")
        print("5-журнал  6-сохранить в JSON  7-демонстрация  8-тесты  0-выход")
        c = ask("Выбор: ")
        if c in ("1", "2"):
            try:
                s.add(ask("Задача: "), urgent=(c == "2"))
            except ValueError as e:
                print("Ошибка:", e)
        elif c == "3":
            t = s.next_task()
            print("Выполняется:", t) if t else print("Задач нет.")
        elif c == "4":
            print("Состояние:", s.view())
        elif c == "5":
            s.log.show()
        elif c == "6":
            s.save()
            print("Сохранено в scheduler.json")
        elif c == "7":
            demo()
        elif c == "8":
            run_tests()
        elif c == "0":
            print("До свидания!")
            return
        else:
            print("Неизвестная команда.")


if __name__ == "__main__":
    menu()
