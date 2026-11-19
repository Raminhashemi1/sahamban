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
    prepare: () => ({ bind() { return this; }, first: async () => null })
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
