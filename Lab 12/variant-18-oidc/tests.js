'use strict';
// Автотесты без сети: проверяют защиту ресурса и сессии. Сам обмен с провайдером проверяется вручную в браузере.
const { createServer } = require('./server');

const results = [];
const record = (n, name, expected, actual, pass) => results.push({ n, name, expected, actual, pass });

(async () => {
  const server = createServer({ ttlMs: 300, idleMs: 300, baseUrl: 'http://localhost:0' });
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  const get = (p, cookie) => fetch(base + p, { headers: cookie ? { Cookie: cookie } : {}, redirect: 'manual' });

  let r = await get('/api/profile');
  record(1, 'Доступ без входа', '401 UNAUTHORIZED', String(r.status), r.status === 401);

  // Вход «вручную» создаём сессию напрямую в хранилище (вместо реального провайдера).
  const sid = server._sessions.create({ userId: 'test-sub', sub: 'test-sub', name: 'Тест', email: null, issuer: 'test' });
  r = await get('/api/profile', `sid=${sid}`);
  record(2, 'Доступ с валидной сессией', '200', String(r.status), r.status === 200);

  r = await get('/api/profile', 'sid=forged-session-id');
  record(3, 'Поддельный идентификатор сессии', '401', String(r.status), r.status === 401);

  r = await get('/auth/callback?code=x&state=y');
  const loc = r.headers.get('location') || '';
  record(4, 'Callback без начатой попытки входа (нет tx-cookie)', '302 → /?error=login_expired', `${r.status} → ${loc}`, r.status === 302 && loc.includes('error=login_expired'));

  r = await get('/auth/callback?error=access_denied');
  record(5, 'Провайдер вернул error', '302 → /?error=...', `${r.status} → ${r.headers.get('location')}`, r.status === 302 && (r.headers.get('location') || '').includes('error='));

  const out = await fetch(base + '/auth/logout', { method: 'POST', headers: { Cookie: `sid=${sid}` } });
  r = await get('/api/profile', `sid=${sid}`);
  record(6, 'Выход и повторный запрос', 'logout 200; профиль после выхода 401', `${out.status}; ${r.status}`, out.status === 200 && r.status === 401);

  const sid2 = server._sessions.create({ userId: 'u2', sub: 'u2', name: 'Тест2' });
  await new Promise((res) => setTimeout(res, 450));
  r = await get('/api/profile', `sid=${sid2}`);
  record(7, 'Истёкшая сессия', '401', String(r.status), r.status === 401);

  r = await get('/api/me', `sid=${server._sessions.create({ userId: 'u3', sub: 'u3', name: 'Тест3' })}`);
  const me = await r.json();
  record(8, 'Обновление страницы после входа (/api/me)', 'authenticated: true', String(me.authenticated), me.authenticated === true);

  server.close();
  results.sort((a, b) => a.n - b.n);
  console.log('\n№ | Сценарий | Ожидается | Фактически | Статус');
  for (const t of results) console.log(`${t.n} | ${t.name} | ${t.expected} | ${t.actual} | ${t.pass ? 'Пройден' : 'НЕ ПРОЙДЕН'}`);
  const failed = results.filter((t) => !t.pass).length;
  console.log(failed ? `\nНе пройдено: ${failed}` : '\nВсе офлайн-сценарии пройдены');
  process.exit(failed ? 1 : 0);
})();
