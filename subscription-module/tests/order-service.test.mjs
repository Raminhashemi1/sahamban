import test from 'node:test';
import assert from 'node:assert/strict';
import { createBillingOrder } from '../server/order-service.mjs';
import { getBillingEntitlement, calculateRenewedExpiry } from '../server/entitlement-service.mjs';

function makeDb({ batchResult, entitlement = null } = {}) {
  return {
    batch: async (statements) => batchResult ?? statements.map(() => ({ success: true, meta: { changes: 1 } })),
    prepare: () => ({
      bind() { return this; },
      first: async () => entitlement
    })
  };
}
const productMaps = {
  BAZAAR: { SAHAMBAN_PRO_30D: 'bazaar-30d' },
  MYKET: { SAHAMBAN_PRO_30D: 'myket-30d' }
};

test('order amount and product are resolved by server catalog and mapping', async () => {
  const result = await createBillingOrder(makeDb(), {
    authenticatedUserId: 'auth-user-1', store: 'BAZAAR',
    planId: 'SAHAMBAN_PRO_30D', productMaps,
    now: '2027-01-01T00:00:00.000Z',
    idFactory: (() => { let n = 0; return () => `id-${++n}`; })()
  });
  assert.equal(result.ok, true);
  assert.equal(result.order.amountIrr, 1_500_000);
  assert.equal(result.order.productId, 'bazaar-30d');
  assert.equal(result.order.currency, 'IRR');
});

test('missing store product mapping fails closed', async () => {
  const result = await createBillingOrder(makeDb(), {
    authenticatedUserId: 'auth-user-1', store: 'MYKET',
    planId: 'SAHAMBAN_PRO_30D', productMaps: {}
  });
  assert.deepEqual(result, { ok: false, error: 'PRODUCT_NOT_CONFIGURED' });
});

test('unauthenticated and unknown plan requests are rejected', async () => {
  assert.equal((await createBillingOrder(makeDb(), {
    authenticatedUserId: '', store: 'BAZAAR', planId: 'SAHAMBAN_PRO_30D', productMaps
  })).error, 'UNAUTHENTICATED');
  assert.equal((await createBillingOrder(makeDb(), {
    authenticatedUserId: 'u1', store: 'BAZAAR', planId: 'OTHER', productMaps
  })).error, 'UNKNOWN_PLAN');
});

test('entitlement is inactive when there is no access row', async () => {
  const result = await getBillingEntitlement(makeDb(), 'auth-user-1', '2027-01-01T00:00:00.000Z');
  assert.equal(result.ok, true);
  assert.equal(result.active, false);
  assert.equal(result.expiresAt, null);
});

test('entitlement status is calculated from server expiry', async () => {
  const result = await getBillingEntitlement(makeDb({
    entitlement: { expires_at: '2027-02-01T00:00:00.000Z', auto_renewing: 0 }
  }), 'auth-user-1', '2027-01-01T00:00:00.000Z');
  assert.equal(result.active, true);
  assert.equal(result.autoRenewing, false);
});

test('manual renewal extends from current valid expiry or settlement time', () => {
  assert.equal(calculateRenewedExpiry('2027-01-10T00:00:00.000Z', '2027-01-01T00:00:00.000Z', 30),
    '2027-02-09T00:00:00.000Z');
  assert.equal(calculateRenewedExpiry(null, '2027-01-01T00:00:00.000Z', 30),
    '2027-01-31T00:00:00.000Z');
});
