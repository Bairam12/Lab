'use strict';
const crypto = require('crypto');

// Серверное хранилище сессий в памяти (для учебного проекта).
// В браузер уходит только случайный идентификатор — данные пользователя остаются на сервере.
class SessionStore {
  constructor({ ttlMs = 30 * 60 * 1000, idleMs = 15 * 60 * 1000 } = {}) {
    this.ttlMs = ttlMs;     // максимальная длительность сессии
    this.idleMs = idleMs;   // таймаут бездействия
    this.map = new Map();
  }

  create(data) {
    const id = crypto.randomBytes(32).toString('base64url'); // 256 бит энтропии
    const now = Date.now();
    this.map.set(id, { ...data, createdAt: now, lastSeen: now });
    return id;
  }

  expiresAt(s) {
    return Math.min(s.createdAt + this.ttlMs, s.lastSeen + this.idleMs);
  }

  get(id) {
    if (!id) return null;
    const s = this.map.get(id);
    if (!s) return null;
    if (Date.now() >= this.expiresAt(s)) { this.map.delete(id); return null; }
    s.lastSeen = Date.now();
    return s;
  }

  destroy(id) { this.map.delete(id); }

  // «Выйти со всех устройств»
  destroyByUser(userId) {
    for (const [id, s] of this.map) if (s.userId === userId) this.map.delete(id);
  }

  sweep() {
    const now = Date.now();
    for (const [id, s] of this.map) if (now >= this.expiresAt(s)) this.map.delete(id);
  }
}

module.exports = { SessionStore };
