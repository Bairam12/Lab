'use strict';
// ЛР №12, вариант 18 — OIDC-вход через sandbox-провайдера: authorization code flow + PKCE.
// Используется библиотека openid-client (сертифицированная OpenID-реализация); собственного OAuth-сервера нет.
// Приложение — «Relying Party»: оно НЕ видит пароль пользователя, вход происходит на стороне провайдера.
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const { secureHeaders, sendJson, parseCookies, sessionCookie, clearCookie, sameOrigin, serveStatic } = require('./lib/http-utils');
const { SessionStore } = require('./lib/sessions');

const PUBLIC_DIR = path.join(__dirname, 'public');

function createServer({ ttlMs = 30 * 60 * 1000, idleMs = 15 * 60 * 1000, baseUrl = process.env.BASE_URL || 'http://localhost:3000' } = {}) {
  const sessions = new SessionStore({ ttlMs, idleMs });
  const pending = new Map();   // tx-id -> { state, nonce, verifier, exp }: данные одной попытки входа
  const redirectUri = `${baseUrl}/auth/callback`;
  let oidc;                    // модуль openid-client (ESM -> dynamic import)
  let configPromise;           // конфигурация провайдера, загружается один раз

  function getConfig() {
    if (!configPromise) {
      configPromise = (async () => {
        oidc = await import('openid-client');
        const issuer = new URL(process.env.OIDC_ISSUER || 'https://op.panva.hu');
        if (process.env.OIDC_CLIENT_ID) {
          // Свой клиент, зарегистрированный у провайдера
          return oidc.discovery(issuer, process.env.OIDC_CLIENT_ID, process.env.OIDC_CLIENT_SECRET);
        }
        // Sandbox: динамическая регистрация клиента у тестового провайдера
        return oidc.dynamicClientRegistration(issuer, {
          redirect_uris: [redirectUri],
          response_types: ['code'],
          grant_types: ['authorization_code'],
          client_name: 'Lab12 OIDC demo',
        });
      })().catch((e) => { configPromise = null; throw e; });
    }
    return configPromise;
  }

  function auth(req) {
    const sid = parseCookies(req).sid;
    const session = sessions.get(sid);
    return session ? { sid, session } : null;
  }

  const redirect = (res, location, headers = {}) => { res.writeHead(302, { Location: location, ...headers }); res.end(); };

  // GET /auth/login — старт: генерируем PKCE-пару, state и nonce, отправляем пользователя к провайдеру.
  async function login(req, res) {
    const config = await getConfig();
    const verifier = oidc.randomPKCECodeVerifier();
    const challenge = await oidc.calculatePKCECodeChallenge(verifier);
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const txId = crypto.randomBytes(24).toString('base64url');
    pending.set(txId, { state, nonce, verifier, exp: Date.now() + 10 * 60_000 });
    const url = oidc.buildAuthorizationUrl(config, {
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      nonce,
    });
    redirect(res, url.href, { 'Set-Cookie': sessionCookie('tx', txId, 600) });
  }

  // GET /auth/callback — провайдер вернул code. Проверяем state, обмениваем code (+ code_verifier) на токены,
  // библиотека проверяет подпись ID-токена, iss, aud, exp и nonce.
  async function callback(req, res, url) {
    const txId = parseCookies(req).tx;
    const tx = pending.get(txId);
    pending.delete(txId);                    // одноразовая попытка
    const clearTx = { 'Set-Cookie': clearCookie('tx') };
    if (url.searchParams.get('error')) return redirect(res, '/?error=provider_denied', clearTx);
    if (!tx || tx.exp < Date.now()) return redirect(res, '/?error=login_expired', clearTx);
    try {
      const config = await getConfig();
      const currentUrl = new URL(url.pathname + url.search, baseUrl);
      const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
        pkceCodeVerifier: tx.verifier,
        expectedState: tx.state,
        expectedNonce: tx.nonce,
      });
      const claims = tokens.claims();
      // В сессии храним только нужные claims. Токены в браузер не передаются вообще.
      const sid = sessions.create({
        userId: claims.sub,
        sub: claims.sub,
        name: claims.name || claims.preferred_username || 'Пользователь',
        email: claims.email || null,
        issuer: claims.iss,
      });
      return redirect(res, '/', { 'Set-Cookie': sessionCookie('sid', sid, Math.floor(ttlMs / 1000)) });
    } catch (e) {
      console.error('OIDC callback error:', e && e.code, e && e.message);
      return redirect(res, '/?error=login_failed', clearTx);
    }
  }

  async function api(req, res, url) {
    const route = `${req.method} ${url.pathname}`;
    if (req.method !== 'GET' && !sameOrigin(req)) return sendJson(res, 403, { error: 'BAD_ORIGIN' });

    if (route === 'GET /api/me') {            // публичная проверка: «я вошёл?»
      const a = auth(req);
      return sendJson(res, 200, a ? { authenticated: true, name: a.session.name, expiresAt: sessions.expiresAt(a.session) } : { authenticated: false });
    }
    if (route === 'GET /api/profile') {       // защищённый ресурс
      const a = auth(req);
      if (!a) return sendJson(res, 401, { error: 'UNAUTHORIZED', message: 'Требуется вход через OIDC' });
      const { sub, name, email, issuer } = a.session;
      return sendJson(res, 200, { sub, name, email, issuer, expiresAt: sessions.expiresAt(a.session) });
    }
    return sendJson(res, 404, { error: 'NOT_FOUND' });
  }

  const server = http.createServer(async (req, res) => {
    try {
      secureHeaders(res);
      const url = new URL(req.url, baseUrl);
      if (req.method === 'GET' && url.pathname === '/auth/login') return await login(req, res);
      if (req.method === 'GET' && url.pathname === '/auth/callback') return await callback(req, res, url);
      if (req.method === 'POST' && url.pathname === '/auth/logout') {
        if (!sameOrigin(req)) return sendJson(res, 403, { error: 'BAD_ORIGIN' });
        const a = auth(req);
        if (a) sessions.destroy(a.sid);       // серверная сессия уничтожается
        return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie('sid') });
      }
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      return serveStatic(req, res, PUBLIC_DIR);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) {
        if (req.url.startsWith('/auth/')) return redirect(res, '/?error=provider_unavailable');
        return sendJson(res, 500, { error: 'SERVER_ERROR' });
      }
    }
  });
  const timer = setInterval(() => { sessions.sweep(); for (const [k, v] of pending) if (v.exp < Date.now()) pending.delete(k); }, 60_000);
  timer.unref();
  server._sessions = sessions; // для автотестов
  return server;
}

if (require.main === module) {
  try { process.loadEnvFile(path.join(__dirname, '.env')); } catch { /* .env необязателен */ }
  const port = Number(process.env.PORT) || 3018;
  process.env.BASE_URL = process.env.BASE_URL || `http://localhost:${port}`;
  createServer().listen(port, () => console.log(`OIDC-демо: http://localhost:${port}`))
    .on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `Порт ${port} уже занят: сервер, возможно, уже запущен. Закройте другое окно сервера.` : e); process.exit(1); });
}
module.exports = { createServer };
