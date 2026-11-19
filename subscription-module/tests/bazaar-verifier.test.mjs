import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { verifyBazaarPurchase } from '../server/providers/bazaar-verifier.mjs';

const order = {
  id: 'order-bazaar-1',
  store: 'BAZAAR',
  status: 'CREATED',
  amount_irr: 1_500_000,
  store_product_id: 'bazaar_sahmino_30d'
};
const config = {
  packageName: 'ir.sahmino.app',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  refreshToken: 'refresh-token'
};

function fakeFetch({ tokenOk = true, validationOk = true, receipt = {} } = {}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (String(url).includes('/auth/token/')) {
      return {
        ok: tokenOk,
        json: async () => ({ access_token: 'access-token', expires_in: 3600 })
      };
    }
    return { ok: validationOk, json: async () => receipt };
  };
  return { fetchImpl, calls };
}
const validReceipt = {
  purchaseState: 0,
  consumptionState: 1,
  developerPayload: order.id,
  purchaseTime: 1795000000000
};

test('validates Bazaar purchase through Developer API v2 and hashes token', async () => {
  const { fetchImpl, calls } = fakeFetch({ receipt: validReceipt });
  const result = await verifyBazaarPurchase({
    order, evidence: { purchaseToken: 'bazaar-token-123' }, config,
    fetchImpl, cryptoImpl: webcrypto
  });
  assert.equal(result.verified, true);
  assert.equal(result.store, 'BAZAAR');
  assert.equal(result.productId, order.store_product_id);
  assert.equal(result.amountIrr, order.amount_irr);
  assert.match(result.purchaseTokenHash, /^[a-f0-9]{64}$/);
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /devapi\/v2\/auth\/token/);
  assert.match(calls[1].url, /devapi\/v2\/api\/validate\/ir\.sahmino\.app\/inapp/);
  assert.match(calls[1].url, /access_token=access-token/);
});

test('rejects refunded purchases and wrong order payload', async () => {
  const refunded = fakeFetch({ receipt: { ...validReceipt, purchaseState: 1 } });
  const a = await verifyBazaarPurchase({
    order, evidence: { purchaseToken: 'token' }, config,
    fetchImpl: refunded.fetchImpl, cryptoImpl: webcrypto
  });
  assert.equal(a.reason, 'PURCHASE_NOT_COMPLETED');

  const wrongPayload = fakeFetch({ receipt: { ...validReceipt, developerPayload: 'other-order' } });
  const b = await verifyBazaarPurchase({
    order, evidence: { purchaseToken: 'token' }, config,
    fetchImpl: wrongPayload.fetchImpl, cryptoImpl: webcrypto
  });
  assert.equal(b.reason, 'ORDER_REFERENCE_MISMATCH');
});

test('requires unconsumed purchase for first settlement but permits consumed replay', async () => {
  const consumed = fakeFetch({ receipt: { ...validReceipt, consumptionState: 0 } });
  const first = await verifyBazaarPurchase({
    order, evidence: { purchaseToken: 'token' }, config,
    fetchImpl: consumed.fetchImpl, cryptoImpl: webcrypto
  });
  assert.equal(first.reason, 'PURCHASE_ALREADY_CONSUMED');

  const replay = await verifyBazaarPurchase({
    order: { ...order, status: 'PAID' },
    evidence: { purchaseToken: 'token' }, config, allowConsumed: true,
    fetchImpl: consumed.fetchImpl, cryptoImpl: webcrypto
  });
  assert.equal(replay.verified, true);
});

test('fails closed when Bazaar OAuth credentials or API are unavailable', async () => {
  const noConfig = await verifyBazaarPurchase({
    order, evidence: { purchaseToken: 'token' }, config: null,
    fetchImpl: async () => { throw new Error('should not call'); }, cryptoImpl: webcrypto
  });
  assert.equal(noConfig.reason, 'BAZAAR_VERIFIER_NOT_CONFIGURED');

  const authFail = fakeFetch({ tokenOk: false });
  const failed = await verifyBazaarPurchase({
    order, evidence: { purchaseToken: 'token' }, config,
    fetchImpl: authFail.fetchImpl, cryptoImpl: webcrypto
  });
  assert.equal(failed.reason, 'BAZAAR_AUTH_REJECTED');
});
