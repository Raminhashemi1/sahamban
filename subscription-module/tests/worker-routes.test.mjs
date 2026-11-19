import test from 'node:test';
import assert from 'node:assert/strict';
import { createBillingRouter } from '../worker/routes.mjs';

function makeDb() {
  const rows = [];
  return {
    rows,
    batch: async (statements) => {
      // Capture bound parameters for order insert in this route-level test.
      const orderValues = statements[0].values;
      rows.push({ orderValues });
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
    prepare: () => ({ values: [], bind(...values) { this.values = values; return this; }, first: async () => null })
  };
}
function request(path, { method = 'GET', body, origin = 'https://app.example', headers = {} } = {}) {
  return new Request('https://worker.example' + path, {
    method,
    headers: { ...(origin ? { Origin: origin } : {}), ...headers,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}
function setup(overrides = {}) {
  const db = makeDb();
  const handler = createBillingRouter({
    db,
    authenticateRequest: async () => ({ userId: 'user-1' }),
    resolveStore: async () => 'BAZAAR',
    productMaps: { BAZAAR: { SAHAMBAN_PRO_30D: 'bazaar-30d' } },
    allowedOrigin: 'https://app.example',
    ...overrides
  });
  return { db, handler };
}

test('order route creates a server-priced order for the authenticated user', async () => {
  const { db, handler } = setup();
  const response = await handler(request('/api/v2/billing/orders', {
    method: 'POST', body: { planId: 'SAHAMBAN_PRO_30D' }
  }));
  const payload = await response.json();
  assert.equal(response.status, 201);
  assert.equal(payload.order.amountIrr, 1_500_000);
  assert.equal(payload.order.productId, 'bazaar-30d');
  assert.equal(db.rows.length, 1);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://app.example');
});

test('client cannot choose store, SKU, price, or user identity', async () => {
  const { handler } = setup();
  const response = await handler(request('/api/v2/billing/orders', {
    method: 'POST',
    body: { planId: 'SAHAMBAN_PRO_30D', store: 'MYKET', productId: 'fake', amountIrr: 1, userId: 'victim' }
  }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'INVALID_ORDER_REQUEST');
});

test('unauthenticated order request is rejected', async () => {
  const { handler } = setup({ authenticateRequest: async () => null });
  const response = await handler(request('/api/v2/billing/orders', {
    method: 'POST', body: { planId: 'SAHAMBAN_PRO_30D' }
  }));
  assert.equal(response.status, 401);
});

test('unknown installation distribution is rejected', async () => {
  const { handler } = setup({ resolveStore: async () => null });
  const response = await handler(request('/api/v2/billing/orders', {
    method: 'POST', body: { planId: 'SAHAMBAN_PRO_30D' }
  }));
  assert.equal(response.status, 403);
});

test('untrusted origin is rejected', async () => {
  const { handler } = setup();
  const response = await handler(request('/api/v2/billing/orders', {
    method: 'POST', origin: 'https://evil.example',
    body: { planId: 'SAHAMBAN_PRO_30D' }
  }));
  assert.equal(response.status, 403);
});

test('verification route stays unavailable until provider verifiers and consume recovery exist', async () => {
  const { handler } = setup();
  const response = await handler(request('/api/v2/billing/verify', {
    method: 'POST', body: { orderId: 'order-1', evidence: {} }
  }));
  assert.equal(response.status, 404);
});


test('verify route loads store from persisted order and settles only verified evidence', async () => {
  const order = {
    id: 'order-verify-1', user_id: 'user-1', store: 'MYKET',
    plan_id: 'SAHAMBAN_PRO_30D', status: 'CREATED',
    amount_irr: 1_500_000, store_product_id: 'myket-30d',
    store_order_id: null, purchase_token_hash: null
  };
  const db = {
    batches: 0,
    prepare(sql) {
      return {
        values: [],
        bind(...values) { this.values = values; return this; },
        first: async () => sql.includes('FROM billing_orders') ? order : null
      };
    },
    batch: async (statements) => {
      db.batches += 1;
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    }
  };
  let verifierCalls = 0;
  const handler = createBillingRouter({
    db,
    authenticateRequest: async () => ({ userId: 'user-1' }),
    resolveStore: async () => 'BAZAAR',
    productMaps: {},
    providerVerifiers: {
      MYKET: async ({ order: suppliedOrder, evidence }) => {
        verifierCalls += 1;
        assert.equal(suppliedOrder.id, order.id);
        assert.equal(evidence.originalJson, '{"signed":true}');
        return {
          verified: true, store: 'MYKET', storeOrderId: 'myket-order-1',
          productId: 'myket-30d', amountIrr: 1_500_000,
          purchaseTokenHash: 'b'.repeat(64)
        };
      }
    },
    allowedOrigin: 'https://app.example'
  });
  const response = await handler(request('/api/v2/billing/verify', {
    method: 'POST',
    body: { orderId: order.id, originalJson: '{"signed":true}', signature: 'signature' }
  }));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.status, 'PAID');
  assert.equal(payload.consumeAfterSettlement, true);
  assert.equal(verifierCalls, 1);
  assert.equal(db.batches, 1);
});

test('verify route rejects client-selected provider and extra fields', async () => {
  const { handler } = setup();
  const response = await handler(request('/api/v2/billing/verify', {
    method: 'POST',
    body: { orderId: 'order-1', originalJson: '{}', signature: 'x', store: 'BAZAAR' }
  }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'INVALID_VERIFY_REQUEST');
});
