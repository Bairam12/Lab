class ATMAccount:
    def __init__(self, owner: str, initial_pin: str, initial_balance: float = 0.0):
        self.owner = owner
        self.__pin = initial_pin      # Закрытый (инкапсулированный) PIN-код
        self.__balance = initial_balance  # Закрытый баланс счета

    def verify_pin(self, entered_pin: str) -> bool:
        """Проверяет правильность введенного PIN-кода."""
        return self.__pin == entered_pin

    def get_balance(self, entered_pin: str) -> float:
        """Возвращает баланс, если введен верный PIN-код."""
        if self.verify_pin(entered_pin):
            return self.__balance
        else:
            print("Ошибка: Неверный PIN-код!")
            return None

    def deposit(self, amount: float):
        """Пополняет баланс счета."""
        if amount > 0:
            self.__balance += amount
            print(f"Счет успешно пополнен на {amount}. Текущий баланс: {self.__balance}")
        else:
            print("Сумма пополнения должна быть больше нуля!")

    def withdraw(self, amount: float, entered_pin: str) -> bool:
        """Снимает средства со счета при условии верного PIN-кода и достаточного баланса."""
        if not self.verify_pin(entered_pin):
            print("Ошибка: Неверный PIN-код!")
            return False
        
        if amount <= 0:
            print("Сумма для снятия должна быть больше нуля!")
            return False
            
        if amount > self.__balance:
            print("Ошибка: Недостаточно средств на счете!")
            return False
            
        self.__balance -= amount
        print(f"Успешно снято {amount}. Остаток на счете: {self.__balance}")
        return True


if __name__ == "__main__":
    my_account = ATMAccount(owner="Иван Иванов", initial_pin="1234", initial_balance=5000.0)

    my_account.get_balance("0000")

    balance = my_account.get_balance("1234")
    print(f"Баланс: {balance}")

    my_account.deposit(1500.0)

    my_account.withdraw(2000.0, "1111")  # Неверный PIN
    my_account.withdraw(2000.0, "1234")  # Успешно
