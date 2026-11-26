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


OPENING = "([{"
CLOSING_TO_OPENING = {")": "(", "]": "[", "}": "{"}


def check_brackets(text):
    stack = []  # хранит пары (скобка, позиция)
    for i, ch in enumerate(text):
        if ch in OPENING:
            stack.append((ch, i))
        elif ch in CLOSING_TO_OPENING:
            if not stack:         
                return False, i
            top, _ = stack.pop()
            if top != CLOSING_TO_OPENING[ch]:  
                return False, i
    if stack:                     
        return False, stack[-1][1]
    return True, None


class BracketChecker:
    def __init__(self):
        self.log = OperationLog()

    def check(self, text):
        ok, pos = check_brackets(text)
        result = "верно" if ok else f"ошибка в позиции {pos}"
        self.log.add("проверка", f"«{text}» -> {result}")
        return ok, pos

    def save(self, path="brackets.json"):
        save_json(path, {"log": self.log.records()})


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
    cases = [
        ("Обычный: (a[b]{c})", "(a[b]{c})", (True, None)),
        ("Пустая строка: ''", "", (True, None)),
        ("Только открывающие: ((", "((", (False, 1)),
        ("Закрывающая без пары: )(", ")(", (False, 0)),
        ("Неверный порядок: ([)]", "([)]", (False, 2)),
        ("Граничный: без скобок", "hello world", (True, None)),
        ("Глубокая вложенность: {[()()]}", "{[()()]}", (True, None)),
    ]
    return [(name, expected, check_brackets(text)) for name, text, expected in cases]


def demo():
    checker = BracketChecker()
    for text in ("(a + b) * [c - {d}]", "(]", "((a)", "x)"):
        ok, pos = checker.check(text)
        print(f"{text!r:<24} -> {'верно' if ok else f'ошибка, позиция {pos}'}")
    print("\nЖурнал проверок:")
    checker.log.show()


def menu():
    checker = BracketChecker()
    while True:
        print("\n=== Вариант 14: проверка скобок ===")
        print("1-проверить строку  2-журнал  3-сохранить в JSON")
        print("4-демонстрация  5-тесты  0-выход")
        c = ask("Выбор: ")
        if c == "1":
            text = ask("Строка со скобками: ")
            ok, pos = checker.check(text)
            print("Скобки расставлены верно." if ok else f"Ошибка в позиции {pos}.")
        elif c == "2":
            checker.log.show()
        elif c == "3":
            checker.save()
            print("Сохранено в brackets.json")
        elif c == "4":
            demo()
        elif c == "5":
            run_tests()
        elif c == "0":
            print("До свидания!")
            return
        else:
            print("Неизвестная команда.")


if __name__ == "__main__":
    menu()
