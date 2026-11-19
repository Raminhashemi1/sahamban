import test from 'node:test';
import assert from 'node:assert/strict';
import { createBillingWorker } from '../worker/create-billing-worker.mjs';

function baseEnv(overrides = {}) {
  return {
    BILLING_V2_ENABLED: 'true',
    BILLING_STORE: 'BAZAAR',
    BAZAAR_SKU_MAP: JSON.stringify({
      SAHAMBAN_PRO_30D: 'bazaar-30d'
    }),
    PWA_ORIGIN: 'https://app.example',
    SAHAMBAN_DB: {
      batch: async (statements) => statements.map(() => ({ success: true, meta: { changes: 1 } })),
      prepare: () => ({ bind() { return this; }, first: async () => null })
    },
    ...overrides
  };
}

test('Worker factory uses the deployment store constant and active store product map', async () => {
  const worker = createBillingWorker(baseEnv(), {
    authenticateRequest: async () => ({ userId: 'user-1' })
  });
  const response = await worker.fetch(new Request('https://worker.example/api/v2/billing/orders', {
    method: 'POST',
    headers: {
      Origin: 'https://app.example',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ planId: 'SAHAMBAN_PRO_30D' })
  }));
  const payload = await response.json();
  assert.equal(response.status, 201);
  assert.equal(payload.order.store, 'BAZAAR');
  assert.equal(payload.order.productId, 'bazaar-30d');
});

test('Worker factory requires the host commercial authenticator', () => {
  assert.throws(
    () => createBillingWorker(baseEnv(), {}),
    /COMMERCIAL_AUTHENTICATOR_REQUIRED/
  );
});

test('Worker factory rejects a missing store deployment constant', () => {
  assert.throws(
    () => createBillingWorker(baseEnv({ BILLING_STORE: undefined }), {
      authenticateRequest: async () => ({ userId: 'user-1' })
    }),
    /BILLING_STORE_MUST_BE_SET_PER_DEPLOYMENT/
  );
});

test('Worker remains disabled unless billing feature flag is true', async () => {
  const worker = createBillingWorker(baseEnv({ BILLING_V2_ENABLED: 'false' }), {});
  const response = await worker.fetch(new Request('https://worker.example/anything'));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'BILLING_DISABLED');
});
