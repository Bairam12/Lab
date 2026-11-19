'use strict';
const $ = (s) => document.querySelector(s);
const q = new URLSearchParams(location.search);
const say = (t, k = '') => { const e = $('#status'); e.textContent = t; e.className = k; };
const dir = (u) => u.replace(/[?#].*$/, '').replace(/[^/]*$/, '');

const req = {
  responseType: q.get('response_type'), clientId: q.get('client_id'), redirectUri: q.get('redirect_uri'),
  scope: q.get('scope') || '', state: q.get('state'), nonce: q.get('nonce'),
  challenge: q.get('code_challenge'), method: q.get('code_challenge_method'),
};

function fail(text) {
  $('#loginSection').hidden = true; $('#consentSection').hidden = true;
  $('#errorSection').hidden = false; $('#errorText').textContent = text;
}
function back(params) {
  const u = new URL(req.redirectUri);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  if (req.state) u.searchParams.set('state', req.state);
  location.href = u.href;
}

(function validate() {
  if (req.responseType !== 'code') return fail('Поддерживается только response_type=code.');
  if (req.clientId !== IdP.CLIENT_ID) return fail('Неизвестный client_id.');
  if (!req.redirectUri || dir(req.redirectUri) !== dir(location.href)) return fail('redirect_uri не зарегистрирован для этого клиента.');
  if (!req.scope.split(' ').includes('openid')) return fail('Нужен scope openid.');
  if (!req.state || !req.nonce) return fail('Не переданы state/nonce.');
  if (!req.challenge || req.method !== 'S256') return fail('Требуется PKCE: code_challenge с методом S256.');
  $('#loginSection').hidden = false;
})();

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const login = $('#login').value.trim(), password = $('#password').value;
  if (!login || !password) { say('Введите логин и пароль', 'err'); return; }
  if (!(await IdP.checkPassword(login, password))) { $('#password').value = ''; say('Неверный логин или пароль', 'err'); return; }
  say('');
  $('#loginSection').hidden = true; $('#consentSection').hidden = false;
  $('#clientName').textContent = 'Учебный портал (lab12-demo-client)';
  const names = { openid: 'идентификатор пользователя (sub)', profile: 'имя', email: 'адрес электронной почты' };
  const ul = $('#scopes'); ul.replaceChildren();
  for (const s of req.scope.split(' ')) ul.append(Object.assign(document.createElement('li'), { textContent: names[s] || s }));
});

$('#allowBtn').addEventListener('click', () => {
  const code = IdP.issueCode({ redirectUri: req.redirectUri, challenge: req.challenge, nonce: req.nonce, scope: req.scope });
  back({ code });
});
$('#denyBtn').addEventListener('click', () => back({ error: 'access_denied' }));
