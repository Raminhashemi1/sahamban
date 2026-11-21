'use strict';

// Cloudflare Worker dedicated to the Shahmiz (شهمیز OTP) provider.
// Exposed only through a Worker Service Binding from the authenticated OTP Worker.
// Official public API documented at https://shahmiz.ir/:
// POST https://shahmiz.ir/api/send-otp.php
// Authorization: Bearer <token>
// JSON: { mobile: "09123456789", code: "123456" }
// Success response: { success: true, ... }
const API_URL = 'https://shahmiz.ir/api/send-otp.php';
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};

function reply(body, status) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function normalizeIranianMobile(value) {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/^\+98/, '0');
  return /^09[0-9]{9}$/.test(digits) ? digits : null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/send') {
      return reply({ accepted: false, error: 'NOT_FOUND' }, 404);
    }
    if (!env || typeof env.SHAHMIZ_API_TOKEN !== 'string' ||
        env.SHAHMIZ_API_TOKEN.length < 16) {
      return reply({ accepted: false, error: 'PROVIDER_NOT_CONFIGURED' }, 503);
    }
    if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return reply({ accepted: false, error: 'JSON_REQUIRED' }, 415);
    }

    let payload;
    try {
      const raw = await request.text();
      if (raw.length > 1024) return reply({ accepted: false, error: 'BODY_TOO_LARGE' }, 413);
      payload = JSON.parse(raw);
    } catch (_) {
      return reply({ accepted: false, error: 'INVALID_JSON' }, 400);
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
        Object.keys(payload).sort().join(',') !== 'destination,idempotencyKey,message' ||
        typeof payload.idempotencyKey !== 'string' ||
        !/^[a-f0-9]{48}$/.test(payload.idempotencyKey) ||
        typeof payload.message !== 'string') {
      return reply({ accepted: false, error: 'INVALID_REQUEST' }, 400);
    }

    const mobile = normalizeIranianMobile(payload.destination);
    const match = /^کد ورود سهمینو: ([0-9]{6})$/.exec(payload.message);
    if (!mobile || !match) return reply({ accepted: false, error: 'INVALID_OTP_PAYLOAD' }, 400);

    let upstream;
    try {
      upstream = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + env.SHAHMIZ_API_TOKEN,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ mobile, code: match[1] })
      });
    } catch (_) {
      return reply({ accepted: false, error: 'PROVIDER_UNAVAILABLE' }, 503);
    }

    let result;
    try { result = await upstream.json(); }
    catch (_) { return reply({ accepted: false, error: 'PROVIDER_BAD_RESPONSE' }, 502); }
    if (!upstream.ok || result?.success !== true) {
      // Do not forward provider messages, balances, or credentials to the caller.
      return reply({ accepted: false, error: 'PROVIDER_REJECTED' }, 502);
    }
    // Shahmiz's public example does not document a message ID. Do not invent one.
    return reply({ accepted: true }, 200);
  }
};
