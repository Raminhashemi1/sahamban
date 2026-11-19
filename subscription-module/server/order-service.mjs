import { getPlan } from '../core/domain.mjs';

const STORES = new Set(['BAZAAR', 'MYKET']);

/**
 * authenticatedUserId must come from verified commercial authentication middleware.
 * productMaps is server configuration: { BAZAAR: { PLAN_ID: productId }, MYKET: {...} }.
 * The client cannot choose a product ID or price.
 */
export async function createBillingOrder(db, {
  authenticatedUserId, store, planId, productMaps,
  now = new Date().toISOString(), idFactory = () => crypto.randomUUID()
}) {
  if (typeof authenticatedUserId !== 'string' ||
      authenticatedUserId.length === 0 || authenticatedUserId.length > 256) {
    return { ok: false, error: 'UNAUTHENTICATED' };
  }
  if (!STORES.has(store)) return { ok: false, error: 'UNSUPPORTED_STORE' };

  const plan = getPlan(planId);
  if (!plan) return { ok: false, error: 'UNKNOWN_PLAN' };

  const storeProductId = productMaps?.[store]?.[planId];
  if (typeof storeProductId !== 'string' ||
      storeProductId.length === 0 || storeProductId.length > 200) {
    return { ok: false, error: 'PRODUCT_NOT_CONFIGURED' };
  }
  if (!Number.isFinite(Date.parse(now))) return { ok: false, error: 'INVALID_TIMESTAMP' };

  const orderId = idFactory();
  const eventId = idFactory();
  if (typeof orderId !== 'string' || !orderId || orderId.length > 128 ||
      typeof eventId !== 'string' || !eventId || eventId.length > 128) {
    return { ok: false, error: 'INVALID_ORDER_ID' };
  }

  try {
    const results = await db.batch([
      db.prepare(`
        INSERT INTO billing_orders
          (id, user_id, store, plan_id, status, amount_irr,
           store_product_id, created_at)
        VALUES (?, ?, ?, ?, 'CREATED', ?, ?, ?)
      `).bind(orderId, authenticatedUserId, store, planId, plan.price, storeProductId, now),
      db.prepare(`
        INSERT INTO billing_events(event_id, order_id, event_type, created_at)
        SELECT ?, id, 'ORDER_CREATED', ?
        FROM billing_orders
        WHERE id = ? AND user_id = ? AND status = 'CREATED'
      `).bind(eventId, now, orderId, authenticatedUserId)
    ]);

    if (!Array.isArray(results) || results.length !== 2 ||
        results.some((result) => result?.success !== true) ||
        results[0]?.meta?.changes !== 1 ||
        results[1]?.meta?.changes !== 1) {
      return { ok: false, error: 'ORDER_CREATE_FAILED' };
    }

    return {
      ok: true,
      order: {
        orderId, store, planId, productId: storeProductId,
        amountIrr: plan.price, currency: 'IRR', status: 'CREATED'
      }
    };
  } catch {
    return { ok: false, error: 'ORDER_CREATE_FAILED' };
  }
}
