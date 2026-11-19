'use strict';
// Автотесты: 8 обязательных сценариев из методички. Запуск: node tests.js
const { createServer } = require('./server');

const results = [];
function record(n, name, expected, actual, pass) {
  results.push({ n, name, expected, actual, pass });
}

class Client { // минимальный «браузер» с cookie
  constructor(base) { this.base = base; this.cookie = ''; }
  async req(method, path, body) {
    const res = await fetch(this.base + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) { const pair = set.split(';')[0]; this.cookie = pair.endsWith('=') ? '' : pair; this.rawSetCookie = set; }
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
  const c = new Client(base);

  // 1. Корректный вход
  let r = await c.req('POST', '/api/login', { login: 'student', password: 'Test-Pass-123' });
  const flags = (c.rawSetCookie || '');
  record(1, 'Корректный вход', '200, cookie HttpOnly+SameSite', `${r.status}, HttpOnly=${/HttpOnly/.test(flags)}, SameSite=${/SameSite=Lax/.test(flags)}`,
    r.status === 200 && /HttpOnly/.test(flags) && /SameSite=Lax/.test(flags));

  // 2. Неверный пароль
  const bad = new Client(base);
  r = await bad.req('POST', '/api/login', { login: 'student', password: 'wrong' });
  record(2, 'Неверный пароль', '401 INVALID_CREDENTIALS, cookie не выдана', `${r.status} ${r.data.error}, cookie="${bad.cookie}"`, r.status === 401 && r.data.error === 'INVALID_CREDENTIALS' && !bad.cookie);

  // 3. Пустые поля
  r = await bad.req('POST', '/api/login', { login: '', password: '' });
  record(3, 'Пустые поля', '400 EMPTY_FIELDS', `${r.status} ${r.data.error}`, r.status === 400 && r.data.error === 'EMPTY_FIELDS');

  // 4. Доступ без входа
  const guest = new Client(base);
  r = await guest.req('GET', '/api/cart');
  const pub = await guest.req('GET', '/api/products');
  record(4, 'Доступ без входа', 'корзина: 401; каталог (публичный): 200', `корзина: ${r.status}; каталог: ${pub.status}`, r.status === 401 && pub.status === 200);

  // 8. Обновление страницы после входа (cookie сохраняется, /api/me отвечает)
  r = await c.req('GET', '/api/me');
  record(8, 'Обновление страницы после входа', '200, пользователь тот же', `${r.status}, ${r.data && r.data.user && r.data.user.login}`, r.status === 200 && r.data.user.login === 'student');

  // 7. Чужой ресурс: student делает заказ, aigerim пытается его открыть
  await c.req('POST', '/api/cart', { productId: 3, qty: 2 });
  const order = await c.req('POST', '/api/checkout');
  const other = new Client(base);
  await other.req('POST', '/api/login', { login: 'aigerim', password: 'Test-Pass-456' });
  const foreign = await other.req('GET', `/api/orders/${order.data.orderId}`);
  const own = await c.req('GET', `/api/orders/${order.data.orderId}`);
  record(7, 'Доступ к чужому ресурсу', 'чужой заказ: 403; свой: 200', `чужой: ${foreign.status}; свой: ${own.status}`, foreign.status === 403 && own.status === 200);

  // 5. Выход и повторный запрос защищённого ресурса
  const oldCookie = c.cookie;
  await c.req('POST', '/api/logout');
  const replay = new Client(base); replay.cookie = oldCookie; // «украденный» старый cookie
  r = await replay.req('GET', '/api/cart');
  record(5, 'Выход и повторный запрос', 'после выхода старый cookie даёт 401', `${r.status}`, r.status === 401);

  server.close();

  // 6. Истёкшая сессия (короткий TTL для теста)
  const short = await listen({ ttlMs: 300, idleMs: 300 });
  const e = new Client(short.base);
  await e.req('POST', '/api/login', { login: 'student', password: 'Test-Pass-123' });
  const before = await e.req('GET', '/api/me');
  await new Promise((res) => setTimeout(res, 450));
  r = await e.req('GET', '/api/me');
  record(6, 'Истёкшая сессия', 'до истечения 200, после — 401', `до: ${before.status}, после: ${r.status}`, before.status === 200 && r.status === 401);
  short.server.close();

  results.sort((a, b) => a.n - b.n);
  console.log('\n№ | Сценарий | Ожидается | Фактически | Статус');
  for (const t of results) console.log(`${t.n} | ${t.name} | ${t.expected} | ${t.actual} | ${t.pass ? 'Пройден' : 'НЕ ПРОЙДЕН'}`);
  const failed = results.filter((t) => !t.pass).length;
  console.log(failed ? `\nНе пройдено: ${failed}` : '\nВсе 8 сценариев пройдены');
  process.exit(failed ? 1 : 0);
})();
