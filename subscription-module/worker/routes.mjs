import { createBillingOrder } from '../server/order-service.mjs';
import { getBillingEntitlement } from '../server/entitlement-service.mjs';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

function json(body, status = 200, cors = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...cors } });
}

async function readJsonObject(request, maxBytes = 4096) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    return { ok: false, error: 'BODY_TOO_LARGE' };
  }
  try {
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
 * This router deliberately does not expose /verify until real provider verifiers
 * and post-settlement consume/recovery handling are installed.
 */
export function createBillingRouter({
  db,
  authenticateRequest,
  resolveStore,
  productMaps,
  allowedOrigin
}) {
  if (!db || typeof authenticateRequest !== 'function' ||
      typeof resolveStore !== 'function' || !productMaps ||
      typeof allowedOrigin !== 'string' || !/^https:\/\//.test(allowedOrigin)) {
    throw new TypeError('BILLING_ROUTER_DEPENDENCY_MISSING');
  }

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
