'use strict';

const {
  OTP_TTL_SECONDS, OTP_MAX_ATTEMPTS, normalizeIranianMobile,
  randomNumericOtp, randomChallengeId, otpVerifier, verifyOtpVerifier
} = require('./sms-otp-core.cjs');

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_SENDS_PER_PHONE_PER_HOUR = 5;
const MAX_SENDS_PER_IP_PER_HOUR = 20;

// Repository contract deliberately makes atomic consume and account/session
// creation explicit. A production D1 implementation must implement these
// methods with conditional SQL/batch transactions before routes are enabled.
function createSmsOtpService({ repository, adapter, verifierSecret, clock = () => Date.now() }) {
  if (!repository || !adapter || typeof adapter.sendOtp !== 'function') {
    throw new TypeError('repository and SMS adapter are required');
  }
  if (typeof verifierSecret !== 'string' || new TextEncoder().encode(verifierSecret).length < 32) {
    throw new TypeError('dedicated OTP verifier secret must contain at least 32 bytes');
  }

  async function requestCode({ phone, ipKey }) {
    const phoneE164 = normalizeIranianMobile(phone);
    if (!phoneE164) return { ok: false, status: 400, error: 'INVALID_IRANIAN_MOBILE' };
    if (typeof ipKey !== 'string' || !/^[a-f0-9]{64}$/.test(ipKey)) {
      return { ok: false, status: 400, error: 'INVALID_REQUEST' };
    }
    const now = clock();
    const quota = await repository.checkSendQuota({
      phoneE164, ipKey, now,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      maxPhonePerHour: MAX_SENDS_PER_PHONE_PER_HOUR,
      maxIpPerHour: MAX_SENDS_PER_IP_PER_HOUR
    });
    if (!quota.allowed) return { ok: false, status: 429, error: 'OTP_RATE_LIMITED', retryAfterSeconds: quota.retryAfterSeconds || RESEND_COOLDOWN_SECONDS };

    const code = randomNumericOtp();
    const challengeId = randomChallengeId();
    const verifier = await otpVerifier({ phoneE164, challengeId, code, secret: verifierSecret });
    const challenge = {
      id: challengeId, phoneE164, verifierHmac: verifier,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + OTP_TTL_SECONDS * 1000).toISOString(),
      attempts: 0, maxAttempts: OTP_MAX_ATTEMPTS, sendState: 'PENDING'
    };
    // Reserve quota and persist a pending challenge before contacting a vendor.
    const reserved = await repository.createChallengeAndReserveQuota(challenge, { ipKey, now });
    if (!reserved) return { ok: false, status: 429, error: 'OTP_RATE_LIMITED', retryAfterSeconds: RESEND_COOLDOWN_SECONDS };

    let delivery;
    try {
      delivery = await adapter.sendOtp({
        destination: phoneE164,
        message: 'کد ورود سهمینو: ' + code,
        idempotencyKey: challengeId
      });
    } catch (_) {
      delivery = { accepted: false };
    }
    if (!delivery || delivery.accepted !== true) {
      await repository.markChallengeFailed(challengeId, new Date(clock()).toISOString());
      return { ok: false, status: 503, error: 'OTP_DELIVERY_UNAVAILABLE' };
    }
    await repository.markChallengeAccepted(challengeId, {
      providerMessageId: typeof delivery.providerMessageId === 'string' ? delivery.providerMessageId.slice(0, 128) : null,
      acceptedAt: new Date(clock()).toISOString()
    });
    return { ok: true, status: 202, challengeId, expiresInSeconds: OTP_TTL_SECONDS, resendAfterSeconds: RESEND_COOLDOWN_SECONDS };
  }

  async function verifyCode({ challengeId, code }) {
    if (typeof challengeId !== 'string' || !/^[a-f0-9]{48}$/.test(challengeId) ||
        typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) {
      return { ok: false, status: 400, error: 'INVALID_OTP_REQUEST' };
    }
    const now = clock();
    const challenge = await repository.getChallenge(challengeId);
    if (!challenge || challenge.sendState !== 'ACCEPTED' || challenge.consumedAt ||
        challenge.supersededAt || Date.parse(challenge.expiresAt) <= now ||
        challenge.attempts >= OTP_MAX_ATTEMPTS) {
      return { ok: false, status: 400, error: 'OTP_INVALID_OR_EXPIRED' };
    }
    const matches = await verifyOtpVerifier({
      phoneE164: challenge.phoneE164, challengeId, code,
      verifier: challenge.verifierHmac, secret: verifierSecret
    });
    if (!matches) {
      await repository.recordFailedAttempt(challengeId, {
        maxAttempts: OTP_MAX_ATTEMPTS, now: new Date(now).toISOString()
      });
      return { ok: false, status: 400, error: 'OTP_INVALID_OR_EXPIRED' };
    }
    // Must be one atomic compare-and-consume operation. Exactly one concurrent
    // request may proceed to account resolution/session issuance.
    const consumed = await repository.consumeChallengeOnce(challengeId, {
      expectedVerifier: challenge.verifierHmac,
      now: new Date(now).toISOString(),
      maxAttempts: OTP_MAX_ATTEMPTS
    });
    if (!consumed) return { ok: false, status: 400, error: 'OTP_INVALID_OR_EXPIRED' };

    // Resolve/create only after successful atomic consumption. Never accept a
    // caller-supplied account ID and never merge accounts by email.
    const account = await repository.resolveOrCreateByVerifiedPhone(challenge.phoneE164, new Date(now).toISOString());
    if (!account || typeof account.userId !== 'string') {
      return { ok: false, status: 503, error: 'ACCOUNT_UNAVAILABLE' };
    }
    const session = await repository.createSharedSession({
      userId: account.userId,
      authenticatedAt: new Date(now).toISOString()
    });
    if (!session || typeof session.cookie !== 'string') {
      return { ok: false, status: 503, error: 'SESSION_UNAVAILABLE' };
    }
    return { ok: true, status: 200, userId: account.userId, sessionCookie: session.cookie };
  }

  return Object.freeze({ requestCode, verifyCode });
}

module.exports = {
  createSmsOtpService,
  RESEND_COOLDOWN_SECONDS,
  MAX_SENDS_PER_PHONE_PER_HOUR,
  MAX_SENDS_PER_IP_PER_HOUR
};
