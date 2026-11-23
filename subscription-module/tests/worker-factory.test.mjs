import test from 'node:test';
import assert from 'node:assert/strict';
import { createBillingWorker } from '../worker/create-billing-worker.mjs';

function baseEnv(overrides = {}) {
  return {
    BILLING_V2_ENABLED: 'true',
    BILLING_STORE: 'BAZAAR',
    BAZAAR_SKU_MAP: JSON.stringify({
      SAHAMBAN_PRO_30D: 'bazaar-30d',
      SAHAMBAN_PRO_60D: 'bazaar-60d',
      SAHAMBAN_PRO_90D: 'bazaar-90d',
      SAHAMBAN_PRO_180D: 'bazaar-180d',
      SAHAMBAN_PRO_365D: 'bazaar-365d'
    }),
    BAZAAR_PACKAGE_NAME: 'ir.sahmino.app',
    BAZAAR_CLIENT_ID: 'test-client-id',
    BAZAAR_CLIENT_SECRET: 'test-client-secret',
    BAZAAR_REFRESH_TOKEN: 'test-refresh-token',
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

test('Worker factory fails closed when any canonical plan SKU is missing', () => {
  assert.throws(
    () => createBillingWorker(baseEnv({
      BAZAAR_SKU_MAP: JSON.stringify({ SAHAMBAN_PRO_30D: 'only-one-sku' })
    }), { authenticateRequest: async () => ({ userId: 'user-1' }) }),
    /BAZAAR_SKU_MAP_MUST_DEFINE_EXACTLY_FIVE_PLANS/
  );
});

test('Worker factory rejects duplicate store product IDs across plans', () => {
  assert.throws(
    () => createBillingWorker(baseEnv({
      BAZAAR_SKU_MAP: JSON.stringify({
        SAHAMBAN_PRO_30D: 'same',
        SAHAMBAN_PRO_60D: 'same',
        SAHAMBAN_PRO_90D: 'sku-90',
        SAHAMBAN_PRO_180D: 'sku-180',
        SAHAMBAN_PRO_365D: 'sku-365'
      })
    }), { authenticateRequest: async () => ({ userId: 'user-1' }) }),
    /BAZAAR_SKU_MAP_INVALID_PRODUCT_IDS/
  );
});

test('Worker factory requires the full Bazaar verifier configuration before enabling billing', () => {
  assert.throws(
    () => createBillingWorker(baseEnv({ BAZAAR_REFRESH_TOKEN: undefined }), {
      authenticateRequest: async () => ({ userId: 'user-1' })
    }),
    /BAZAAR_REFRESH_TOKEN_NOT_CONFIGURED/
  );
});

test('Worker factory requires an encoded Myket public key before enabling Myket billing', () => {
  assert.throws(
    () => createBillingWorker(baseEnv({
      BILLING_STORE: 'MYKET',
      MYKET_SKU_MAP: JSON.stringify({
        SAHAMBAN_PRO_30D: 'myket-30d',
        SAHAMBAN_PRO_60D: 'myket-60d',
        SAHAMBAN_PRO_90D: 'myket-90d',
        SAHAMBAN_PRO_180D: 'myket-180d',
        SAHAMBAN_PRO_365D: 'myket-365d'
      }),
      MYKET_PACKAGE_NAME: 'ir.sahmino.app',
      MYKET_PUBLIC_KEY_BASE64: 'not-base64!'
    }), { authenticateRequest: async () => ({ userId: 'user-1' }) }),
    /MYKET_PUBLIC_KEY_BASE64_INVALID/
  );
});
