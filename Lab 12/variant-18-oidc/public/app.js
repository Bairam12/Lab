'use strict';
const $ = (s) => document.querySelector(s);
const state = { expiresAt: 0, timerId: null };

// Сообщения об ошибках — только из фиксированного списка (параметр из URL в страницу не подставляется).
const ERRORS = {
  provider_denied: 'Провайдер отклонил вход (доступ не предоставлен).',
  login_expired: 'Попытка входа устарела. Начните вход заново.',
  login_failed: 'Не удалось завершить вход: проверка ответа провайдера не пройдена.',
  provider_unavailable: 'Провайдер недоступен. Проверьте подключение к интернету и повторите попытку.',
};

function say(text, kind = '') { const el = $('#status'); el.textContent = text; el.className = kind; }

function tick() {
  const left = Math.max(0, state.expiresAt - Date.now());
  const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
  const el = $('#timer');
  el.textContent = `Сессия: ${m}:${String(s).padStart(2, '0')}`;
  el.classList.toggle('low', left < 60000);
  if (left === 0) { clearInterval(state.timerId); showGuest(); say('Сессия истекла. Войдите снова.', 'err'); }
}

function showGuest() {
  clearInterval(state.timerId);
  $('#guestBar').hidden = false; $('#userBar').hidden = true;
  $('#loginSection').hidden = false; $('#profileSection').hidden = true;
}

async function showProfile() {
  let r;
  try { r = await fetch('/api/profile', { credentials: 'same-origin' }); }
  catch { say('Нет связи с сервером. Запустите start.bat в папке проекта и откройте адрес из чёрного окна (http://localhost:…) — не открывайте index.html как файл.', 'err'); showGuest(); return false; }
  if (r.status === 401) { showGuest(); return false; }   // защищённый ресурс отказал -> гость
  const p = await r.json();
  state.expiresAt = p.expiresAt;
  $('#userName').textContent = p.name;
  $('#guestBar').hidden = true; $('#userBar').hidden = false;
  $('#loginSection').hidden = true; $('#profileSection').hidden = false;
  const dl = $('#claims');
  dl.replaceChildren();
  for (const [k, label] of [['name', 'Имя'], ['email', 'Email'], ['sub', 'Идентификатор (sub)'], ['issuer', 'Провайдер (iss)']]) {
    dl.append(
      Object.assign(document.createElement('dt'), { textContent: label }),
      Object.assign(document.createElement('dd'), { textContent: p[k] || '—' }),
    );
  }
  tick(); clearInterval(state.timerId); state.timerId = setInterval(tick, 1000);
  return true;
}

// Творческое задание: подтверждение выхода + индикатор времени сессии.
$('#logoutBtn').addEventListener('click', () => $('#confirmLogout').showModal());
$('#confirmNo').addEventListener('click', () => $('#confirmLogout').close());
$('#confirmYes').addEventListener('click', async () => {
  $('#confirmLogout').close();
  try { await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch { /* сервер недоступен */ }
  showGuest();
  say('Вы вышли из аккаунта', 'ok');
});

(async function init() {
  if (location.protocol === 'file:') { say('Нет связи с сервером. Запустите start.bat в папке проекта и откройте адрес из чёрного окна (http://localhost:…) — не открывайте index.html как файл.', 'err'); return; }
  const params = new URLSearchParams(location.search);
  const err = params.get('error');
  if (err) { say(ERRORS[err] || 'Ошибка входа.', 'err'); history.replaceState(null, '', '/'); }
  const ok = await showProfile();
  if (ok && !err) say('Вход выполнен через OIDC.', 'ok');
})();
