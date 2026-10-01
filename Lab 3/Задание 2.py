class Laptop:
    def __init__(self, manufacturer: str, model: str, ram: int, price: float):
        self.manufacturer = manufacturer  # Производитель
        self.model = model                # Модель
        self.ram = ram                    # RAM (в ГБ)
        self.price = price                # Цена

    def upgrade_ram(self, additional_ram: int):
        """Увеличивает объем оперативной памяти."""
        if additional_ram > 0:
            self.ram += additional_ram
            print(f"Оперативная память ноутбука {self.manufacturer} {self.model} увеличена. Новый объем RAM: {self.ram} ГБ")
        else:
            print("Дополнительный объем RAM должен быть больше нуля!")

    def change_price(self, new_price: float):
        """Изменяет цену ноутбука."""
        if new_price >= 0:
            old_price = self.price
            self.price = new_price
            print(f"Цена ноутбука {self.manufacturer} {self.model} изменена с {old_price} на {self.price}")
        else:
            print("Цена не может быть отрицательной!")

# --- Пример использования ---
if __name__ == "__main__":
    # Создаем объект ноутбука
    my_laptop = Laptop(manufacturer="Apple", model="MacBook Pro", ram=16, price=1500.0)

    # Увеличиваем RAM на 16 ГБ
    my_laptop.upgrade_ram(16)

    # Меняем цену
    my_laptop.change_price(1750.0)
