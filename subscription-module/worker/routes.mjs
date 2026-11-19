import { createBillingOrder } from '../server/order-service.mjs';
import { getBillingEntitlement } from '../server/entitlement-service.mjs';
import { settleVerifiedPurchase } from '../server/settlement-service.mjs';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

function json(body, status = 200, cors = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...cors } });
}

async function readJsonObject(request, maxBytes = 4096) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return { ok: false, error: 'JSON_REQUIRED' };
  }
  if (!request.body) return { ok: false, error: 'INVALID_JSON' };

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, error: 'BODY_TOO_LARGE' };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, error: 'INVALID_JSON' };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, error: 'INVALID_BODY' };
    }
    return { ok: true, value };
  } catch {
    return { ok: false, error: 'INVALID_JSON' };
  }
}

/**
 * Creates a Cloudflare Worker request handler around independent billing services.
 *
 * Required injected dependencies:
 * - db: Cloudflare D1 binding
 * - authenticateRequest(request): Promise<{ userId: string } | null>
 * - resolveStore(request): trusted server-side distribution resolver; MUST NOT
 *   trust an arbitrary body/query/header store value
 * - productMaps: server-side SKU map, never supplied by the client
 * - allowedOrigin: exact PWA HTTPS origin
 *
 * Provider verifiers are injected from Worker secrets/configuration. The client
 * cannot choose the store; the persisted order selects the verifier.
 */
