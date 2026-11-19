'use strict';
// Небольшие HTTP-утилиты без внешних зависимостей.
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function secureHeaders(res) {
  // CSP запрещает inline-скрипты: даже при XSS-ошибке в разметке код не выполнится.
  res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
}

function sendJson(res, status, body, extraHeaders = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    ...extraHeaders,
  });
  res.end(data);
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// HttpOnly — JS страницы не видит cookie (защита от кражи через XSS).
// SameSite=Lax — cookie не уходит при кросс-сайтовых POST (защита от CSRF).
// Secure — только по HTTPS (включается COOKIE_SECURE=1 на HTTPS-хостинге).
function sessionCookie(name, value, maxAgeSec) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (maxAgeSec !== undefined) parts.push(`Max-Age=${maxAgeSec}`);
  if (process.env.COOKIE_SECURE === '1') parts.push('Secure');
  return parts.join('; ');
}

function clearCookie(name) {
  return sessionCookie(name, '', 0);
}

function readJson(req, limit = 10_000) {
  return new Promise((resolve, reject) => {
    const type = (req.headers['content-type'] || '').split(';')[0].trim();
    if (type !== 'application/json') return reject({ status: 415, error: 'JSON_REQUIRED' });
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject({ status: 413, error: 'TOO_LARGE' }); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject({ status: 400, error: 'BAD_JSON' }); }
    });
    req.on('error', () => reject({ status: 400, error: 'BAD_REQUEST' }));
  });
}

// Простая CSRF-проверка: если браузер прислал Origin, он должен совпадать с Host.
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

function serveStatic(req, res, dir) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405); return res.end();
  }
  let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (pathname === '/') pathname = '/index.html';
  const file = path.normalize(path.join(dir, pathname));
  if (!file.startsWith(dir + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

module.exports = { secureHeaders, sendJson, parseCookies, sessionCookie, clearCookie, readJson, sameOrigin, serveStatic };
