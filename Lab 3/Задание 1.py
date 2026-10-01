class Car:
    def __init__(self, brand: str, model: str, year: int, speed: float = 0.0):
        self.brand = brand  # Марка
        self.model = model  # Модель
        self.year = year    # Год выпуска
        self.speed = speed  # Текущая скорость

    def accelerate(self, amount: float):
        """Увеличивает скорость автомобиля."""
        if amount > 0:
            self.speed += amount
            print(f"{self.brand} {self.model} ускоряется. Текущая скорость: {self.speed} км/ч")
        else:
            print("Значение ускорения должно быть положительным!")

    def stop(self):
        """Останавливает автомобиль (сбрасывает скорость до 0)."""
        self.speed = 0.0
        print(f"{self.brand} {self.model} остановился. Скорость: {self.speed} км/ч")

if __name__ == "__main__":
    my_car = Car(brand="Toyota", model="Camry", year=2023, speed=0.0)
    my_car.accelerate(40)
    my_car.accelerate(60)

    my_car.stop()
