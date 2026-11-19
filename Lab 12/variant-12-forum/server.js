'use strict';
// ЛР №12, вариант 12 — мини-форум: гость читает, вошедший пользователь публикует, затем выходит.
// Роли: user (удаляет только свои сообщения), moderator (удаляет любые, видит журнал входов).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { secureHeaders, sendJson, parseCookies, sessionCookie, clearCookie, readJson, sameOrigin, serveStatic } = require('./lib/http-utils');
const { SessionStore } = require('./lib/sessions');
const { verifyPassword, DUMMY_HASH } = require('./lib/passwords');
const { LoginLimiter } = require('./lib/rate-limit');

const PUBLIC_DIR = path.join(__dirname, 'public');

function createServer({ ttlMs = 30 * 60 * 1000, idleMs = 15 * 60 * 1000 } = {}) {
  const sessions = new SessionStore({ ttlMs, idleMs });
  const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8'));
  const limiter = new LoginLimiter({ max: 5, windowMs: 60_000 });
  const posts = [
    { id: 1, authorId: 1, author: 'Алия', text: 'Добро пожаловать на форум! Читать могут все, писать — после входа.', createdAt: Date.now() - 3600_000 },
    { id: 2, authorId: 2, author: 'Борис', text: 'Подскажите, чем access token отличается от refresh token?', createdAt: Date.now() - 1800_000 },
  ];
  let nextId = 3;
  const audit = []; // журнал попыток входа/выхода (творческое задание)

  const log = (event, login, ip) => {
    audit.unshift({ time: Date.now(), event, login: String(login || '').slice(0, 40), ip });
    if (audit.length > 100) audit.pop();
  };
  const publicUser = (u) => ({ id: u.id, login: u.login, name: u.name, role: u.role });

  function auth(req) {
    const sid = parseCookies(req).sid;
    const session = sessions.get(sid);
    if (!session) return null;
    return { sid, session, user: users.find((u) => u.id === session.userId) };
  }
  function requireAuth(req, res) {
    const a = auth(req);
    if (!a) { sendJson(res, 401, { error: 'UNAUTHORIZED', message: 'Войдите, чтобы выполнить это действие' }); return null; }
    return a;
  }

  async function api(req, res, url) {
    const route = `${req.method} ${url.pathname}`;
    const ip = req.socket.remoteAddress;
    if (req.method !== 'GET' && !sameOrigin(req)) return sendJson(res, 403, { error: 'BAD_ORIGIN' });

    // ---------- открытый просмотр ----------
    if (route === 'GET /api/posts') return sendJson(res, 200, { posts: [...posts].reverse().map(({ authorId, ...p }) => ({ ...p, authorId })) });

    if (route === 'POST /api/login') {
      const { login, password } = await readJson(req);
      if (typeof login !== 'string' || typeof password !== 'string' || !login.trim() || !password) {
        return sendJson(res, 400, { error: 'EMPTY_FIELDS', message: 'Введите логин и пароль' });
      }
      const key = `${ip}|${login.trim().toLowerCase()}`;
      if (limiter.blocked(key)) {
        log('login_blocked', login, ip);
        return sendJson(res, 429, { error: 'TOO_MANY_ATTEMPTS', message: 'Слишком много попыток. Подождите минуту.' });
      }
      const user = users.find((u) => u.login === login.trim());
      const ok = verifyPassword(password, user ? user.passwordHash : DUMMY_HASH) && !!user;
      if (!ok) {
        limiter.fail(key); log('login_fail', login, ip);
        return sendJson(res, 401, { error: 'INVALID_CREDENTIALS', message: 'Неверный логин или пароль' });
      }
      limiter.reset(key);
      const old = parseCookies(req).sid;
      if (old) sessions.destroy(old);
      const sid = sessions.create({ userId: user.id });
      log('login_ok', user.login, ip);
      return sendJson(res, 200, { user: publicUser(user) }, { 'Set-Cookie': sessionCookie('sid', sid, Math.floor(ttlMs / 1000)) });
    }

    if (route === 'POST /api/logout') {
      const a = auth(req);
      if (a) { sessions.destroy(a.sid); log('logout', a.user.login, ip); }
      return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie('sid') });
    }

    // ---------- только для вошедших ----------
    const a = requireAuth(req, res);
    if (!a) return;

    if (route === 'GET /api/me') return sendJson(res, 200, { user: publicUser(a.user) });

    if (route === 'POST /api/posts') {
      const { text } = await readJson(req);
      const clean = typeof text === 'string' ? text.trim() : '';
      if (!clean || clean.length > 500) return sendJson(res, 400, { error: 'BAD_TEXT', message: 'Сообщение: от 1 до 500 символов' });
      const post = { id: nextId++, authorId: a.user.id, author: a.user.name, text: clean, createdAt: Date.now() };
      posts.push(post);
      return sendJson(res, 201, post);
    }

    if (req.method === 'DELETE' && /^\/api\/posts\/\d+$/.test(url.pathname)) {
      const id = Number(url.pathname.split('/').pop());
      const idx = posts.findIndex((p) => p.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'NOT_FOUND' });
      // Проверка владельца на сервере: чужое сообщение может удалить только модератор.
      if (posts[idx].authorId !== a.user.id && a.user.role !== 'moderator') {
        return sendJson(res, 403, { error: 'FORBIDDEN', message: 'Можно удалять только свои сообщения' });
      }
      posts.splice(idx, 1);
      return sendJson(res, 200, { ok: true });
    }

    if (route === 'GET /api/audit') {
      if (a.user.role !== 'moderator') return sendJson(res, 403, { error: 'FORBIDDEN', message: 'Журнал доступен только модератору' });
      return sendJson(res, 200, { events: audit.slice(0, 20) });
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
  const port = Number(process.env.PORT) || 3012;
  createServer().listen(port, () => console.log(`Форум: http://localhost:${port}`))
    .on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `Порт ${port} уже занят: сервер, возможно, уже запущен. Закройте другое окно сервера.` : e); process.exit(1); });
}
module.exports = { createServer };
