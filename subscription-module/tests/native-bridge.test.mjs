import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeBillingClient } from '../pwa/native-billing-client.js';

function fakeNative({ failAction = null, throwOnSend = false } = {}) {
  const sent = [];
  const native = {
    onmessage: null,
    postMessage(raw) {
      if (throwOnSend) throw new Error('bridge closed');
      const request = JSON.parse(raw);
      sent.push(request);
      queueMicrotask(() => {
        if (failAction === request.action) {
          native.onmessage?.({ data: JSON.stringify({
            requestId: request.requestId, ok: false, error: 'NATIVE_DENIED'
          }) });
        } else {
          native.onmessage?.({ data: JSON.stringify({
            requestId: request.requestId, ok: true,
            result: { action: request.action, payload: request.payload }
          }) });
        }
      });
    }
  };
  return { native, sent };
}

test('native client sends versioned requests for availability, entitlement, purchase and restore', async () => {
  const { native, sent } = fakeNative();
  const client = createNativeBillingClient(native);
  const [availability, entitlement, purchase, restore] = await Promise.all([
    client.getAvailability(),
    client.getEntitlement(),
    client.purchase('SAHAMBAN_PRO_30D'),
    client.restore()
  ]);

  assert.equal(sent.length, 4);
  assert.ok(sent.every((item) => item.version === 1 && typeof item.requestId === 'string'));
  assert.deepEqual(sent.map((item) => item.action).sort(), [
    'billing.getAvailability', 'billing.getEntitlement',
    'billing.purchase', 'billing.restore'
  ]);
  assert.equal(purchase.payload.planId, 'SAHAMBAN_PRO_30D');
  assert.equal(availability.action, 'billing.getAvailability');
  assert.equal(entitlement.action, 'billing.getEntitlement');
  assert.equal(restore.action, 'billing.restore');
});

test('native client rejects explicit native errors', async () => {
  const { native } = fakeNative({ failAction: 'billing.purchase' });
  const client = createNativeBillingClient(native);
  await assert.rejects(client.purchase('SAHAMBAN_PRO_30D'), /NATIVE_DENIED/);
});

test('native client ignores malformed and unrelated messages without settling requests', async () => {
  const { native } = fakeNative();
  const client = createNativeBillingClient(native);
  const pending = client.getAvailability();
  native.onmessage({ data: 'not-json' });
  native.onmessage({ data: JSON.stringify({ requestId: 'unknown', ok: true }) });
  const result = await pending;
  assert.equal(result.action, 'billing.getAvailability');
});

test('native client reports missing bridge and synchronous send failure', async () => {
  assert.throws(() => createNativeBillingClient(null), /NATIVE_BILLING_BRIDGE_UNAVAILABLE/);
  const { native } = fakeNative({ throwOnSend: true });
  const client = createNativeBillingClient(native);
  await assert.rejects(client.getAvailability(), /BILLING_BRIDGE_SEND_FAILED/);
});
