'use strict';
const $ = (s) => document.querySelector(s);
const state = { user: null };

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
  try { data = await res.json(); } catch { /* пусто */ }
  if (data === null && !res.ok) data = { message: 'Нет связи с сервером. Запустите start.bat в папке проекта и откройте адрес из чёрного окна (http://localhost:…) — не открывайте index.html как файл.' };
  if (res.status === 401 && state.user && path !== '/login') {
    setUser(null);
    say('Сессия истекла. Войдите снова.', 'err');
  }
  return { ok: res.ok, status: res.status, data };
}

function say(text, kind = '') { const el = $('#status'); el.textContent = text; el.className = kind; }

function setUser(user) {
  state.user = user;
  const on = !!user;
  $('#guestBar').hidden = on;
  $('#userBar').hidden = !on;
  $('#loginSection').hidden = on;
  $('#composeSection').hidden = !on;
  if (on) $('#userName').textContent = `${user.name}${user.role === 'moderator' ? ' (модератор)' : ''}`;
  $('#auditSection').hidden = true;
  loadPosts();
  if (on && user.role === 'moderator') loadAudit();
}

async function loadPosts() {
  const r = await api('/posts');
  const ul = $('#posts');
  ul.replaceChildren();
  for (const p of r.data?.posts || []) {
    const li = document.createElement('li');
    li.className = 'post';
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.append(
      Object.assign(document.createElement('strong'), { textContent: p.author }),
      Object.assign(document.createElement('span'), { textContent: new Date(p.createdAt).toLocaleString('ru-RU') }),
    );
    // Кнопка «Удалить» — лишь удобство интерфейса; право на удаление проверяет сервер (403).
    if (state.user && (state.user.id === p.authorId || state.user.role === 'moderator')) {
      const del = Object.assign(document.createElement('button'), { textContent: 'Удалить', className: 'secondary' });
      del.addEventListener('click', () => removePost(p.id));
      meta.append(del);
    }
    const text = document.createElement('p');
    text.className = 'text';
    text.textContent = p.text;           // сообщения пользователей выводятся как текст — XSS невозможен
    li.append(meta, text);
    ul.append(li);
  }
}

async function removePost(id) {
  const r = await api('/posts/' + id, { method: 'DELETE' });
  if (r.ok) { say('Сообщение удалено', 'ok'); loadPosts(); }
  else if (r.status !== 401) say(r.data?.message || 'Ошибка', 'err');
}

// Творческое задание: журнал попыток входа/выхода (аудит), виден только модератору.
async function loadAudit() {
  const r = await api('/audit');
  if (!r.ok) return;
  $('#auditSection').hidden = false;
  const ul = $('#audit');
  ul.replaceChildren();
  const names = { login_ok: 'вход', login_fail: 'неудачный вход', login_blocked: 'блокировка', logout: 'выход' };
  for (const e of r.data.events) {
    const li = document.createElement('li');
    li.textContent = `${new Date(e.time).toLocaleTimeString('ru-RU')}  ${names[e.event] || e.event}  «${e.login}»`;
    ul.append(li);
  }
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const login = $('#login').value.trim(), password = $('#password').value;
  if (!login || !password) { say('Введите логин и пароль', 'err'); return; }
  const r = await api('/login', { method: 'POST', body: { login, password } });
  $('#password').value = '';
  if (r.ok) { setUser(r.data.user); say(`Вы вошли как ${r.data.user.name}`, 'ok'); }
  else say(r.data?.message || 'Ошибка входа', 'err');
});

$('#logoutBtn').addEventListener('click', async () => {
  await api('/logout', { method: 'POST' });
  setUser(null);
  say('Вы вышли из аккаунта', 'ok');
});

$('#postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = $('#postText').value.trim();
  if (!text) { say('Введите текст сообщения', 'err'); return; }
  const r = await api('/posts', { method: 'POST', body: { text } });
  if (r.ok) { $('#postText').value = ''; say('Сообщение опубликовано', 'ok'); loadPosts(); }
  else if (r.status !== 401) say(r.data?.message || 'Ошибка', 'err');
});

(async function init() {
  if (location.protocol === 'file:') { say('Нет связи с сервером. Запустите start.bat в папке проекта и откройте адрес из чёрного окна (http://localhost:…) — не открывайте index.html как файл.', 'err'); }
  const me = await api('/me');          // восстановление состояния после обновления страницы
  setUser(me.ok ? me.data.user : null);
})();
