'use strict';

// Provider-neutral SMS OTP primitives. No gateway, HTTP route, account creation,
// session issuance, or payment behavior is implemented in this module.
const OTP_TTL_SECONDS = 120;
const OTP_MAX_ATTEMPTS = 5;
const OTP_DIGITS = 6;
const IRAN_MOBILE = /^09[0-9]{9}$/;
const encoder = new TextEncoder();

function normalizeIranianMobile(input) {
  if (typeof input !== 'string' || input.length > 32) return null;
  let value = input.trim().replace(/[\u0660-\u0669]/g, ch => String(ch.charCodeAt(0)-0x0660))
    .replace(/[\u06f0-\u06f9]/g, ch => String(ch.charCodeAt(0)-0x06f0));
  value = value.replace(/[\s().-]/g, '');
  if (value.startsWith('+98')) value = '0' + value.slice(3);
  else if (value.startsWith('0098')) value = '0' + value.slice(4);
  else if (value.startsWith('98') && value.length === 12) value = '0' + value.slice(2);
  return IRAN_MOBILE.test(value) ? '+98' + value.slice(1) : null;
}

function randomNumericOtp() {
  const bytes = new Uint8Array(16);
  const ceiling = Math.floor(256 / 10) * 10;
  let digits = '';
  while (digits.length < OTP_DIGITS) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= ceiling) continue;
      digits += String(byte % 10);
      if (digits.length === OTP_DIGITS) break;
    }
  }
  return digits;
}

function randomChallengeId() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function otpVerifier({ phoneE164, challengeId, code, secret }) {
  if (typeof secret !== 'string' || encoder.encode(secret).length < 32) {
    throw new TypeError('OTP verifier secret must contain at least 32 bytes');
  }
  if (typeof phoneE164 !== 'string' || typeof challengeId !== 'string' ||
      !/^[0-9]{6}$/.test(String(code))) throw new TypeError('Invalid OTP verifier input');
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const payload = encoder.encode(phoneE164 + '\\n' + challengeId + '\\n' + code);
  const signature = await crypto.subtle.sign('HMAC', key, payload);
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyOtpVerifier({ phoneE164, challengeId, code, verifier, secret }) {
  if (typeof verifier !== 'string' || !/^[a-f0-9]{64}$/.test(verifier)) return false;
  let expected;
  try { expected = await otpVerifier({ phoneE164, challengeId, code, secret }); }
  catch (_) { return false; }
  // Compare fixed-length verifier bytes without early exit.
  let difference = 0;
  for (let i = 0; i < expected.length; i++) {
    difference |= expected.charCodeAt(i) ^ verifier.charCodeAt(i);
  }
  return difference === 0;
}

module.exports = {
  OTP_TTL_SECONDS, OTP_MAX_ATTEMPTS, OTP_DIGITS,
  normalizeIranianMobile, randomNumericOtp, randomChallengeId,
  otpVerifier, verifyOtpVerifier
};
