salary = float(input("Введите заработную плату: "))
bonus_percent = float(input("Введите процент премии: "))

bonus = salary * bonus_percent / 100
salary_with_bonus = salary + bonus
tax = salary_with_bonus * 10 / 100

print("Премия:", bonus)
print("Зарплата с премией:", salary_with_bonus)
print("Подоходный налог 10%:", tax)
