'use strict';
const Sim = (() => {
  const USERS = [
    { id: 1, login: 'student', name: 'Студент Тестов', role: 'customer', salt: 'ec1505e71d4e2755122ccf8d669e5d97', hash: 'a5a74b181f1579802ef4d62820fe5c192bba7380b97c4cc6c1bf40347fd67554' },
    { id: 2, login: 'aigerim', name: 'Айгерим Тестова', role: 'customer', salt: 'd9dd7e96ef55fe33ad4171f296b2ebce', hash: 'de44f0e552ca753b2c360eb44eb08c7f53b7feed91a627570da0576312430eb2' },
  ];
  const PRODUCTS = [
    { id: 1, name: 'Ноутбук Aero 14', price: 389000 },
    { id: 2, name: 'Смартфон Nova X', price: 219000 },
    { id: 3, name: 'Наушники Wave Pro', price: 45000 },
    { id: 4, name: 'Механическая клавиатура', price: 32000 },
    { id: 5, name: 'Монитор 27" QHD', price: 124000 },
  ];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* хранилище недоступно */ } },
  };
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const attempts = new Map();                        // защита от перебора пароля
  const ttlSeconds = () => Number(store.get('sim.ttlSeconds', 1800)) || 1800;
  const publicUser = (u) => ({ id: u.id, login: u.login, name: u.name, role: u.role });

  function getSession(token) {
    if (!token) return null;
    const all = store.get('sim.sessions', {});
    const s = all[token];
    if (!s) return null;
    if (Date.now() >= s.expiresAt) { delete all[token]; store.set('sim.sessions', all); return null; } // срок вышел
    return s;
  }
  function cartView(userId) {
    const cart = store.get('sim.carts', {})[userId] || {};
    const items = Object.entries(cart).map(([pid, qty]) => {
      const p = PRODUCTS.find((x) => x.id === Number(pid));
      return { productId: p.id, name: p.name, price: p.price, qty, sum: p.price * qty };
    });
    return { items, total: items.reduce((s, i) => s + i.sum, 0) };
  }
  const R = (status, data) => ({ status, data });

  async function route(method, path, body, token) {
    if (method === 'GET' && path === '/products') return R(200, { products: PRODUCTS });

    if (method === 'POST' && path === '/login') {
      const login = body && typeof body.login === 'string' ? body.login.trim() : '';
      const password = body && typeof body.password === 'string' ? body.password : '';
      if (!login || !password) return R(400, { error: 'EMPTY_FIELDS', message: 'Введите логин и пароль' });
      const a = attempts.get(login) || { count: 0, start: Date.now() };
      if (Date.now() - a.start > 60000) { a.count = 0; a.start = Date.now(); }
      if (a.count >= 5) return R(429, { error: 'TOO_MANY_ATTEMPTS', message: 'Слишком много попыток. Подождите минуту.' });
      const user = USERS.find((u) => u.login === login);
      const hash = await CU.pbkdf2Hex(password, user ? user.salt : USERS[0].salt);
      if (!user || hash !== user.hash) {
        attempts.set(login, { count: a.count + 1, start: a.start });
        return R(401, { error: 'INVALID_CREDENTIALS', message: 'Неверный логин или пароль' });
      }
      attempts.delete(login);
      const all = store.get('sim.sessions', {});
      if (token) delete all[token];                
      const newToken = CU.randomString(32);
      const expiresAt = Date.now() + ttlSeconds() * 1000;
      all[newToken] = { userId: user.id, createdAt: Date.now(), expiresAt };
      store.set('sim.sessions', all);
      return R(200, { user: publicUser(user), expiresAt, token: newToken });
    }

    if (method === 'POST' && path === '/logout') {
      const all = store.get('sim.sessions', {});
      if (token) { delete all[token]; store.set('sim.sessions', all); }  
      return R(200, { ok: true });
    }

    const session = getSession(token);
    if (!session) return R(401, { error: 'UNAUTHORIZED', message: 'Требуется вход в систему' });
    const userId = session.userId;

    if (method === 'GET' && path === '/me') {
      return R(200, { user: publicUser(USERS.find((u) => u.id === userId)), expiresAt: session.expiresAt });
    }
    if (method === 'GET' && path === '/cart') return R(200, cartView(userId));

    if (method === 'POST' && path === '/cart') {
      const product = PRODUCTS.find((p) => p.id === (body && body.productId));
      const qty = body && body.qty;
      if (!product || !Number.isInteger(qty) || qty < 1 || qty > 20) return R(400, { error: 'BAD_ITEM', message: 'Некорректный товар или количество' });
      const carts = store.get('sim.carts', {});
      carts[userId] = carts[userId] || {};
      carts[userId][product.id] = (carts[userId][product.id] || 0) + qty;
      store.set('sim.carts', carts);
      return R(200, cartView(userId));
    }

    if (method === 'POST' && path === '/checkout') {
      const view = cartView(userId);
      if (!view.items.length) return R(400, { error: 'EMPTY_CART', message: 'Корзина пуста' });
      const orders = store.get('sim.orders', []);
      const order = { id: orders.length + 1, userId, items: view.items, total: view.total };
      orders.push(order);
      store.set('sim.orders', orders);
      const carts = store.get('sim.carts', {});
      delete carts[userId];
      store.set('sim.carts', carts);
      return R(201, { orderId: order.id, total: order.total });
    }

    const m = path.match(/^\/orders\/(\d+)$/);
    if (method === 'GET' && m) {
      const order = store.get('sim.orders', []).find((o) => o.id === Number(m[1]));
      if (!order) return R(404, { error: 'NOT_FOUND', message: 'Заказ не найден' });
      if (order.userId !== userId) return R(403, { error: 'FORBIDDEN', message: 'Это не ваш заказ' });
      return R(200, order);
    }
    return R(404, { error: 'NOT_FOUND' });
  }

  async function request(method, path, { body, token } = {}) {
    await delay(80);                                
    try { return await route(method, path, body, token); }
    catch (e) { console.error(e); return R(500, { error: 'SERVER_ERROR', message: 'Ошибка сервера' }); }
  }
  return { request, ttlSeconds, setTtl: (s) => store.set('sim.ttlSeconds', s), resetAll: () => { ['sim.sessions', 'sim.carts', 'sim.orders'].forEach((k) => localStorage.removeItem(k)); } };
})();
