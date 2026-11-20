'use strict';

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

function createD1AuthRepository(db, { sessionTtlSeconds = 30 * 24 * 60 * 60, clock = () => Date.now() } = {}) {
  requireDb(db);
  if (!Number.isSafeInteger(sessionTtlSeconds) || sessionTtlSeconds < 300 || sessionTtlSeconds > 90 * 24 * 60 * 60) {
    throw new TypeError('sessionTtlSeconds must be between 5 minutes and 90 days');
  }

  async function findCredentialByUsername(username) {
    const row = await db.prepare(\`
      SELECT c.user_id AS userId,c.username_normalized AS username,
        c.password_hash AS passwordHash,u.status AS accountStatus
      FROM sahmino_user_credentials c
      JOIN sahamban_users u ON u.id=c.user_id
      WHERE c.username_normalized=? AND c.disabled_at IS NULL LIMIT 1
    \`).bind(username).first();
    return row || null;
  }

  async function reserveLoginAttempt({ ipKey, usernameKey, now, maxIpPerHour = 30, maxUsernamePerHour = 10 }) {
    const nowSec = Math.floor(now / 1000);
    const attemptId = 'lat_' + randomHex(16);
    const results = await db.batch([
      db.prepare(\`
        INSERT INTO sahmino_auth_login_attempts(id,ip_key_hmac,username_key_hmac,created_epoch)
        SELECT ?,?,?,?
        WHERE
          (SELECT COUNT(*) FROM sahmino_auth_login_attempts WHERE ip_key_hmac=? AND created_epoch>?) < ?
          AND
          (SELECT COUNT(*) FROM sahmino_auth_login_attempts WHERE username_key_hmac=? AND created_epoch>?) < ?
      \`).bind(attemptId, ipKey, usernameKey, nowSec, ipKey, nowSec - 3600, maxIpPerHour,
        usernameKey, nowSec - 3600, maxUsernamePerHour),
      db.prepare('DELETE FROM sahmino_auth_login_attempts WHERE created_epoch < ?')
        .bind(nowSec - 86400)
    ]);
    return results?.[0]?.meta?.changes === 1;
  }

  async function createSharedSession({ userId, authenticatedAt }) {
    const bearer = randomHex(32);
    const tokenHash = await sha256Hex(bearer);
    const sessionId = 'ses_' + randomHex(16);
    const expiresAt = iso(Date.parse(authenticatedAt) + sessionTtlSeconds * 1000);
    const result = await db.prepare(\`
      INSERT INTO sahmino_shared_sessions(id,user_id,token_hash,created_at,expires_at,last_seen_at)
      SELECT ?,?,?,?,?,? WHERE EXISTS (
        SELECT 1 FROM sahamban_users WHERE id=? AND status='ACTIVE'
      )
    \`).bind(sessionId, userId, tokenHash, authenticatedAt, expiresAt, authenticatedAt, userId).run();
    if (result.meta?.changes !== 1) return null;
    return { cookie: 'sahmino_session=' + bearer + '; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=' + sessionTtlSeconds,
      expiresAt };
  }

  async function findActiveSession(bearer, now = clock()) {
    if (typeof bearer !== 'string' || !/^[a-f0-9]{64}$/.test(bearer)) return null;
    const tokenHash = await sha256Hex(bearer);
    const row = await db.prepare(\`
      SELECT s.id AS sessionId,s.user_id AS userId,s.expires_at AS expiresAt,s.last_seen_at AS lastSeenAt
      FROM sahmino_shared_sessions s
      JOIN sahamban_users u ON u.id=s.user_id
      WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.status='ACTIVE'
      LIMIT 1
    \`).bind(tokenHash, iso(now)).first();
    return row || null;
  }

  async function revokeSession(bearer, revokedAt = iso(clock())) {
    if (typeof bearer !== 'string' || !/^[a-f0-9]{64}$/.test(bearer)) return false;
    const tokenHash = await sha256Hex(bearer);
    const result = await db.prepare(\`
      UPDATE sahmino_shared_sessions SET revoked_at=?
      WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?
    \`).bind(revokedAt, tokenHash, revokedAt).run();
    return result.meta?.changes === 1;
  }

  function clearSessionCookie() {
    return 'sahmino_session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0';
  }

  return Object.freeze({ findCredentialByUsername, reserveLoginAttempt, createSharedSession,
    findActiveSession, revokeSession, clearSessionCookie });
}
module.exports = { createD1AuthRepository, sha256Hex };
