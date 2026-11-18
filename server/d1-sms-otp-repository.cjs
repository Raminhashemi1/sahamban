'use strict';

const {randomChallengeId} = require('./sms-otp-core.cjs');

function requireDb(db) {
  if (!db || typeof db.prepare !== 'function' || typeof db.batch !== 'function') {
    throw new TypeError('Cloudflare D1 binding with prepare() and batch() is required');
  }
  return db;
}
function iso(ms) { return new Date(ms).toISOString(); }
function randomHex(bytes = 24) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)),
    b => b.toString(16).padStart(2, '0')).join('');
}
async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

function createD1SmsOtpRepository(db, { sessionTtlSeconds = 30 * 24 * 60 * 60, clock = () => Date.now() } = {}) {
  requireDb(db);
  if (!Number.isSafeInteger(sessionTtlSeconds) || sessionTtlSeconds < 300 || sessionTtlSeconds > 90 * 24 * 60 * 60) {
    throw new TypeError('sessionTtlSeconds must be between 5 minutes and 90 days');
  }

  async function checkSendQuota({ phoneE164, ipKey, now, cooldownSeconds, maxPhonePerHour, maxIpPerHour }) {
    const nowSec = Math.floor(now / 1000);
    const row = await db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM sahmino_sms_otp_send_events WHERE phone_e164=? AND created_epoch>?) AS phone_count,
        (SELECT COUNT(*) FROM sahmino_sms_otp_send_events WHERE ip_key_hmac=? AND created_epoch>?) AS ip_count,
        (SELECT MAX(created_epoch) FROM sahmino_sms_otp_send_events WHERE phone_e164=?) AS last_phone_send
    `).bind(phoneE164, nowSec - 3600, ipKey, nowSec - 3600, phoneE164).first();
    if (!row) return { allowed: false, retryAfterSeconds: cooldownSeconds };
    const cooldownLeft = row.last_phone_send == null ? 0 : Math.max(0, cooldownSeconds - (nowSec - row.last_phone_send));
    const phoneLimited = row.phone_count >= maxPhonePerHour;
    const ipLimited = row.ip_count >= maxIpPerHour;
    if (cooldownLeft || phoneLimited || ipLimited) {
      return { allowed: false, retryAfterSeconds: cooldownLeft || 3600 };
    }
    return { allowed: true };
  }

  async function createChallengeAndReserveQuota(challenge, { ipKey, now }) {
    const nowSec = Math.floor(now / 1000);
    const eventId = 'evt_' + randomChallengeId();
    const results = await db.batch([
      db.prepare(`INSERT INTO sahmino_sms_otp_send_events
        (id,phone_e164,ip_key_hmac,created_at,created_epoch)
        SELECT ?,?,?,?,?
        WHERE
          (SELECT COUNT(*) FROM sahmino_sms_otp_send_events WHERE phone_e164=? AND created_epoch>?) < 5
          AND (SELECT COUNT(*) FROM sahmino_sms_otp_send_events WHERE ip_key_hmac=? AND created_epoch>?) < 20
          AND NOT EXISTS (SELECT 1 FROM sahmino_sms_otp_send_events WHERE phone_e164=? AND created_epoch>?)
      `).bind(eventId, challenge.phoneE164, ipKey, challenge.createdAt, nowSec,
        challenge.phoneE164, nowSec - 3600, ipKey, nowSec - 3600,
        challenge.phoneE164, nowSec - 60),
      db.prepare(`UPDATE sahmino_sms_otp_challenges SET superseded_at=?
        WHERE phone_e164=? AND send_state IN ('PENDING','ACCEPTED')
          AND consumed_at IS NULL AND superseded_at IS NULL
          AND EXISTS (SELECT 1 FROM sahmino_sms_otp_send_events WHERE id=?)
      `).bind(challenge.createdAt, challenge.phoneE164, eventId),
      db.prepare(`INSERT INTO sahmino_sms_otp_challenges
        (id,phone_e164,verifier_hmac,created_at,expires_at,attempts,max_attempts,send_state)
        SELECT ?,?,?,?,?,0,5,'PENDING'
        WHERE EXISTS (SELECT 1 FROM sahmino_sms_otp_send_events WHERE id=?)
      `).bind(challenge.id, challenge.phoneE164, challenge.verifierHmac,
        challenge.createdAt, challenge.expiresAt, eventId)
    ]);
    return Boolean(results?.[2]?.meta?.changes === 1);
  }

  async function markChallengeFailed(id, at) {
    const result = await db.prepare(`UPDATE sahmino_sms_otp_challenges SET send_state='FAILED'
      WHERE id=? AND send_state='PENDING' AND consumed_at IS NULL`).bind(id).run();
    return result.meta?.changes === 1;
  }
  async function markChallengeAccepted(id, { providerMessageId }) {
    const result = await db.prepare(`UPDATE sahmino_sms_otp_challenges
      SET send_state='ACCEPTED',provider_message_ref=?
      WHERE id=? AND send_state='PENDING' AND consumed_at IS NULL`)
      .bind(providerMessageId, id).run();
    return result.meta?.changes === 1;
  }
  async function getChallenge(id) {
    const row = await db.prepare(`SELECT id,phone_e164 AS phoneE164,verifier_hmac AS verifierHmac,
      created_at AS createdAt,expires_at AS expiresAt,attempts,max_attempts AS maxAttempts,
      consumed_at AS consumedAt,superseded_at AS supersededAt,send_state AS sendState
      FROM sahmino_sms_otp_challenges WHERE id=? LIMIT 1`).bind(id).first();
    return row || null;
  }
  async function recordFailedAttempt(id, { maxAttempts, now }) {
    const result = await db.prepare(`UPDATE sahmino_sms_otp_challenges SET attempts=attempts+1
      WHERE id=? AND send_state='ACCEPTED' AND consumed_at IS NULL AND superseded_at IS NULL
        AND expires_at>? AND attempts<? AND max_attempts=?`)
      .bind(id, now, maxAttempts, maxAttempts).run();
    return result.meta?.changes === 1;
  }
  async function consumeChallengeOnce(id, { expectedVerifier, now, maxAttempts }) {
    const result = await db.prepare(`UPDATE sahmino_sms_otp_challenges SET consumed_at=?
      WHERE id=? AND verifier_hmac=? AND send_state='ACCEPTED'
        AND consumed_at IS NULL AND superseded_at IS NULL AND expires_at>?
        AND attempts<? AND max_attempts=?`)
      .bind(now, id, expectedVerifier, now, maxAttempts, maxAttempts).run();
    return result.meta?.changes === 1;
  }

  async function resolveOrCreateByVerifiedPhone(phoneE164, verifiedAt) {
    const existing = await db.prepare(`SELECT user_id FROM sahmino_phone_identities
      WHERE phone_e164=? AND revoked_at IS NULL LIMIT 1`).bind(phoneE164).first();
    if (existing?.user_id) return { userId: existing.user_id };

    const userId = 'usr_' + randomHex(16);
    const identityId = 'phn_' + randomHex(16);
    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO sahamban_users(id,email_normalized,auth_subject,created_at,status)
        VALUES (?,NULL,NULL,?,'ACTIVE')`).bind(userId, verifiedAt),
      db.prepare(`INSERT OR IGNORE INTO sahmino_phone_identities
        (id,user_id,phone_e164,verified_at,created_at)
        SELECT ?,?, ?,?,? WHERE EXISTS (SELECT 1 FROM sahamban_users WHERE id=? AND status='ACTIVE')
      `).bind(identityId, userId, phoneE164, verifiedAt, verifiedAt, userId)
    ]);
    const linked = await db.prepare(`SELECT user_id FROM sahmino_phone_identities
      WHERE phone_e164=? AND revoked_at IS NULL LIMIT 1`).bind(phoneE164).first();
    return linked?.user_id ? { userId: linked.user_id } : null;
  }

  async function findActiveSession(bearer, now = clock()) {
    if (typeof bearer !== 'string' || !/^[a-f0-9]{64}$/.test(bearer)) return null;
    const tokenHash = await sha256Hex(bearer);
    const row = await db.prepare(`SELECT s.id AS sessionId,s.user_id AS userId,
      s.expires_at AS expiresAt,s.last_seen_at AS lastSeenAt
      FROM sahmino_shared_sessions s
      JOIN sahamban_users u ON u.id=s.user_id
      WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?
        AND u.status='ACTIVE' LIMIT 1`)
      .bind(tokenHash, iso(now)).first();
    return row || null;
  }

  async function revokeSession(bearer, revokedAt = iso(clock())) {
    if (typeof bearer !== 'string' || !/^[a-f0-9]{64}$/.test(bearer)) return false;
    const tokenHash = await sha256Hex(bearer);
    const result = await db.prepare(`UPDATE sahmino_shared_sessions SET revoked_at=?
      WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?`)
      .bind(revokedAt, tokenHash, revokedAt).run();
    return result.meta?.changes === 1;
  }

  async function revokeAllUserSessions(userId, revokedAt = iso(clock())) {
    if (typeof userId !== 'string' || !/^usr_[a-f0-9]{32}$/.test(userId)) return 0;
    const result = await db.prepare(`UPDATE sahmino_shared_sessions SET revoked_at=?
      WHERE user_id=? AND revoked_at IS NULL AND expires_at>?`)
      .bind(revokedAt, userId, revokedAt).run();
    return result.meta?.changes || 0;
  }

  function clearSessionCookie() {
    return 'sahmino_session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0';
  }

  async function createSharedSession({ userId, authenticatedAt }) {
    const bearer = randomHex(32);
    const tokenHash = await sha256Hex(bearer);
    const sessionId = 'ses_' + randomHex(16);
    const expiresAt = iso(Date.parse(authenticatedAt) + sessionTtlSeconds * 1000);
    const result = await db.prepare(`INSERT INTO sahmino_shared_sessions
      (id,user_id,token_hash,created_at,expires_at,last_seen_at)
      SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM sahamban_users WHERE id=? AND status='ACTIVE')
    `).bind(sessionId, userId, tokenHash, authenticatedAt, expiresAt, authenticatedAt, userId).run();
    if (result.meta?.changes !== 1) return null;
    return { cookie: 'sahmino_session=' + bearer + '; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=' + sessionTtlSeconds };
  }

  return Object.freeze({
    checkSendQuota, createChallengeAndReserveQuota, markChallengeFailed,
    markChallengeAccepted, getChallenge, recordFailedAttempt,
    consumeChallengeOnce, resolveOrCreateByVerifiedPhone, createSharedSession,
    findActiveSession, revokeSession, revokeAllUserSessions, clearSessionCookie
  });
}

module.exports = { createD1SmsOtpRepository, sha256Hex };
