import test from 'node:test';
import assert from 'node:assert/strict';
import { settleVerifiedPurchase } from '../server/settlement-service.mjs';

const verifiedPurchase = {
  verified: true,
  store: 'BAZAAR',
  storeOrderId: 'store-order-1',
  productId: 'bazaar-30d',
  amountIrr: 1_500_000,
  purchaseTokenHash: 'a'.repeat(64)
};

function makeDb({ order, batchResult } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
        first: async () => order ?? null
      };
    },
    batch: async (statements) => {
      calls.push(statements);
      return batchResult ?? statements.map(() => ({ success: true, meta: { changes: 1 } }));
    }
  };
}
const order = {
  id: 'order-1', user_id: 'user-1', store: 'BAZAAR',
  plan_id: 'SAHAMBAN_PRO_30D', status: 'CREATED',
  amount_irr: 1_500_000, store_product_id: 'bazaar-30d'
};

test('settlement rejects evidence not verified by provider adapter', async () => {
  const db = makeDb({ order });
  const result = await settleVerifiedPurchase(db, {
    orderId: 'order-1', authenticatedUserId: 'user-1',
    verifiedPurchase: { ...verifiedPurchase, verified: false }
  });
  assert.equal(result.error, 'PURCHASE_NOT_VERIFIED');
  assert.equal(db.calls.length, 0);
});

test('settlement binds the verified purchase to the authenticated order', async () => {
  const db = makeDb({ order: { ...order, user_id: 'another-user' } });
  const result = await settleVerifiedPurchase(db, {
    orderId: 'order-1', authenticatedUserId: 'user-1',
    verifiedPurchase
  });
  assert.equal(result.error, 'ORDER_NOT_FOUND');
  assert.equal(db.calls.length, 0);
});

test('settlement rejects store, product, or amount mismatch', async () => {
  const db = makeDb({ order });
  const result = await settleVerifiedPurchase(db, {
    orderId: 'order-1', authenticatedUserId: 'user-1',
    verifiedPurchase: { ...verifiedPurchase, amountIrr: 1 }
  });
  assert.equal(result.error, 'PURCHASE_ORDER_MISMATCH');
  assert.equal(db.calls.length, 0);
});

test('settlement requires a single successful conditional D1 batch', async () => {
  const db = makeDb({
    order,
    batchResult: [
      { success: true, meta: { changes: 0 } },
      { success: true, meta: { changes: 0 } },
      { success: true, meta: { changes: 0 } }
    ]
  });
  const result = await settleVerifiedPurchase(db, {
    orderId: 'order-1', authenticatedUserId: 'user-1',
    verifiedPurchase, now: '2027-01-01T00:00:00.000Z',
    idFactory: () => 'event-1'
  });
  assert.equal(result.error, 'SETTLEMENT_FAILED');
  assert.equal(db.calls.length, 1);
  assert.equal(db.calls[0].length, 3);
});

test('settlement returns paid state only when all batch statements changed one row', async () => {
  const db = makeDb({ order });
  const result = await settleVerifiedPurchase(db, {
    orderId: 'order-1', authenticatedUserId: 'user-1',
    verifiedPurchase, now: '2027-01-01T00:00:00.000Z',
    idFactory: () => 'event-1'
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, 'PAID');
  assert.equal(result.expiresAt, null);
});
