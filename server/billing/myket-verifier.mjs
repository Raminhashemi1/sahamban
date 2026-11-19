const encoder = new TextEncoder();

function decodeBase64(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new TypeError('INVALID_BASE64');
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function normalizePurchaseJson(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const productId = value.productId ?? value.sku;
  const purchaseToken = value.purchaseToken ?? value.token;
  const orderId = value.orderId;
  const packageName = value.packageName;
  const purchaseState = value.purchaseState;
  const developerPayload = value.developerPayload ?? '';
  const purchaseTime = value.purchaseTime;

  if (typeof productId !== 'string' || !productId ||
      typeof purchaseToken !== 'string' || !purchaseToken ||
      typeof orderId !== 'string' || !orderId ||
      typeof packageName !== 'string' || !packageName ||
      !Number.isInteger(purchaseState) ||
      !Number.isSafeInteger(purchaseTime) || purchaseTime <= 0 ||
      typeof developerPayload !== 'string') return null;

  return { productId, purchaseToken, orderId, packageName, purchaseState, developerPayload, purchaseTime };
}

/**
 * Verifies Myket's IAB purchase signature server-side.
 *
 * Config:
 *   publicKeyBase64: X.509 SubjectPublicKeyInfo RSA public key, Base64
 *   packageName: exact production Android applicationId
 *
 * The signed originalJson is verified with RSASSA-PKCS1-v1_5 / SHA-1, matching
 * the Myket IAB v3 signature format. No Myket secret is needed for this
 * cryptographic check. This is signature validation, not a live Developer API
 * lookup; use official Developer API reconciliation for refund/ownership state
 * if/when Myket documents and enables that API contract for the app.
 */
export async function verifyMyketPurchase({
  order,
  evidence,
  config,
  cryptoImpl = globalThis.crypto
}) {
  if (!order || order.store !== 'MYKET' || !['CREATED', 'PAID'].includes(order.status)) {
    return { verified: false, reason: 'ORDER_NOT_PAYABLE' };
  }
  if (!config || typeof config.publicKeyBase64 !== 'string' ||
      typeof config.packageName !== 'string' || !config.packageName ||
      !cryptoImpl?.subtle || typeof atob !== 'function') {
    return { verified: false, reason: 'MYKET_VERIFIER_NOT_CONFIGURED' };
  }
  if (!evidence || typeof evidence.originalJson !== 'string' ||
      evidence.originalJson.length > 16_384 ||
      typeof evidence.signature !== 'string' || evidence.signature.length > 4096) {
    return { verified: false, reason: 'INVALID_PURCHASE_EVIDENCE' };
  }

  let purchase;
  let signature;
  let publicKey;
  try {
    purchase = normalizePurchaseJson(JSON.parse(evidence.originalJson));
    if (!purchase) return { verified: false, reason: 'INVALID_PURCHASE_DATA' };
    signature = decodeBase64(evidence.signature);
    const keyBytes = decodeBase64(config.publicKeyBase64);
    publicKey = await cryptoImpl.subtle.importKey(
      'spki',
      keyBytes,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-1' },
      false,
      ['verify']
    );
  } catch {
    return { verified: false, reason: 'INVALID_PURCHASE_SIGNATURE_FORMAT' };
  }

  let signatureValid = false;
  try {
    signatureValid = await cryptoImpl.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signature,
      encoder.encode(evidence.originalJson)
    );
  } catch {
    return { verified: false, reason: 'SIGNATURE_VERIFICATION_ERROR' };
  }
  if (!signatureValid) return { verified: false, reason: 'INVALID_PURCHASE_SIGNATURE' };

  if (purchase.packageName !== config.packageName) {
    return { verified: false, reason: 'PACKAGE_MISMATCH' };
  }
  if (purchase.purchaseState !== 0) {
    return { verified: false, reason: 'PURCHASE_NOT_COMPLETED' };
  }
  if (purchase.productId !== order.store_product_id) {
    return { verified: false, reason: 'PRODUCT_MISMATCH' };
  }
  if (purchase.developerPayload !== order.id) {
    return { verified: false, reason: 'ORDER_REFERENCE_MISMATCH' };
  }

  const tokenDigest = await cryptoImpl.subtle.digest('SHA-256', encoder.encode(purchase.purchaseToken));
  const purchaseTokenHash = Array.from(new Uint8Array(tokenDigest),
    (byte) => byte.toString(16).padStart(2, '0')).join('');

  return {
    verified: true,
    store: 'MYKET',
    storeOrderId: purchase.orderId,
    productId: purchase.productId,
    amountIrr: order.amount_irr,
    purchaseTokenHash,
    purchaseTime: new Date(purchase.purchaseTime).toISOString()
  };
}
