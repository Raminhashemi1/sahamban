#!/usr/bin/env node
import { webcrypto } from 'node:crypto';

globalThis.crypto ||= webcrypto;
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { hashPassword, normalizeUsername } = require('../server/password-auth.cjs');

const userId = process.env.SAHMINO_USER_ID || '';
const username = normalizeUsername(process.env.SAHMINO_USERNAME || '');
const password = process.env.SAHMINO_PASSWORD || '';
if (!/^usr_[A-Za-z0-9_-]{8,80}$/.test(userId)) {
  process.stderr.write('SAHMINO_USER_ID must identify an existing account.\n');
  process.exit(2);
}
if (!username) {
  process.stderr.write('SAHMINO_USERNAME is invalid.\n');
  process.exit(2);
}
if (password.length < 12 || password.length > 128) {
  process.stderr.write('SAHMINO_PASSWORD must contain 12 to 128 characters.\n');
  process.exit(2);
}
const encoded = await hashPassword(password);
const now = new Date().toISOString();
const q = value => "'" + value.replace(/'/g, "''") + "'";
process.stdout.write(
  "INSERT INTO sahmino_user_credentials(user_id,username_normalized,password_hash,created_at,updated_at,disabled_at) " +
  "SELECT " + q(userId) + "," + q(username) + "," + q(encoded) + "," + q(now) + "," + q(now) + ",NULL " +
  "WHERE EXISTS (SELECT 1 FROM sahamban_users WHERE id=" + q(userId) + " AND status='ACTIVE') " +
  "ON CONFLICT(user_id) DO UPDATE SET username_normalized=excluded.username_normalized," +
  "password_hash=excluded.password_hash,updated_at=excluded.updated_at,disabled_at=NULL;\n"
);
