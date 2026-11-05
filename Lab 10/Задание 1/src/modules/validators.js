// Модуль проверки текста: только вычисления, без работы с DOM.
export function isEmpty(value) {
  return value.trim() === "";
}

export function checkLength(value, min, max) {
  const length = value.trim().length;
  return length >= min && length <= max;
}

// Возвращает текст ошибки или null, если поле корректно.
export function validateField(value, { label, min, max }) {
  if (isEmpty(value)) {
    return `${label}: поле не должно быть пустым`;
  }
  if (!checkLength(value, min, max)) {
    return `${label}: длина должна быть от ${min} до ${max} символов (сейчас ${value.trim().length})`;
  }
  return null;
}
