// Дополнительный модуль (творческое задание): статистика текста.
export function countChars(text) {
  return text.trim().length;
}

export function countWords(text) {
  const t = text.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}
