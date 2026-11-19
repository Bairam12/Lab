'use strict';
const CU = (() => {
  const enc = new TextEncoder();
  const hexToBytes = (hex) => new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));
  const bytesToHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const b64url = (buf) => {
    let s = '';
    new Uint8Array(buf).forEach((b) => { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const b64urlToBytes = (str) => {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  };
  const randomString = (bytes = 32) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));
  const sha256 = (text) => crypto.subtle.digest('SHA-256', enc.encode(text));

  async function pbkdf2Hex(password, saltHex) {
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations: 100000 }, key, 256);
    return bytesToHex(bits);
  }
  return { enc, hexToBytes, bytesToHex, b64url, b64urlToBytes, randomString, sha256, pbkdf2Hex };
})();
