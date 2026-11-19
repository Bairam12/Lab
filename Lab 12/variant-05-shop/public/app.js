'use strict';
// Клиентская часть. Все решения о доступе принимает СЕРВЕР: интерфейс только отображает результат.
const $ = (s) => document.querySelector(s);
const fmt = (n) => n.toLocaleString('ru-RU');
const state = { user: null, expiresAt: 0, timerId: null };

async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
    });
  } catch {
    return { ok: false, status: 0, data: { message: 'Нет связи с сервером. Запустите start.bat в папке проекта и откройте адрес из чёрного окна (http://localhost:…) — не открывайте index.html как файл.' } };
  }
  let data = null;
  try { data = await res.json(); } catch { /* пустой ответ */ }
  // Ответ не JSON (например, Live Server вместо нашего сервера) — подсказываем, что делать.
  if (data === null && !res.ok) data = { message: 'Нет связи с сервером. Запустите start.bat в папке проекта и откройте адрес из чёрного окна (http://localhost:…) — не открывайте index.html как файл.' };
  // Любой 401 при открытой сессии на клиенте = сессия истекла на сервере.
  if (res.status === 401 && state.user && path !== '/login') {
    setUser(null);
    say('Сессия истекла. Войдите снова.', 'err');
  }
  return { ok: res.ok, status: res.status, data };
}

function say(text, kind = '') {
  const el = $('#status');
  el.textContent = text;       // textContent, а не innerHTML — защита от XSS
  el.className = kind;
}

function setUser(user, expiresAt = 0) {
  state.user = user;
  state.expiresAt = expiresAt;
  const logged = !!user;
  $('#guestBar').hidden = logged;
  $('#userBar').hidden = !logged;
  $('#loginSection').hidden = logged;
  $('#cartSection').hidden = !logged;
  $('#guestNote').hidden = logged;
  if (logged) $('#userName').textContent = user.name;
  clearInterval(state.timerId);
  if (logged) { tick(); state.timerId = setInterval(tick, 1000); } else { $('#timer').textContent = ''; }
  renderProducts();
  if (logged) loadCart(); else renderCart({ items: [], total: 0 });
}

// Творческое задание: индикатор оставшегося времени сессии.
function tick() {
  const left = Math.max(0, state.expiresAt - Date.now());
  const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
  const el = $('#timer');
  el.textContent = `Сессия: ${m}:${String(s).padStart(2, '0')}`;
  el.classList.toggle('low', left < 60000);
}

let products = [];
function renderProducts() {
  const ul = $('#products');
  ul.replaceChildren();
  for (const p of products) {
    const li = document.createElement('li');
    const name = Object.assign(document.createElement('span'), { className: 'grow', textContent: p.name });
    const price = Object.assign(document.createElement('span'), { className: 'price', textContent: `${fmt(p.price)} ₸` });
    const btn = Object.assign(document.createElement('button'), {
      textContent: state.user ? 'В корзину' : 'Войдите, чтобы купить',
      disabled: !state.user,
    });
    btn.addEventListener('click', () => addToCart(p.id));
    li.append(name, price, btn);
    ul.append(li);
  }
}

function renderCart(cart) {
  const ul = $('#cartItems');
  ul.replaceChildren();
  if (!cart.items.length) {
    const li = document.createElement('li');
    li.textContent = 'Корзина пуста';
    ul.append(li);
  }
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

async function loadCart() {
  const r = await api('/cart');
  if (r.ok) renderCart(r.data);
}

async function addToCart(productId) {
  const r = await api('/cart', { method: 'POST', body: { productId, qty: 1 } });
  if (r.ok) { renderCart(r.data); say('Товар добавлен в корзину', 'ok'); }
  else if (r.status !== 401) say(r.data?.message || 'Ошибка', 'err');
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const login = $('#login').value.trim();
  const password = $('#password').value;
  // Клиентская проверка нужна только для удобства; сервер проверяет всё повторно.
  if (!login || !password) { say('Введите логин и пароль', 'err'); return; }
  const r = await api('/login', { method: 'POST', body: { login, password } });
  $('#password').value = '';
  if (r.ok) { setUser(r.data.user, r.data.expiresAt); say(`Добро пожаловать, ${r.data.user.name}!`, 'ok'); }
  else say(r.data?.message || 'Ошибка входа', 'err');
});

$('#logoutBtn').addEventListener('click', async () => {
  await api('/logout', { method: 'POST' });
  setUser(null);
  say('Вы вышли из аккаунта', 'ok');
});

$('#checkoutBtn').addEventListener('click', async () => {
  const r = await api('/checkout', { method: 'POST' });
  if (r.ok) { say(`Заказ №${r.data.orderId} оформлен на сумму ${fmt(r.data.total)} ₸`, 'ok'); loadCart(); }
  else if (r.status !== 401) say(r.data?.message || 'Ошибка', 'err');
});

(async function init() {
  if (location.protocol === 'file:') { say('Нет связи с сервером. Запустите start.bat в папке проекта и откройте адрес из чёрного окна (http://localhost:…) — не открывайте index.html как файл.', 'err'); }
  const p = await api('/products');
  products = p.data?.products || [];
  // Обновление страницы: состояние восстанавливается по cookie-сессии на сервере.
  const me = await api('/me');
  if (me.ok) setUser(me.data.user, me.data.expiresAt); else setUser(null);
})();
