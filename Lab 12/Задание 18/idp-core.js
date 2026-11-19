'use strict';
const IdP = (() => {
  const ISSUER = 'https://idp.sim.local';
  const CLIENT_ID = 'lab12-demo-client';
  const USER = { sub: 'user-1001', login: 'student', name: 'Студент Тестов', email: 'student@example.test', salt: '64a3b1d32aca74ba9d2e9945c03d57f1', hash: 'b8f7857387e6641c18efb883a5ccccd002d69664ccfc13d6855e47be9ffadc91' };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* недоступно */ } },
  };
  const ttlSeconds = () => Number(store.get('idp.ttlSeconds', 1800)) || 1800;
  const RS = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };

  async function ensureKeys() {
    let k = store.get('idp.keys', null);
    if (k) return k;
    const pair = await crypto.subtle.generateKey({ ...RS, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) }, true, ['sign', 'verify']);
    k = { kid: CU.randomString(6), priv: await crypto.subtle.exportKey('jwk', pair.privateKey), pub: await crypto.subtle.exportKey('jwk', pair.publicKey) };
    store.set('idp.keys', k);
    return k;
  }
  async function jwks() {                  
    const k = await ensureKeys();
    return { keys: [{ ...k.pub, kid: k.kid, alg: 'RS256', use: 'sig' }] };
  }
  async function checkPassword(login, password) {
    const hash = await CU.pbkdf2Hex(password, USER.salt);
    return login === USER.login && hash === USER.hash;
  }
  function issueCode({ redirectUri, challenge, nonce, scope }) { 
    const codes = store.get('idp.codes', {});
    const code = CU.randomString(24);
    codes[code] = { clientId: CLIENT_ID, redirectUri, challenge, nonce, scope, sub: USER.sub, exp: Date.now() + 60000, used: false };
    store.set('idp.codes', codes);
    return code;
  }
  const err = (error, error_description) => ({ error, error_description });

  async function token({ code, codeVerifier, redirectUri, clientId }) {
    const codes = store.get('idp.codes', {});
    const c = codes[code];
    if (!c) return err('invalid_grant', 'Код не найден');
    if (c.used) { delete codes[code]; store.set('idp.codes', codes); return err('invalid_grant', 'Код уже использован'); }
    c.used = true; store.set('idp.codes', codes);           // код одноразовый
    if (Date.now() > c.exp) return err('invalid_grant', 'Срок действия кода истёк');
    if (c.clientId !== clientId || c.redirectUri !== redirectUri) return err('invalid_grant', 'client_id или redirect_uri не совпадают');
    const challenge = CU.b64url(await CU.sha256(codeVerifier || ''));
    if (challenge !== c.challenge) return err('invalid_grant', 'PKCE: code_verifier не соответствует code_challenge');
    const keys = await ensureKeys();
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT', kid: keys.kid };
    const payload = { iss: ISSUER, sub: USER.sub, aud: CLIENT_ID, iat: now, exp: now + ttlSeconds(), nonce: c.nonce, name: USER.name, email: USER.email };
    const part = (o) => CU.b64url(CU.enc.encode(JSON.stringify(o)));
    const signingInput = `${part(header)}.${part(payload)}`;
    const key = await crypto.subtle.importKey('jwk', keys.priv, RS, false, ['sign']);
    const sig = await crypto.subtle.sign(RS.name, key, CU.enc.encode(signingInput));
    return { id_token: `${signingInput}.${CU.b64url(sig)}`, token_type: 'Bearer', expires_in: ttlSeconds() };
  }
  return { ISSUER, CLIENT_ID, USER_PUBLIC: { login: USER.login }, checkPassword, issueCode, token, jwks,
    setTtl: (s) => store.set('idp.ttlSeconds', s), ttlSeconds,
    resetAll: () => ['idp.codes', 'idp.keys'].forEach((k) => localStorage.removeItem(k)) };
})();
