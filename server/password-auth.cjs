'use strict';

const PBKDF2_ITERATIONS = 600000;
const PASSWORD_MIN = 12;
const PASSWORD_MAX = 128;
const DUMMY_HASH = 'pbkdf2-sha256$600000$fea20d6dcd4ad2d1b7756844c3a0fc73$bd5a5daf1495f023d5bf068a14416301d4acb589b664d9fabccf9ce11c02c5c8';

function asciiDigits(value) {
  return value.replace(/[\u06f0-\u06f9]/g, c => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, c => String(c.charCodeAt(0) - 0x0660));
}

function normalizeUsername(value) {
  if (typeof value !== 'string' || value.length > 128) return null;
  const raw = asciiDigits(value.normalize('NFKC')).trim();
  if (!raw || /[\u0000-\u001f\u007f]/.test(raw)) return null;
  const phone = raw.replace(/[\s()-]/g, '');
  let digits = phone;
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('0098')) digits = digits.slice(2);
  if (/^09[0-9]{9}$/.test(digits)) return '+98' + digits.slice(1);
  if (/^989[0-9]{9}$/.test(digits)) return '+' + digits;
  if (/^9[0-9]{9}$/.test(digits)) return '+98' + digits;
  const username = raw.toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{2,63}$/.test(username) ? username : null;
}

function fromHex(value) {
  if (typeof value !== 'string' || !/^(?:[a-f0-9]{2})+$/.test(value)) return null;
  const out = new Uint8Array(value.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function toHex(value) {
  return Array.from(new Uint8Array(value), b => b.toString(16).padStart(2, '0')).join('');
}
function equalBytes(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array) || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
async function derive(password, salt, iterations = PBKDF2_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256
  ));
}
async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    throw new TypeError('Password must contain 12 to 128 characters');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const digest = await derive(password, salt);
  return 'pbkdf2-sha256$' + PBKDF2_ITERATIONS + '$' + toHex(salt) + '$' + toHex(digest);
}
async function verifyPassword(password, encodedHash) {
  const candidate = typeof password === 'string' && password.length <= PASSWORD_MAX ? password : '';
  let parts = typeof encodedHash === 'string' ? encodedHash.split('$') : [];
  let valid = parts.length === 4 && parts[0] === 'pbkdf2-sha256' &&
    parts[1] === String(PBKDF2_ITERATIONS);
  let salt = valid ? fromHex(parts[2]) : null;
  let expected = valid ? fromHex(parts[3]) : null;
  valid = valid && salt?.length === 16 && expected?.length === 32;
  if (!valid) {
    parts = DUMMY_HASH.split('$');
    salt = fromHex(parts[2]);
    expected = fromHex(parts[3]);
  }
  const actual = await derive(candidate, salt);
  const matches = equalBytes(actual, expected);
  return Boolean(valid && matches && typeof password === 'string' &&
    password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX);
}
module.exports = { normalizeUsername, hashPassword, verifyPassword, PASSWORD_MIN, PASSWORD_MAX, PBKDF2_ITERATIONS };
