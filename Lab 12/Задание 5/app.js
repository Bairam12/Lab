'use strict';
const $ = (s) => document.querySelector(s);
const fmt = (n) => n.toLocaleString('ru-RU');
const state = { user: null, expiresAt: 0, timerId: null, products: [] };

const getToken = () => { try { return sessionStorage.getItem('sid'); } catch { return null; } };
const setToken = (t) => { try { t ? sessionStorage.setItem('sid', t) : sessionStorage.removeItem('sid'); } catch { /* нет доступа */ } };

async function api(path, { method = 'GET', body } = {}) {
  const r = await Sim.request(method, path, { body, token: getToken() });
  if (r.status === 401 && state.user && path !== '/login') {
    setToken(null);
    setUser(null);
    say('Сессия истекла. Войдите снова.', 'err');
  }
  return { ok: r.status < 400, status: r.status, data: r.data };
}

function say(text, kind = '') { const el = $('#status'); el.textContent = text; el.className = kind; }

function setUser(user, expiresAt = 0) {
  state.user = user;
  state.expiresAt = expiresAt;
  const on = !!user;
  $('#guestBar').hidden = on;
  $('#userBar').hidden = !on;
  $('#loginSection').hidden = on;
  $('#cartSection').hidden = !on;
  $('#guestNote').hidden = on;
  if (on) $('#userName').textContent = user.name;
  clearInterval(state.timerId);
  if (on) { tick(); state.timerId = setInterval(tick, 1000); } else { $('#timer').textContent = ''; }
  renderProducts();
  if (on) loadCart(); else renderCart({ items: [], total: 0 });
}

function tick() {
  const left = Math.max(0, state.expiresAt - Date.now());
  const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
  const el = $('#timer');
  el.textContent = `Сессия: ${m}:${String(s).padStart(2, '0')}`;
  el.classList.toggle('low', left < 60000);
  if (left === 0) { clearInterval(state.timerId); api('/me'); } // сервер ответит 401 -> интерфейс вернётся в гостевой режим
}

function renderProducts() {
  const ul = $('#products');
  ul.replaceChildren();
  for (const p of state.products) {
    const li = document.createElement('li');
    const btn = Object.assign(document.createElement('button'), { textContent: state.user ? 'В корзину' : 'Войдите, чтобы купить', disabled: !state.user });
    btn.addEventListener('click', () => addToCart(p.id));
    li.append(
      Object.assign(document.createElement('span'), { className: 'grow', textContent: p.name }),
      Object.assign(document.createElement('span'), { className: 'price', textContent: `${fmt(p.price)} ₸` }),
      btn,
    );
    ul.append(li);
  }
}

function renderCart(cart) {
  const ul = $('#cartItems');
  ul.replaceChildren();
  if (!cart.items.length) ul.append(Object.assign(document.createElement('li'), { textContent: 'Корзина пуста' }));
  for (const i of cart.items) {
    const li = document.createElement('li');
    li.append(
      Object.assign(document.createElement('span'), { className: 'grow', textContent: `${i.name} × ${i.qty}` }),
      Object.assign(document.createElement('span'), { className: 'price', textContent: `${fmt(i.sum)} ₸` }),
    );
    ul.append(li);
  }
  $('#cartTotal').textContent = fmt(cart.total);
  $('#checkoutBtn').disabled = !cart.items.length;
}

async function loadCart() { const r = await api('/cart'); if (r.ok) renderCart(r.data); }

async function addToCart(productId) {
  const r = await api('/cart', { method: 'POST', body: { productId, qty: 1 } });
  if (r.ok) { renderCart(r.data); say('Товар добавлен в корзину', 'ok'); }
  else if (r.status !== 401) say(r.data.message || 'Ошибка', 'err');
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const login = $('#login').value.trim(), password = $('#password').value;
  if (!login || !password) { say('Введите логин и пароль', 'err'); return; }
  const r = await api('/login', { method: 'POST', body: { login, password } });
  $('#password').value = '';
  if (r.ok) { setToken(r.data.token); setUser(r.data.user, r.data.expiresAt); say(`Добро пожаловать, ${r.data.user.name}!`, 'ok'); }
  else say(r.data.message || 'Ошибка входа', 'err');
});

$('#logoutBtn').addEventListener('click', async () => {
  await api('/logout', { method: 'POST' });
  setToken(null);
  setUser(null);
  say('Вы вышли из аккаунта', 'ok');
});

$('#checkoutBtn').addEventListener('click', async () => {
  const r = await api('/checkout', { method: 'POST' });
  if (r.ok) { say(`Заказ №${r.data.orderId} оформлен на сумму ${fmt(r.data.total)} ₸`, 'ok'); loadCart(); }
  else if (r.status !== 401) say(r.data.message || 'Ошибка', 'err');
});

$('#orderBtn').addEventListener('click', async () => {
  const id = Number($('#orderId').value);
  const r = await Sim.request('GET', `/orders/${id}`, { token: getToken() });
  const el = $('#checkResult');
  el.textContent = `GET /orders/${id} → ${r.status}: ${r.data.message || 'заказ №' + r.data.id + ', сумма ' + fmt(r.data.total) + ' ₸'}`;
  el.className = r.status === 200 ? 'ok' : 'err';
});
$('#shortTtl').checked = Sim.ttlSeconds() === 15;
$('#shortTtl').addEventListener('change', (e) => Sim.setTtl(e.target.checked ? 15 : 1800));
$('#resetBtn').addEventListener('click', () => { Sim.resetAll(); setToken(null); setUser(null); say('Данные сброшены', 'ok'); });

(async function init() {
  const p = await api('/products');
  state.products = p.data.products || [];
  const me = await api('/me');
  if (me.ok) setUser(me.data.user, me.data.expiresAt); else setUser(null);
})();
