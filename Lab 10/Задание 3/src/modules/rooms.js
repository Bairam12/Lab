// Модуль данных об аудиториях.
export const ROOMS = [
  { id: "A-101", name: "Аудитория A-101", capacity: 30 },
  { id: "A-205", name: "Аудитория A-205", capacity: 60 },
  { id: "LAB-3", name: "Компьютерный класс LAB-3", capacity: 20 },
  { id: "HALL", name: "Актовый зал", capacity: 150 },
];

export function getRoom(id) {
  return ROOMS.find((room) => room.id === id) ?? null;
}
