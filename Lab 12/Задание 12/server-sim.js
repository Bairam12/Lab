'use strict';
const Sim = (() => {
  const USERS = [
    { id: 1, login: 'alice', name: 'Алия', role: 'user', salt: '8633ea1f4a42c77da161900ab1baa242', hash: '8a974a045647b0e145dc54476b3362e14a3f0dd18d20316d75e867ef82da1745' },
    { id: 2, login: 'bob', name: 'Борис', role: 'user', salt: 'fd50728d2c20f879d699f162363e1268', hash: '01595d6dbb04341227f9ac3c41c2e353c799a2e8857c7ae9fba31fb132e109d0' },
    { id: 3, login: 'moderator', name: 'Модератор', role: 'moderator', salt: 'a425e302e7d746705b686c76079ab1cf', hash: '457a3a17e0e44cff2909a2af43671827348739994b598be281debbe77db65cc3' },
  ];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* хранилище недоступно */ } },
  };
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const attempts = new Map();
  const ttlSeconds = () => Number(store.get('sim.ttlSeconds', 1800)) || 1800;
  const publicUser = (u) => ({ id: u.id, login: u.login, name: u.name, role: u.role });
  const R = (status, data) => ({ status, data });

  const seedPosts = () => [
    { id: 1, authorId: 1, author: 'Алия', text: 'Добро пожаловать на форум! Читать могут все, писать — после входа.', createdAt: Date.now() - 3600000 },
    { id: 2, authorId: 2, author: 'Борис', text: 'Подскажите, чем access token отличается от refresh token?', createdAt: Date.now() - 1800000 },
  ];
  const getPosts = () => store.get('sim.posts', null) || (store.set('sim.posts', seedPosts()), store.get('sim.posts', []));

  function logEvent(event, login) {
    const a = store.get('sim.audit', []);
    a.unshift({ time: Date.now(), event, login: String(login || '').slice(0, 40) });
    store.set('sim.audit', a.slice(0, 100));
  }
  function getSession(token) {
    if (!token) return null;
    const all = store.get('sim.sessions', {});
    const s = all[token];
    if (!s) return null;
    if (Date.now() >= s.expiresAt) { delete all[token]; store.set('sim.sessions', all); return null; }
    return s;
  }

  async function route(method, path, body, token) {
    if (method === 'GET' && path === '/posts') return R(200, { posts: [...getPosts()].reverse() });

    if (method === 'POST' && path === '/login') {
      const login = body && typeof body.login === 'string' ? body.login.trim() : '';
      const password = body && typeof body.password === 'string' ? body.password : '';
      if (!login || !password) return R(400, { error: 'EMPTY_FIELDS', message: 'Введите логин и пароль' });
      const a = attempts.get(login) || { count: 0, start: Date.now() };
      if (Date.now() - a.start > 60000) { a.count = 0; a.start = Date.now(); }
      if (a.count >= 5) { logEvent('login_blocked', login); return R(429, { error: 'TOO_MANY_ATTEMPTS', message: 'Слишком много попыток. Подождите минуту.' }); }
      const user = USERS.find((u) => u.login === login);
      const hash = await CU.pbkdf2Hex(password, user ? user.salt : USERS[0].salt);
      if (!user || hash !== user.hash) {
        attempts.set(login, { count: a.count + 1, start: a.start });
        logEvent('login_fail', login);
        return R(401, { error: 'INVALID_CREDENTIALS', message: 'Неверный логин или пароль' });
      }
      attempts.delete(login);
      const all = store.get('sim.sessions', {});
      if (token) delete all[token];
      const newToken = CU.randomString(32);
      const expiresAt = Date.now() + ttlSeconds() * 1000;
      all[newToken] = { userId: user.id, createdAt: Date.now(), expiresAt };
      store.set('sim.sessions', all);
      logEvent('login_ok', user.login);
      return R(200, { user: publicUser(user), expiresAt, token: newToken });
    }

    if (method === 'POST' && path === '/logout') {
      const s = getSession(token);
      if (s) logEvent('logout', USERS.find((u) => u.id === s.userId).login);
      const all = store.get('sim.sessions', {});
      if (token) { delete all[token]; store.set('sim.sessions', all); }
      return R(200, { ok: true });
    }

    const session = getSession(token);
    if (!session) return R(401, { error: 'UNAUTHORIZED', message: 'Войдите, чтобы выполнить это действие' });
    const user = USERS.find((u) => u.id === session.userId);

    if (method === 'GET' && path === '/me') return R(200, { user: publicUser(user), expiresAt: session.expiresAt });

    if (method === 'POST' && path === '/posts') {
      const text = body && typeof body.text === 'string' ? body.text.trim() : '';
      if (!text || text.length > 500) return R(400, { error: 'BAD_TEXT', message: 'Сообщение: от 1 до 500 символов' });
      const posts = getPosts();
      const post = { id: Math.max(0, ...posts.map((p) => p.id)) + 1, authorId: user.id, author: user.name, text, createdAt: Date.now() };
      posts.push(post);
      store.set('sim.posts', posts);
      return R(201, post);
    }

    const m = path.match(/^\/posts\/(\d+)$/);
    if (method === 'DELETE' && m) {
      const posts = getPosts();
      const idx = posts.findIndex((p) => p.id === Number(m[1]));
      if (idx === -1) return R(404, { error: 'NOT_FOUND', message: 'Сообщение не найдено' });
      if (posts[idx].authorId !== user.id && user.role !== 'moderator') return R(403, { error: 'FORBIDDEN', message: 'Можно удалять только свои сообщения' });
      posts.splice(idx, 1);
      store.set('sim.posts', posts);
      return R(200, { ok: true });
    }

    if (method === 'GET' && path === '/audit') {
      if (user.role !== 'moderator') return R(403, { error: 'FORBIDDEN', message: 'Журнал доступен только модератору' });
      return R(200, { events: store.get('sim.audit', []).slice(0, 20) });
    }
    return R(404, { error: 'NOT_FOUND' });
  }

  async function request(method, path, { body, token } = {}) {
    await delay(80);
    try { return await route(method, path, body, token); }
    catch (e) { console.error(e); return R(500, { error: 'SERVER_ERROR', message: 'Ошибка сервера' }); }
  }
  return { request, ttlSeconds, setTtl: (s) => store.set('sim.ttlSeconds', s), resetAll: () => { ['sim.sessions', 'sim.posts', 'sim.audit'].forEach((k) => localStorage.removeItem(k)); } };
})();
