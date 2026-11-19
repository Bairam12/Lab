'use strict';
// Ограничение числа неудачных попыток входа (защита от перебора пароля).
class LoginLimiter {
  constructor({ max = 5, windowMs = 60_000 } = {}) { this.max = max; this.windowMs = windowMs; this.map = new Map(); }
  _fresh(key) {
    const now = Date.now();
    const e = this.map.get(key);
    if (!e || now - e.start > this.windowMs) { const n = { start: now, count: 0 }; this.map.set(key, n); return n; }
    return e;
  }
  blocked(key) { return this._fresh(key).count >= this.max; }
  fail(key) { this._fresh(key).count++; }
  reset(key) { this.map.delete(key); }
}
module.exports = { LoginLimiter };
