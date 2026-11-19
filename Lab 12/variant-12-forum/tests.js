'use strict';
// Автотесты: 8 обязательных сценариев. Запуск: node tests.js
const { createServer } = require('./server');
const results = [];
const record = (n, name, expected, actual, pass) => results.push({ n, name, expected, actual, pass });

class Client {
  constructor(base) { this.base = base; this.cookie = ''; }
  async req(method, path, body) {
    const res = await fetch(this.base + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) { const pair = set.split(';')[0]; this.cookie = pair.endsWith('=') ? '' : pair; this.raw = set; }
    let data = null; try { data = await res.json(); } catch {}
    return { status: res.status, data };
  }
}
async function listen(opts) {
  const server = createServer(opts);
  await new Promise((r) => server.listen(0, r));
  return { server, base: `http://localhost:${server.address().port}` };
}

(async () => {
  const { server, base } = await listen();
  const alice = new Client(base), bob = new Client(base), guest = new Client(base);

  let r = await alice.req('POST', '/api/login', { login: 'alice', password: 'Test-Pass-111' });
  record(1, 'Корректный вход', '200, cookie HttpOnly', `${r.status}, HttpOnly=${/HttpOnly/.test(alice.raw || '')}`, r.status === 200 && /HttpOnly/.test(alice.raw || ''));

  r = await guest.req('POST', '/api/login', { login: 'alice', password: 'bad' });
  record(2, 'Неверный пароль', '401, cookie не выдана', `${r.status}, cookie="${guest.cookie}"`, r.status === 401 && !guest.cookie);

  r = await guest.req('POST', '/api/login', { login: '  ', password: '' });
  record(3, 'Пустые поля', '400 EMPTY_FIELDS', `${r.status} ${r.data.error}`, r.status === 400 && r.data.error === 'EMPTY_FIELDS');

  const read = await guest.req('GET', '/api/posts');
  const write = await guest.req('POST', '/api/posts', { text: 'спам от гостя' });
  record(4, 'Доступ без входа', 'чтение: 200; публикация: 401', `чтение: ${read.status}; публикация: ${write.status}`, read.status === 200 && write.status === 401);

  r = await alice.req('GET', '/api/me');
  const posted = await alice.req('POST', '/api/posts', { text: '<script>alert(1)</script> тестовое сообщение' });
  record(8, 'Обновление страницы после входа', '/api/me: 200; публикация: 201', `${r.status}; ${posted.status}`, r.status === 200 && posted.status === 201);

  await bob.req('POST', '/api/login', { login: 'bob', password: 'Test-Pass-222' });
  const foreign = await bob.req('DELETE', `/api/posts/${posted.data.id}`);
  const audit = await bob.req('GET', '/api/audit');
  const mine = await alice.req('DELETE', `/api/posts/${posted.data.id}`);
  record(7, 'Доступ к чужому ресурсу', 'чужое сообщение: 403; журнал для user: 403; своё: 200', `${foreign.status}; ${audit.status}; ${mine.status}`, foreign.status === 403 && audit.status === 403 && mine.status === 200);

  const old = alice.cookie;
  await alice.req('POST', '/api/logout');
  const replay = new Client(base); replay.cookie = old;
  r = await replay.req('POST', '/api/posts', { text: 'после выхода' });
  record(5, 'Выход и повторный запрос', 'публикация со старым cookie: 401', `${r.status}`, r.status === 401);
  server.close();

  const short = await listen({ ttlMs: 300, idleMs: 300 });
  const e = new Client(short.base);
  await e.req('POST', '/api/login', { login: 'alice', password: 'Test-Pass-111' });
  const before = await e.req('GET', '/api/me');
  await new Promise((res) => setTimeout(res, 450));
  r = await e.req('POST', '/api/posts', { text: 'после истечения' });
  record(6, 'Истёкшая сессия', 'до: 200, после: 401', `до: ${before.status}, после: ${r.status}`, before.status === 200 && r.status === 401);
  short.server.close();

  results.sort((a, b) => a.n - b.n);
  console.log('\n№ | Сценарий | Ожидается | Фактически | Статус');
  for (const t of results) console.log(`${t.n} | ${t.name} | ${t.expected} | ${t.actual} | ${t.pass ? 'Пройден' : 'НЕ ПРОЙДЕН'}`);
  const failed = results.filter((t) => !t.pass).length;
  console.log(failed ? `\nНе пройдено: ${failed}` : '\nВсе 8 сценариев пройдены');
  process.exit(failed ? 1 : 0);
})();
