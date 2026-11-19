'use strict';
const $ = (s) => document.querySelector(s);
const state = { user: null, expiresAt: 0, timerId: null };

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
  $('#composeSection').hidden = !on;
  $('#auditSection').hidden = true;
  if (on) $('#userName').textContent = `${user.name}${user.role === 'moderator' ? ' (модератор)' : ''}`;
  clearInterval(state.timerId);
  if (on) { tick(); state.timerId = setInterval(tick, 1000); } else { $('#timer').textContent = ''; }
  loadPosts();
  if (on && user.role === 'moderator') loadAudit();
}

function tick() {
  const left = Math.max(0, state.expiresAt - Date.now());
  const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
  const el = $('#timer');
  el.textContent = `Сессия: ${m}:${String(s).padStart(2, '0')}`;
  el.classList.toggle('low', left < 60000);
  if (left === 0) { clearInterval(state.timerId); api('/me'); }
}

async function loadPosts() {
  const r = await api('/posts');
  const ul = $('#posts');
  ul.replaceChildren();
  for (const p of r.data.posts || []) {
    const li = document.createElement('li');
    li.className = 'post';
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.append(
      Object.assign(document.createElement('strong'), { textContent: `№${p.id} · ${p.author}` }),
      Object.assign(document.createElement('span'), { textContent: new Date(p.createdAt).toLocaleString('ru-RU') }),
    );
    // Кнопка — лишь удобство интерфейса; право на удаление проверяет «сервер» (403).
    if (state.user && (state.user.id === p.authorId || state.user.role === 'moderator')) {
      const del = Object.assign(document.createElement('button'), { textContent: 'Удалить', className: 'secondary' });
      del.addEventListener('click', () => removePost(p.id));
      meta.append(del);
    }
    const text = document.createElement('p');
    text.className = 'text';
    text.textContent = p.text;                     
    li.append(meta, text);
    ul.append(li);
  }
}

async function removePost(id) {
  const r = await api('/posts/' + id, { method: 'DELETE' });
  if (r.ok) { say('Сообщение удалено', 'ok'); loadPosts(); }
  else if (r.status !== 401) say(r.data.message || 'Ошибка', 'err');
}

async function loadAudit() {
  const r = await api('/audit');
  if (!r.ok) return;
  $('#auditSection').hidden = false;
  const ul = $('#audit');
  ul.replaceChildren();
  const names = { login_ok: 'вход', login_fail: 'неудачный вход', login_blocked: 'блокировка', logout: 'выход' };
  for (const e of r.data.events) {
    ul.append(Object.assign(document.createElement('li'), { textContent: `${new Date(e.time).toLocaleTimeString('ru-RU')}  ${names[e.event] || e.event}  «${e.login}»` }));
  }
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const login = $('#login').value.trim(), password = $('#password').value;
  if (!login || !password) { say('Введите логин и пароль', 'err'); return; }
  const r = await api('/login', { method: 'POST', body: { login, password } });
  $('#password').value = '';
  if (r.ok) { setToken(r.data.token); setUser(r.data.user, r.data.expiresAt); say(`Вы вошли как ${r.data.user.name}`, 'ok'); }
  else say(r.data.message || 'Ошибка входа', 'err');
});

$('#logoutBtn').addEventListener('click', async () => {
  await api('/logout', { method: 'POST' });
  setToken(null);
  setUser(null);
  say('Вы вышли из аккаунта', 'ok');
});

$('#postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = $('#postText').value.trim();
  if (!text) { say('Введите текст сообщения', 'err'); return; }
  const r = await api('/posts', { method: 'POST', body: { text } });
  if (r.ok) { $('#postText').value = ''; say('Сообщение опубликовано', 'ok'); loadPosts(); }
  else if (r.status !== 401) say(r.data.message || 'Ошибка', 'err');
});

$('#delBtn').addEventListener('click', async () => {
  const id = Number($('#delId').value);
  const r = await Sim.request('DELETE', `/posts/${id}`, { token: getToken() });
  const el = $('#checkResult');
  el.textContent = `DELETE /posts/${id} → ${r.status}: ${r.data.message || 'удалено'}`;
  el.className = r.status === 200 ? 'ok' : 'err';
  if (r.status === 200) loadPosts();
});
$('#shortTtl').checked = Sim.ttlSeconds() === 15;
$('#shortTtl').addEventListener('change', (e) => Sim.setTtl(e.target.checked ? 15 : 1800));
$('#resetBtn').addEventListener('click', () => { Sim.resetAll(); setToken(null); setUser(null); say('Данные сброшены', 'ok'); });

(async function init() {
  const me = await api('/me');                   
  if (me.ok) setUser(me.data.user, me.data.expiresAt); else setUser(null);
})();
