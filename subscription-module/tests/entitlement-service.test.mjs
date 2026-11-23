import test from 'node:test';
import assert from 'node:assert/strict';
import { getBillingEntitlement } from '../server/entitlement-service.mjs';

function makeDb(row = null) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      calls.push({ sql, values: [] });
      return {
        bind(...values) { calls[calls.length - 1].values = values; return this; },
        first: async () => row
      };
    }
  };
}

test('entitlement lookup rejects missing and overlong authenticated identities before database access', async () => {
  const db = makeDb();
  assert.equal((await getBillingEntitlement(db, '')).error, 'UNAUTHENTICATED');
  assert.equal((await getBillingEntitlement(db, 'u'.repeat(257))).error, 'UNAUTHENTICATED');
  assert.equal(db.calls.length, 0);
});

test('entitlement lookup binds only the authenticated user ID and reports active access', async () => {
  const db = makeDb({ expires_at: '2027-03-01T00:00:00.000Z', auto_renewing: 0 });
  const result = await getBillingEntitlement(db, 'user-1', '2027-02-01T00:00:00.000Z');
  assert.equal(result.ok, true);
  assert.equal(result.active, true);
  assert.equal(result.expiresAt, '2027-03-01T00:00:00.000Z');
  assert.deepEqual(db.calls[0].values, ['user-1']);
});

test('entitlement lookup reports inactive access after expiry', async () => {
  const db = makeDb({ expires_at: '2027-01-01T00:00:00.000Z', auto_renewing: 0 });
  const result = await getBillingEntitlement(db, 'user-1', '2027-02-01T00:00:00.000Z');
  assert.equal(result.ok, true);
  assert.equal(result.active, false);
});
