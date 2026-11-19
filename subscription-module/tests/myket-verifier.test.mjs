import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { webcrypto } from 'node:crypto';
import { verifyMyketPurchase } from '../server/providers/myket-verifier.mjs';

const { publicKey: publicKeyObject, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});
const publicKeyBase64 = publicKeyObject.toString('base64');
const order = {
  id: 'order-123',
  store: 'MYKET',
  status: 'CREATED',
  user_id: 'user-1',
  plan_id: 'SAHAMBAN_PRO_30D',
  amount_irr: 1_500_000,
  store_product_id: 'sahmino_30d'
};
const config = { publicKeyBase64, packageName: 'ir.sahmino.app' };

function evidence(overrides = {}) {
  const purchase = {
    orderId: 'myket-order-456',
    packageName: 'ir.sahmino.app',
    productId: 'sahmino_30d',
    purchaseTime: 1795000000000,
    purchaseState: 0,
    developerPayload: 'order-123',
    purchaseToken: 'opaque-myket-purchase-token'
  };
  Object.assign(purchase, overrides);
  const originalJson = JSON.stringify(purchase);
  const signature = sign('RSA-SHA1', Buffer.from(originalJson), privateKey).toString('base64');
  return { originalJson, signature };
}

test('accepts a valid signed Myket purchase bound to this order and package', async () => {
  const result = await verifyMyketPurchase({ order, evidence: evidence(), config, cryptoImpl: webcrypto });
  assert.equal(result.verified, true);
  assert.equal(result.store, 'MYKET');
  assert.equal(result.productId, 'sahmino_30d');
  assert.equal(result.amountIrr, 1_500_000);
  assert.match(result.purchaseTokenHash, /^[a-f0-9]{64}$/);
  assert.notEqual(result.purchaseTokenHash, 'opaque-myket-purchase-token');
});

test('rejects a tampered signature', async () => {
  const receipt = evidence();
  receipt.signature = Buffer.alloc(256, 7).toString('base64');
  const result = await verifyMyketPurchase({ order, evidence: receipt, config, cryptoImpl: webcrypto });
  assert.equal(result.reason, 'INVALID_PURCHASE_SIGNATURE');
});

test('rejects wrong application package', async () => {
  const result = await verifyMyketPurchase({
    order, evidence: evidence({ packageName: 'ir.other.app' }), config, cryptoImpl: webcrypto
  });
  assert.equal(result.reason, 'PACKAGE_MISMATCH');
});

test('rejects a refunded or non-completed purchase state', async () => {
  const result = await verifyMyketPurchase({
    order, evidence: evidence({ purchaseState: 2 }), config, cryptoImpl: webcrypto
  });
  assert.equal(result.reason, 'PURCHASE_NOT_COMPLETED');
});

test('rejects wrong SKU and wrong order payload', async () => {
  const wrongSku = await verifyMyketPurchase({
    order, evidence: evidence({ productId: 'other_sku' }), config, cryptoImpl: webcrypto
  });
  assert.equal(wrongSku.reason, 'PRODUCT_MISMATCH');
  const wrongPayload = await verifyMyketPurchase({
    order, evidence: evidence({ developerPayload: 'other-order' }), config, cryptoImpl: webcrypto
  });
  assert.equal(wrongPayload.reason, 'ORDER_REFERENCE_MISMATCH');
});

test('fails closed when the verifier is not configured', async () => {
  const result = await verifyMyketPurchase({ order, evidence: evidence(), config: null, cryptoImpl: webcrypto });
  assert.equal(result.reason, 'MYKET_VERIFIER_NOT_CONFIGURED');
});
