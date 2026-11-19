import { getPlan } from '../core/domain.mjs';

/**
 * Internal settlement primitive. Call ONLY after a server-side marketplace
 * adapter has cryptographically/API-verified the purchase with the store.
 * Never expose this function directly as an HTTP endpoint.
 *
 * verifiedPurchase is a normalized result from a trusted provider adapter:
 * { verified:true, store, storeOrderId, productId, amountIrr, purchaseTokenHash }
 * Raw purchase tokens/receipts must never be persisted or logged here.
 */
export async function settleVerifiedPurchase(db, {
  orderId,
  authenticatedUserId,
  verifiedPurchase,
  now = new Date().toISOString(),
  idFactory = () => crypto.randomUUID()
}) {
  if (typeof authenticatedUserId !== 'string' || !authenticatedUserId) {
    return { ok: false, error: 'UNAUTHENTICATED' };
  }
  if (!Number.isFinite(Date.parse(now))) return { ok: false, error: 'INVALID_TIMESTAMP' };
  if (!verifiedPurchase || verifiedPurchase.verified !== true) {
    return { ok: false, error: 'PURCHASE_NOT_VERIFIED' };
  }

  const { store, storeOrderId, productId, amountIrr, purchaseTokenHash } = verifiedPurchase;
  if (!['BAZAAR', 'MYKET'].includes(store) ||
      typeof storeOrderId !== 'string' || !storeOrderId ||
      typeof productId !== 'string' || !productId ||
      !Number.isSafeInteger(amountIrr) || amountIrr <= 0 ||
      typeof purchaseTokenHash !== 'string' || !/^[a-f0-9]{64}$/i.test(purchaseTokenHash)) {
    return { ok: false, error: 'INVALID_VERIFIED_PURCHASE' };
  }

  try {
    const order = await db.prepare(`
      SELECT id, user_id, store, plan_id, status, amount_irr, store_product_id
      FROM billing_orders WHERE id = ? LIMIT 1
    `).bind(orderId).first();

    if (!order || order.user_id !== authenticatedUserId) {
      return { ok: false, error: 'ORDER_NOT_FOUND' };
    }
    if (order.status !== 'CREATED') {
      return { ok: false, error: order.status === 'PAID' ? 'ORDER_ALREADY_SETTLED' : 'ORDER_NOT_PAYABLE' };
    }
    if (order.store !== store || order.store_product_id !== productId ||
        order.amount_irr !== amountIrr) {
      return { ok: false, error: 'PURCHASE_ORDER_MISMATCH' };
    }
    if (!getPlan(order.plan_id)) return { ok: false, error: 'UNKNOWN_PLAN' };

    const eventId = idFactory();
    if (typeof eventId !== 'string' || !eventId || eventId.length > 128) {
      return { ok: false, error: 'INVALID_EVENT_ID' };
    }

    // D1 batch is transactional. The partial unique event index makes the
    // settlement one-shot; if any statement fails, the batch rolls back.
    const results = await db.batch([
      db.prepare(`
        UPDATE billing_orders
        SET status = 'PAID', store_order_id = ?, purchase_token_hash = ?, paid_at = ?
        WHERE id = ? AND user_id = ? AND store = ? AND status = 'CREATED'
          AND store_product_id = ? AND amount_irr = ?
      `).bind(storeOrderId, purchaseTokenHash.toLowerCase(), now,
        orderId, authenticatedUserId, store, productId, amountIrr),

      db.prepare(`
        INSERT INTO billing_events(event_id, order_id, event_type, created_at, payload_hash)
        SELECT ?, id, 'PURCHASE_VERIFIED', ?, ?
        FROM billing_orders
        WHERE id = ? AND user_id = ? AND status = 'PAID'
          AND store_order_id = ? AND purchase_token_hash = ? AND paid_at = ?
          AND changes() = 1
      `).bind(eventId, now, purchaseTokenHash.toLowerCase(),
        orderId, authenticatedUserId, storeOrderId, purchaseTokenHash.toLowerCase(), now),

      db.prepare(`
        INSERT INTO billing_access(user_id, expires_at, auto_renewing, updated_at)
        SELECT user_id,
          strftime(
            '%Y-%m-%dT%H:%M:%fZ',
            max(julianday(COALESCE(
              (SELECT expires_at FROM billing_access WHERE user_id = billing_orders.user_id),
              ?
            )), julianday(?)) +
            CASE plan_id
              WHEN 'SAHAMBAN_PRO_30D' THEN 30
              WHEN 'SAHAMBAN_PRO_60D' THEN 60
              WHEN 'SAHAMBAN_PRO_90D' THEN 90
              WHEN 'SAHAMBAN_PRO_180D' THEN 180
              WHEN 'SAHAMBAN_PRO_365D' THEN 365
            END
          ),
          0, ?
        FROM billing_orders
        WHERE id = ? AND user_id = ? AND store = ? AND status = 'PAID'
          AND store_order_id = ? AND purchase_token_hash = ? AND paid_at = ?
          AND changes() = 1
        ON CONFLICT(user_id) DO UPDATE SET
          expires_at = excluded.expires_at,
          auto_renewing = 0,
          updated_at = excluded.updated_at
      `).bind(now, now, now, orderId, authenticatedUserId, store,
        storeOrderId, purchaseTokenHash.toLowerCase(), now)
    ]);

    if (!Array.isArray(results) || results.length !== 3 ||
        results.some((result) => result?.success !== true) ||
        results[0]?.meta?.changes !== 1 ||
        results[1]?.meta?.changes !== 1 ||
        results[2]?.meta?.changes !== 1) {
      return { ok: false, error: 'SETTLEMENT_FAILED' };
    }

    const access = await db.prepare(`
      SELECT expires_at FROM billing_access WHERE user_id = ? LIMIT 1
    `).bind(authenticatedUserId).first();

    return {
      ok: true,
      orderId,
      status: 'PAID',
      expiresAt: access?.expires_at ?? null
    };
  } catch {
    return { ok: false, error: 'SETTLEMENT_FAILED' };
  }
}
