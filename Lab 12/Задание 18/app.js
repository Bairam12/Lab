'use strict';
const $ = (s) => document.querySelector(s);
const state = { timerId: null };
const ss = {
  get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* нет доступа */ } },
  del(k) { try { sessionStorage.removeItem(k); } catch { /* нет доступа */ } },
};
const ERRORS = {
  access_denied: 'Вы отклонили доступ на странице провайдера.',
  state_mismatch: 'Параметр state не совпал — ответ отклонён (защита от CSRF).',
  invalid_grant: 'Провайдер отклонил обмен кода на токен',
  no_tx: 'Попытка входа не найдена или уже использована. Начните вход заново.',
  token_invalid: 'Проверка ID-токена не пройдена',
};
function say(text, kind = '') { const el = $('#status'); el.textContent = text; el.className = kind; }

async function startLogin({ tamper } = {}) {
  const verifier = CU.randomString(48);                            
  const challenge = CU.b64url(await CU.sha256(verifier));         
  const stateValue = CU.randomString(16), nonce = CU.randomString(16);
  const redirectUri = new URL('index.html', location.href).href;
  // Данные попытки хранятся только до возврата с провайдера и удаляются при первом использовании.
  ss.set('oidc.tx', { verifier: tamper === 'pkce' ? CU.randomString(48) : verifier, state: tamper === 'state' ? 'подмена' : stateValue, nonce, redirectUri });
  const u = new URL('provider.html', location.href);
  u.search = new URLSearchParams({ response_type: 'code', client_id: IdP.CLIENT_ID, redirect_uri: redirectUri, scope: 'openid profile email', state: stateValue, nonce, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
  location.href = u.href;
}

async function verifyIdToken(idToken, nonce) {
  const checks = [];
  const [h, p, s] = idToken.split('.');
  const header = JSON.parse(new TextDecoder().decode(CU.b64urlToBytes(h)));
  const payload = JSON.parse(new TextDecoder().decode(CU.b64urlToBytes(p)));
  const keyJwk = (await IdP.jwks()).keys.find((k) => k.kid === header.kid);
  const algOk = header.alg === 'RS256';                    
  let sigOk = false;
  if (algOk && keyJwk) {
    const key = await crypto.subtle.importKey('jwk', keyJwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    sigOk = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, CU.b64urlToBytes(s), CU.enc.encode(`${h}.${p}`));
  }
  checks.push({ name: 'Алгоритм RS256 и подпись токена (по открытому ключу провайдера)', ok: algOk && sigOk });
  checks.push({ name: `Издатель iss = ${IdP.ISSUER}`, ok: payload.iss === IdP.ISSUER });
  checks.push({ name: `Получатель aud = ${IdP.CLIENT_ID}`, ok: payload.aud === IdP.CLIENT_ID });
  checks.push({ name: 'Срок действия exp не истёк', ok: payload.exp * 1000 > Date.now() });
  checks.push({ name: 'nonce совпадает с отправленным (защита от повторного воспроизведения)', ok: payload.nonce === nonce });
  return { header, payload, checks };
}

async function handleCallback(params) {
  const tx = ss.get('oidc.tx');
  ss.del('oidc.tx');                                            
  history.replaceState(null, '', location.pathname);             
  if (params.get('error')) return say(ERRORS[params.get('error')] || 'Провайдер вернул ошибку.', 'err');
  if (!tx) return say(ERRORS.no_tx, 'err');
  if (params.get('state') !== tx.state) return say(ERRORS.state_mismatch, 'err');
  const res = await IdP.token({ code: params.get('code'), codeVerifier: tx.verifier, redirectUri: tx.redirectUri, clientId: IdP.CLIENT_ID });
  if (res.error) return say(`${ERRORS[res.error] || 'Ошибка'}: ${res.error_description}`, 'err');
  const v = await verifyIdToken(res.id_token, tx.nonce);
  if (v.checks.some((c) => !c.ok)) return say(`${ERRORS.token_invalid}: ${v.checks.filter((c) => !c.ok).map((c) => c.name).join('; ')}`, 'err');
  // Сохраняем только claims и результаты проверок, а не сам токен.
  ss.set('oidc.session', { sub: v.payload.sub, name: v.payload.name, email: v.payload.email, iss: v.payload.iss, exp: v.payload.exp, header: v.header, payload: v.payload, checks: v.checks });
  say('Вход выполнен через OIDC.', 'ok');
}

function getProfile() {
  const s = ss.get('oidc.session');
  if (!s) return { status: 401, data: { message: 'Требуется вход через OIDC' } };
  if (Date.now() >= s.exp * 1000) { ss.del('oidc.session'); return { status: 401, data: { message: 'Сессия истекла' } }; }
  return { status: 200, data: s };
}

function showGuest() {
  clearInterval(state.timerId);
  $('#guestBar').hidden = false; $('#userBar').hidden = true;
  $('#loginSection').hidden = false; $('#profileSection').hidden = true;
}
function render() {
  const r = getProfile();
  if (r.status !== 200) { showGuest(); return false; }
  const s = r.data;
  $('#userName').textContent = s.name;
  $('#guestBar').hidden = true; $('#userBar').hidden = false;
  $('#loginSection').hidden = true; $('#profileSection').hidden = false;
  const dl = $('#claims'); dl.replaceChildren();
  for (const [k, label] of [['name', 'Имя'], ['email', 'Email'], ['sub', 'Идентификатор (sub)'], ['iss', 'Провайдер (iss)']]) {
    dl.append(Object.assign(document.createElement('dt'), { textContent: label }), Object.assign(document.createElement('dd'), { textContent: s[k] || '—' }));
  }
  const ul = $('#checks'); ul.replaceChildren();
  for (const c of [...s.checks, { name: 'state совпал с отправленным (защита от CSRF)', ok: true }, { name: 'PKCE: провайдер сверил code_verifier с code_challenge', ok: true }]) {
    ul.append(Object.assign(document.createElement('li'), { textContent: c.name, className: c.ok ? '' : 'bad' }));
  }
  $('#jwtDump').textContent = JSON.stringify({ header: s.header, payload: s.payload }, null, 2);
  clearInterval(state.timerId); tick(); state.timerId = setInterval(tick, 1000);
  return true;
}
function tick() {
  const s = ss.get('oidc.session');
  if (!s) return;
  const left = Math.max(0, s.exp * 1000 - Date.now());
  const m = Math.floor(left / 60000), sec = Math.floor((left % 60000) / 1000);
  const el = $('#timer');
  el.textContent = `Сессия: ${m}:${String(sec).padStart(2, '0')}`;
  el.classList.toggle('low', left < 60000);
  if (left === 0) { getProfile(); showGuest(); say('Сессия истекла. Войдите снова.', 'err'); }
}

// ---------- обработчики ----------
$('#loginBtn').addEventListener('click', () => startLogin());
$('#tamperState').addEventListener('click', () => startLogin({ tamper: 'state' }));
$('#tamperPkce').addEventListener('click', () => startLogin({ tamper: 'pkce' }));
$('#profileBtn').addEventListener('click', () => {
  const r = getProfile();
  const el = $('#checkResult');
  el.textContent = `GET /profile → ${r.status}: ${r.data.message || 'доступ разрешён, пользователь ' + r.data.name}`;
  el.className = r.status === 200 ? 'ok' : 'err';
  if (r.status === 401) render();
});
$('#logoutBtn').addEventListener('click', () => $('#confirmLogout').showModal());
$('#confirmNo').addEventListener('click', () => $('#confirmLogout').close());
$('#confirmYes').addEventListener('click', () => { $('#confirmLogout').close(); ss.del('oidc.session'); showGuest(); say('Вы вышли из аккаунта', 'ok'); });
$('#shortTtl').checked = IdP.ttlSeconds() === 15;
$('#shortTtl').addEventListener('change', (e) => IdP.setTtl(e.target.checked ? 15 : 1800));
$('#resetBtn').addEventListener('click', () => { IdP.resetAll(); ss.del('oidc.session'); ss.del('oidc.tx'); showGuest(); say('Данные сброшены', 'ok'); });

(async function init() {
  const params = new URLSearchParams(location.search);
  if (params.has('code') || params.has('error')) await handleCallback(params);
  render();
})();
