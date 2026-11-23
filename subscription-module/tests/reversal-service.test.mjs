import test from 'node:test';
import assert from 'node:assert/strict';
import { reverseVerifiedPurchase } from '../server/reversal-service.mjs';

const order = {
  id: 'order-1', user_id: 'user-1', store: 'BAZAAR', status: 'PAID',
  store_order_id: 'store-order-1', purchase_token_hash: 'a'.repeat(64)
};
const reversal = {
  verified: true, store: 'BAZAAR', storeOrderId: 'store-order-1',
  purchaseTokenHash: 'a'.repeat(64), providerEventId: 'refund-event-1',
  payloadHash: 'b'.repeat(64)
};
function makeDb({ currentOrder = order, priorEvent = null, batchResults } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        first: async () => {
          if (sql.includes('FROM billing_orders')) return currentOrder;
          if (sql.includes('provider_event_id')) return priorEvent;
          if (sql.includes('FROM billing_access')) return { expires_at: '2027-03-02T00:00:00.000Z' };
          return null;
        }
      };
    },
    batch: async (statements) => {
      calls.push(statements);
      return batchResults ?? [
        { success: true, meta: { changes: 1 } },
        { success: true, meta: { changes: 1 } },
        { success: true, meta: { changes: 1 } },
        { success: true, meta: { changes: 1 } },
        { success: true, meta: { changes: 0 }, results: [{ expires_at: '2027-03-02T00:00:00.000Z' }] }
      ];
    }
  };
}

test('reversal rejects unauthenticated or unverified provider evidence', async () => {
  const db = makeDb();
  assert.equal((await reverseVerifiedPurchase(db, {
    orderId: 'order-1', authenticatedUserId: '', verifiedReversal: reversal
  })).error, 'UNAUTHENTICATED');
  assert.equal((await reverseVerifiedPurchase(db, {
    orderId: 'order-1', authenticatedUserId: 'user-1',
    verifiedReversal: { ...reversal, verified: false }
  })).error, 'REVERSAL_NOT_VERIFIED');
  assert.equal(db.calls.length, 0);
});

test('reversal binds provider, transaction and token hash to the owned order', async () => {
  const db = makeDb();
  const result = await reverseVerifiedPurchase(db, {
    orderId: 'order-1', authenticatedUserId: 'user-1',
    verifiedReversal: { ...reversal, storeOrderId: 'other-order' }
  });
  assert.equal(result.error, 'REVERSAL_ORDER_MISMATCH');
  assert.equal(db.calls.length, 0);
});

test('reversal changes order and rebuilds entitlement in one five-statement batch', async () => {
  const db = makeDb();
  const result = await reverseVerifiedPurchase(db, {
    orderId: 'order-1', authenticatedUserId: 'user-1',
    verifiedReversal: reversal, now: '2027-02-01T00:00:00.000Z',
    idFactory: () => 'reversal-event-1'
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, 'REVERSED');
  assert.equal(result.expiresAt, '2027-03-02T00:00:00.000Z');
  assert.equal(db.calls[0].length, 5);
  assert.match(db.calls[0][3].sql, /WITH RECURSIVE ordered AS/);
  assert.match(db.calls[0][3].sql, /status = 'PAID'/);
});

test('reversal fails closed if any atomic batch statement fails', async () => {
  const db = makeDb({ batchResults: [
    { success: true, meta: { changes: 1 } },
    { success: false, meta: { changes: 0 } },
    { success: true, meta: { changes: 1 } },
    { success: true, meta: { changes: 1 } },
    { success: true, meta: { changes: 0 }, results: [] }
  ] });
  const result = await reverseVerifiedPurchase(db, {
    orderId: 'order-1', authenticatedUserId: 'user-1',
    verifiedReversal: reversal
  });
  assert.equal(result.error, 'REVERSAL_FAILED');
});

test('same authenticated provider reversal event is idempotent', async () => {
  const db = makeDb({
    currentOrder: { ...order, status: 'REVERSED' },
    priorEvent: { provider_event_id: 'BAZAAR:refund-event-1', payload_hash: 'b'.repeat(64) }
  });
  const result = await reverseVerifiedPurchase(db, {
    orderId: 'order-1', authenticatedUserId: 'user-1',
    verifiedReversal: reversal
  });
  assert.equal(result.ok, true);
  assert.equal(result.alreadyReversed, true);
  assert.equal(db.calls.length, 0);
});

test('same provider event ID with a different payload hash is rejected', async () => {
  const db = makeDb({
    currentOrder: { ...order, status: 'REVERSED' },
    priorEvent: { provider_event_id: 'BAZAAR:refund-event-1', payload_hash: 'c'.repeat(64) }
  });
  const result = await reverseVerifiedPurchase(db, {
    orderId: 'order-1', authenticatedUserId: 'user-1',
    verifiedReversal: reversal
  });
  assert.equal(result.error, 'ORDER_ALREADY_REVERSED');
  assert.equal(db.calls.length, 0);
});

test('reversal bounds order, user, and provider transaction references before database access', async () => {
  const db = makeDb();
  assert.equal((await reverseVerifiedPurchase(db, {
    orderId: 'x'.repeat(129), authenticatedUserId: 'user-1',
    verifiedReversal: reversal
  })).error, 'INVALID_ORDER_REFERENCE');
  assert.equal((await reverseVerifiedPurchase(db, {
    orderId: 'order-1', authenticatedUserId: 'x'.repeat(257),
    verifiedReversal: reversal
  })).error, 'UNAUTHENTICATED');
  assert.equal((await reverseVerifiedPurchase(db, {
    orderId: 'order-1', authenticatedUserId: 'user-1',
    verifiedReversal: { ...reversal, storeOrderId: 'x'.repeat(257) }
  })).error, 'INVALID_VERIFIED_REVERSAL');
  assert.equal(db.calls.length, 0);
});
