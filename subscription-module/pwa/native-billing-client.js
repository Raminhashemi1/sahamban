/**
 * Promise-based client for the AndroidX WebMessageListener object exposed as
 * window.SahminoNative. Load this file from the trusted PWA origin only.
 */
export function createNativeBillingClient(nativeObject = window.SahminoNative) {
  if (!nativeObject || typeof nativeObject.postMessage !== 'function') {
    throw new Error('NATIVE_BILLING_BRIDGE_UNAVAILABLE');
  }
  const pending = new Map();

  nativeObject.onmessage = (event) => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (!message || typeof message.requestId !== 'string') return;
    const waiter = pending.get(message.requestId);
    if (!waiter) return;
    pending.delete(message.requestId);
    clearTimeout(waiter.timeout);
    if (message.ok) waiter.resolve(message.result ?? {});
    else waiter.reject(new Error(message.error || 'BILLING_REQUEST_FAILED'));
  };

  function send(action, payload = {}) {
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error('BILLING_REQUEST_TIMEOUT'));
      }, 45_000);
      pending.set(requestId, { resolve, reject, timeout });
      try {
        nativeObject.postMessage(JSON.stringify({
          version: 1, requestId, action, payload
        }));
      } catch {
        clearTimeout(timeout);
        pending.delete(requestId);
        reject(new Error('BILLING_BRIDGE_SEND_FAILED'));
      }
    });
  }

  return Object.freeze({
    getAvailability: () => send('billing.getAvailability'),
    getEntitlement: () => send('billing.getEntitlement'),
    purchase: (planId) => send('billing.purchase', { planId }),
    restore: () => send('billing.restore')
  });
}

if (typeof window !== 'undefined') {
  try { window.SahminoBilling = createNativeBillingClient(); } catch { /* outside Android host */ }
}