export function createBillingRouter({
  db,
  authenticateRequest,
  resolveStore,
  productMaps,
  providerVerifiers = {},
  allowedOrigin
}) {
  let parsedOrigin;\n  try { parsedOrigin = new URL(allowedOrigin); } catch { parsedOrigin = null; }\n  if (!db || typeof authenticateRequest !== 'function' ||\n      typeof resolveStore !== 'function' || !productMaps ||\n      typeof allowedOrigin !== 'string' || !parsedOrigin ||\n      parsedOrigin.protocol !== 'https:' || parsedOrigin.origin !== allowedOrigin ||\n      parsedOrigin.username || parsedOrigin.password || parsedOrigin.search || parsedOrigin.hash) {\n    throw new TypeError('BILLING_ROUTER_DEPENDENCY_MISSING');\n  }

  return async function handleBillingRequest(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const cors = origin === allowedOrigin
      ? { 'access-control-allow-origin': allowedOrigin, 'vary': 'Origin' }
      : {};

    if (origin && origin !== allowedOrigin) {
      return json({ ok: false, error: 'ORIGIN_NOT_ALLOWED' }, 403);
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'authorization, content-type',
          'access-control-max-age': '600',
          'vary': 'Origin'
        }
      });
    }

    if (url.pathname !== '/api/v2/billing/orders' &&
        url.pathname !== '/api/v2/billing/verify' &&
        url.pathname !== '/api/v1/me/entitlement') {
      return json({ ok: false, error: 'NOT_FOUND' }, 404, cors);
    }

    let principal;
    try {
      principal = await authenticateRequest(request);
    } catch {
      return json({ ok: false, error: 'AUTHENTICATION_UNAVAILABLE' }, 503, cors);
    }
    if (!principal || typeof principal.userId !== 'string' || !principal.userId) {
      return json({ ok: false, error: 'UNAUTHENTICATED' }, 401, cors);
    }

    if (request.method === 'GET' && url.pathname === '/api/v1/me/entitlement') {
      const result = await getBillingEntitlement(db, principal.userId);
      return json(result, result.ok ? 200 : 500, cors);
    }

    if (request.method === 'POST' && url.pathname === '/api/v2/billing/verify') {
      const body = await readJsonObject(request, 24_576);
      if (!body.ok) {
        const status = body.error === 'BODY_TOO_LARGE' ? 413 : body.error === 'JSON_REQUIRED' ? 415 : 400;
        return json({ ok: false, error: body.error }, status, cors);
      }
      const value = body.value;
      if (typeof value.orderId !== 'string' || !value.orderId ||
          Object.keys(value).some((key) => !['orderId', 'originalJson', 'signature', 'purchaseToken'].includes(key))) {
        return json({ ok: false, error: 'INVALID_VERIFY_REQUEST' }, 400, cors);
      }

      let order;
      try {
        order = await db.prepare(`
          SELECT id, user_id, store, plan_id, status, amount_irr,
                 store_product_id, store_order_id, purchase_token_hash
          FROM billing_orders WHERE id = ? AND user_id = ? LIMIT 1
        `).bind(value.orderId, principal.userId).first();
      } catch {
        return json({ ok: false, error: 'ORDER_LOOKUP_FAILED' }, 500, cors);
      }
      if (!order) return json({ ok: false, error: 'ORDER_NOT_FOUND' }, 404, cors);
      if (!['BAZAAR', 'MYKET'].includes(order.store)) {
        return json({ ok: false, error: 'UNSUPPORTED_STORE' }, 409, cors);
      }

      const verifier = providerVerifiers[order.store];
      if (typeof verifier !== 'function') {
        return json({ ok: false, error: 'STORE_VERIFIER_NOT_CONFIGURED' }, 503, cors);
      }
      const expectedKeys = order.store === 'MYKET'
        ? ['orderId', 'originalJson', 'signature']
        : ['orderId', 'purchaseToken'];
      if (Object.keys(value).length !== expectedKeys.length ||
          expectedKeys.some((key) => !(key in value)) ||
          (order.store === 'MYKET' &&
            (typeof value.originalJson !== 'string' || typeof value.signature !== 'string')) ||
          (order.store === 'BAZAAR' &&
            (typeof value.purchaseToken !== 'string' || !value.purchaseToken))) {
        return json({ ok: false, error: 'INVALID_VERIFY_REQUEST' }, 400, cors);
      }

      let verifiedPurchase;
      try {
        const evidence = order.store === 'MYKET'
          ? { originalJson: value.originalJson, signature: value.signature }
          : { purchaseToken: value.purchaseToken };
        verifiedPurchase = await verifier({
          order,
          evidence,
          allowConsumed: order.status === 'PAID'
        });
      } catch {
        return json({ ok: false, error: 'STORE_VERIFICATION_UNAVAILABLE' }, 503, cors);
      }
      if (!verifiedPurchase || verifiedPurchase.verified !== true) {
        return json({
          ok: false,
          error: verifiedPurchase?.reason || 'PURCHASE_NOT_VERIFIED'
        }, 422, cors);
      }

      if (order.status === 'PAID') {
        const samePurchase = order.store_order_id === verifiedPurchase.storeOrderId &&
          order.store_product_id === verifiedPurchase.productId &&
          order.purchase_token_hash === verifiedPurchase.purchaseTokenHash;
        if (!samePurchase) return json({ ok: false, error: 'ORDER_ALREADY_SETTLED' }, 409, cors);
        return json({
          ok: true,
          status: 'PAID',
          orderId: order.id,
          alreadySettled: true,
          consumeAfterSettlement: true
        }, 200, cors);
      }
      if (order.status !== 'CREATED') {
        return json({ ok: false, error: 'ORDER_NOT_PAYABLE' }, 409, cors);
      }

      const settled = await settleVerifiedPurchase(db, {
        orderId: order.id,
        authenticatedUserId: principal.userId,
        verifiedPurchase
      });
      if (!settled.ok) {
        return json({ ok: false, error: settled.error }, 409, cors);
      }
      return json({
        ...settled,
        consumeAfterSettlement: true
      }, 200, cors);
    }

    if (request.method !== 'POST' || url.pathname !== '/api/v2/billing/orders') {
      return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405, cors);
    }

    const body = await readJsonObject(request);
    if (!body.ok) {
      const status = body.error === 'BODY_TOO_LARGE' ? 413 : 400;
      return json({ ok: false, error: body.error }, status, cors);
    }
    if (Object.keys(body.value).length !== 1 ||
        typeof body.value.planId !== 'string') {
      return json({ ok: false, error: 'INVALID_ORDER_REQUEST' }, 400, cors);
    }

    let store;
    try {
      store = await resolveStore(request);
    } catch {
      return json({ ok: false, error: 'STORE_RESOLUTION_UNAVAILABLE' }, 503, cors);
    }
    if (!['BAZAAR', 'MYKET'].includes(store)) {
      return json({ ok: false, error: 'UNSUPPORTED_DISTRIBUTION' }, 403, cors);
    }

    const result = await createBillingOrder(db, {
      authenticatedUserId: principal.userId,
      store,
      planId: body.value.planId,
      productMaps
    });
    return json(result, result.ok ? 201 : 400, cors);
  };
}
