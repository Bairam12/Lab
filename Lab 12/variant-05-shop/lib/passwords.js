'use strict';
const crypto = require('crypto');

// Пароли хранятся только в виде хеша scrypt с индивидуальной солью.
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [alg, saltHex, hashHex] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Хеш-пустышка: проверяем пароль даже для несуществующего логина,
// чтобы время ответа не выдавало, какие логины зарегистрированы.
const DUMMY_HASH = hashPassword('dummy-password-for-timing');

module.exports = { hashPassword, verifyPassword, DUMMY_HASH };
