const encoder = new TextEncoder();

async function sha256Hex(value, cryptoImpl) {
  const digest = await cryptoImpl.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Bazaar Developer API v2 verifier for consumable in-app products.
 * Required config: packageName, clientId, clientSecret, refreshToken.
 * allowConsumed is only for idempotent re-verification of an order already PAID.
 */
export async function verifyBazaarPurchase({
  order,
  evidence,
  config,
  fetchImpl = fetch,
  cryptoImpl = globalThis.crypto,
  allowConsumed = false
}) {
  if (!order || order.store !== 'BAZAAR' ||
      !['CREATED', 'PAID'].includes(order.status)) {
    return { verified: false, reason: 'ORDER_NOT_PAYABLE' };
  }
  if (!config || !config.packageName || !config.clientId ||
      !config.clientSecret || !config.refreshToken ||
      typeof fetchImpl !== 'function' || !cryptoImpl?.subtle) {
    return { verified: false, reason: 'BAZAAR_VERIFIER_NOT_CONFIGURED' };
  }
  const purchaseToken = evidence?.purchaseToken;
  if (typeof purchaseToken !== 'string' || !purchaseToken || purchaseToken.length > 4096) {
    return { verified: false, reason: 'INVALID_PURCHASE_EVIDENCE' };
  }

  let tokenResponse;
  try {
    const form = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken
    });
    tokenResponse = await fetchImpl('https://pardakht.cafebazaar.ir/devapi/v2/auth/token/', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
  } catch {
    return { verified: false, reason: 'BAZAAR_AUTH_UNAVAILABLE' };
  }
  if (!tokenResponse?.ok) return { verified: false, reason: 'BAZAAR_AUTH_REJECTED' };

  let tokenPayload;
  try { tokenPayload = await tokenResponse.json(); } catch {
    return { verified: false, reason: 'BAZAAR_AUTH_BAD_RESPONSE' };
  }
  if (typeof tokenPayload?.access_token !== 'string' || !tokenPayload.access_token) {
    return { verified: false, reason: 'BAZAAR_AUTH_BAD_RESPONSE' };
  }

  const url = 'https://pardakht.cafebazaar.ir/devapi/v2/api/validate/' +
    encodeURIComponent(config.packageName) + '/inapp/' +
    encodeURIComponent(order.store_product_id) + '/purchases/' +
    encodeURIComponent(purchaseToken) + '/?access_token=' +
    encodeURIComponent(tokenPayload.access_token);

  let validationResponse;
  try {
    validationResponse = await fetchImpl(url, {
      method: 'GET',
      headers: { accept: 'application/json' }
    });
  } catch {
    return { verified: false, reason: 'BAZAAR_VALIDATION_UNAVAILABLE' };
  }
  if (!validationResponse?.ok) {
    return { verified: false, reason: 'BAZAAR_VALIDATION_REJECTED' };
  }

  let receipt;
  try { receipt = await validationResponse.json(); } catch {
    return { verified: false, reason: 'BAZAAR_VALIDATION_BAD_RESPONSE' };
  }

  // Bazaar Developer API v2: purchaseState 0 = purchased, 1 = refunded;
  // consumptionState 0 = consumed, 1 = not consumed.
  if (receipt?.purchaseState !== 0) {
    return { verified: false, reason: 'PURCHASE_NOT_COMPLETED' };
  }
  if (receipt?.developerPayload !== order.id) {
    return { verified: false, reason: 'ORDER_REFERENCE_MISMATCH' };
  }
  if (receipt?.consumptionState !== 1 && !(allowConsumed && receipt?.consumptionState === 0)) {
    return { verified: false, reason: 'PURCHASE_ALREADY_CONSUMED' };
  }

  const purchaseTokenHash = await sha256Hex(purchaseToken, cryptoImpl);
  return {
    verified: true,
    store: 'BAZAAR',
    storeOrderId: 'token:' + purchaseTokenHash,
    productId: order.store_product_id,
    amountIrr: order.amount_irr,
    purchaseTokenHash,
    purchaseTime: Number.isFinite(receipt.purchaseTime)
      ? new Date(receipt.purchaseTime).toISOString()
      : null,
    consumptionState: receipt.consumptionState
  };
}
