// Модуль проверки данных формы. Возвращает массив сообщений об ошибках.
import { getRoom } from "./rooms.js";
import { timeToMinutes, hasConflict } from "./booking.js";

export const WORK_START = "08:00";
export const WORK_END = "21:00";
export const MIN_DURATION = 30;

export function validateBooking(data, bookings) {
  const errors = [];
  const room = getRoom(data.roomId);
  if (!room) errors.push("Выберите аудиторию");
  if (!data.date) errors.push("Укажите дату");

  const start = timeToMinutes(data.start);
  const end = timeToMinutes(data.end);
  if (start === null || end === null) {
    errors.push("Укажите время начала и окончания в формате ЧЧ:ММ");
  } else {
    if (start >= end) {
      errors.push("Время окончания должно быть позже времени начала");
    } else if (end - start < MIN_DURATION) {
      errors.push(`Минимальная длительность — ${MIN_DURATION} минут`);
    }
    if (start < timeToMinutes(WORK_START) || end > timeToMinutes(WORK_END)) {
      errors.push(`Бронирование возможно с ${WORK_START} до ${WORK_END}`);
    }
  }

  if (data.purpose.trim().length < 3) errors.push("Укажите цель бронирования (не менее 3 символов)");

  const people = Number(data.attendees);
  if (!Number.isInteger(people) || people < 1) {
    errors.push("Количество участников — целое число не меньше 1");
  } else if (room && people > room.capacity) {
    errors.push(`Вместимость аудитории — ${room.capacity} мест`);
  }

  if (errors.length === 0 && hasConflict(bookings, data)) {
    errors.push("Аудитория уже занята в это время");
  }
  return errors;
}
