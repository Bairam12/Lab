'use strict';
// ЛР №12, вариант 5 — вход в интернет-магазин: гостевой и пользовательский интерфейс.
// Серверная сессия + cookie HttpOnly/SameSite, проверка прав на сервере (401/403).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { secureHeaders, sendJson, parseCookies, sessionCookie, clearCookie, readJson, sameOrigin, serveStatic } = require('./lib/http-utils');
const { SessionStore } = require('./lib/sessions');
const { verifyPassword, DUMMY_HASH } = require('./lib/passwords');
const { LoginLimiter } = require('./lib/rate-limit');

const PUBLIC_DIR = path.join(__dirname, 'public');
const PRODUCTS = [
  { id: 1, name: 'Ноутбук Aero 14', price: 389000 },
  { id: 2, name: 'Смартфон Nova X', price: 219000 },
  { id: 3, name: 'Наушники Wave Pro', price: 45000 },
  { id: 4, name: 'Механическая клавиатура', price: 32000 },
  { id: 5, name: 'Монитор 27" QHD', price: 124000 },
];

function createServer({ ttlMs = 30 * 60 * 1000, idleMs = 15 * 60 * 1000 } = {}) {
  const sessions = new SessionStore({ ttlMs, idleMs });
  const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8'));
  const limiter = new LoginLimiter({ max: 5, windowMs: 60_000 });
  const carts = new Map();   // userId -> Map(productId -> qty)
  const orders = [];         // { id, userId, items, total }

  const publicUser = (u) => ({ id: u.id, login: u.login, name: u.name, role: u.role });

  function auth(req) {
    const sid = parseCookies(req).sid;
    const session = sessions.get(sid);
    return session ? { sid, session } : null;
  }

  // Защита ресурса на сервере: нет сессии -> 401.
  function requireAuth(req, res) {
    const a = auth(req);
    if (!a) { sendJson(res, 401, { error: 'UNAUTHORIZED', message: 'Требуется вход в систему' }); return null; }
    return a;
  }

  function cartView(userId) {
    const cart = carts.get(userId) || new Map();
    const items = [...cart].map(([productId, qty]) => {
      const p = PRODUCTS.find((x) => x.id === productId);
      return { productId, name: p.name, price: p.price, qty, sum: p.price * qty };
    });
    return { items, total: items.reduce((s, i) => s + i.sum, 0) };
  }

  async function api(req, res, url) {
    const route = `${req.method} ${url.pathname}`;
    if (req.method !== 'GET' && !sameOrigin(req)) return sendJson(res, 403, { error: 'BAD_ORIGIN' });

    // ---------- публичные маршруты (гость) ----------
    if (route === 'GET /api/products') return sendJson(res, 200, { products: PRODUCTS });

    if (route === 'POST /api/login') {
      const { login, password } = await readJson(req);
      if (typeof login !== 'string' || typeof password !== 'string' || !login.trim() || !password) {
        return sendJson(res, 400, { error: 'EMPTY_FIELDS', message: 'Введите логин и пароль' });
      }
      const key = `${req.socket.remoteAddress}|${login.trim().toLowerCase()}`;
      if (limiter.blocked(key)) {
        return sendJson(res, 429, { error: 'TOO_MANY_ATTEMPTS', message: 'Слишком много попыток. Подождите минуту.' });
      }
      const user = users.find((u) => u.login === login.trim());
      const ok = verifyPassword(password, user ? user.passwordHash : DUMMY_HASH) && !!user;
      if (!ok) {
        limiter.fail(key);
        return sendJson(res, 401, { error: 'INVALID_CREDENTIALS', message: 'Неверный логин или пароль' });
      }
      limiter.reset(key);
      // Всегда создаём НОВУЮ сессию при входе (защита от session fixation).
      const old = parseCookies(req).sid;
      if (old) sessions.destroy(old);
      const sid = sessions.create({ userId: user.id });
      const s = sessions.get(sid);
      return sendJson(res, 200, { user: publicUser(user), expiresAt: sessions.expiresAt(s) },
        { 'Set-Cookie': sessionCookie('sid', sid, Math.floor(ttlMs / 1000)) });
    }

    if (route === 'POST /api/logout') {
      const sid = parseCookies(req).sid;
      if (sid) sessions.destroy(sid);   // сессия уничтожается на сервере
      return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie('sid') });
    }

    // ---------- защищённые маршруты (пользователь) ----------
    const a = requireAuth(req, res);
    if (!a) return;
    const userId = a.session.userId;

    if (route === 'GET /api/me') {
      const user = users.find((u) => u.id === userId);
      return sendJson(res, 200, { user: publicUser(user), expiresAt: sessions.expiresAt(a.session) });
    }
    if (route === 'GET /api/cart') return sendJson(res, 200, cartView(userId));

    if (route === 'POST /api/cart') {
      const { productId, qty } = await readJson(req);
      const product = PRODUCTS.find((p) => p.id === productId);
      if (!product || !Number.isInteger(qty) || qty < 1 || qty > 20) return sendJson(res, 400, { error: 'BAD_ITEM', message: 'Некорректный товар или количество' });
      const cart = carts.get(userId) || new Map();
      cart.set(productId, (cart.get(productId) || 0) + qty);
      carts.set(userId, cart);
      return sendJson(res, 200, cartView(userId));
    }

    if (route === 'POST /api/checkout') {
      const view = cartView(userId);
      if (!view.items.length) return sendJson(res, 400, { error: 'EMPTY_CART', message: 'Корзина пуста' });
      const order = { id: orders.length + 1, userId, items: view.items, total: view.total };
      orders.push(order);
      carts.delete(userId);
      return sendJson(res, 201, { orderId: order.id, total: order.total });
    }

    if (req.method === 'GET' && /^\/api\/orders\/\d+$/.test(url.pathname)) {
      const order = orders.find((o) => o.id === Number(url.pathname.split('/').pop()));
      if (!order) return sendJson(res, 404, { error: 'NOT_FOUND' });
      // Чужой заказ -> 403: пользователь вошёл, но прав на этот ресурс у него нет.
      if (order.userId !== userId) return sendJson(res, 403, { error: 'FORBIDDEN', message: 'Это не ваш заказ' });
      return sendJson(res, 200, order);
    }

    return sendJson(res, 404, { error: 'NOT_FOUND' });
  }

  const server = http.createServer(async (req, res) => {
    try {
      secureHeaders(res);
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      return serveStatic(req, res, PUBLIC_DIR);
    } catch (e) {
      if (e && e.status) return sendJson(res, e.status, { error: e.error });
      console.error(e);
      return sendJson(res, 500, { error: 'SERVER_ERROR' });
    }
  });
  const timer = setInterval(() => sessions.sweep(), 60_000);
  timer.unref();
  return server;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3005;
  createServer().listen(port, () => console.log(`Магазин: http://localhost:${port}`))
    .on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `Порт ${port} уже занят: сервер, возможно, уже запущен. Закройте другое окно сервера.` : e); process.exit(1); });
}
module.exports = { createServer };
