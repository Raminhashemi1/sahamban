/**
 * Internal reversal primitive. Call ONLY after a server-side provider adapter
 * has authenticated an authoritative refund/revocation event.
 *
 * No HTTP route calls this function yet: provider refund/revocation contracts
 * are not established for both stores. Client-originated refund claims must
 * never reach this service.
 */
export async function reverseVerifiedPurchase(db, {
  orderId,
  authenticatedUserId,
  verifiedReversal,
  now = new Date().toISOString(),
  idFactory = () => crypto.randomUUID()
}) {
  if (typeof authenticatedUserId !== 'string' || !authenticatedUserId) {
    return { ok: false, error: 'UNAUTHENTICATED' };
  }
  if (!Number.isFinite(Date.parse(now))) return { ok: false, error: 'INVALID_TIMESTAMP' };
  if (!verifiedReversal || verifiedReversal.verified !== true) {
    return { ok: false, error: 'REVERSAL_NOT_VERIFIED' };
  }

  const { store, storeOrderId, purchaseTokenHash, providerEventId, payloadHash } = verifiedReversal;
  if (!['BAZAAR', 'MYKET'].includes(store) ||
      typeof storeOrderId !== 'string' || !storeOrderId ||
      typeof purchaseTokenHash !== 'string' || !/^[a-f0-9]{64}$/i.test(purchaseTokenHash) ||
      typeof providerEventId !== 'string' || !providerEventId || providerEventId.length > 180 ||
      typeof payloadHash !== 'string' || !/^[a-f0-9]{64}$/i.test(payloadHash)) {
    return { ok: false, error: 'INVALID_VERIFIED_REVERSAL' };
  }

  try {
    const order = await db.prepare(`
      SELECT id, user_id, store, status, store_order_id, purchase_token_hash
      FROM billing_orders WHERE id = ? AND user_id = ? LIMIT 1
    `).bind(orderId, authenticatedUserId).first();

    if (!order) return { ok: false, error: 'ORDER_NOT_FOUND' };
    if (order.store !== store || order.store_order_id !== storeOrderId ||
        order.purchase_token_hash !== purchaseTokenHash.toLowerCase()) {
      return { ok: false, error: 'REVERSAL_ORDER_MISMATCH' };
    }

    if (order.status === 'REVERSED') {
      const prior = await db.prepare(`
        SELECT provider_event_id, payload_hash FROM billing_events
        WHERE order_id = ? AND event_type = 'PURCHASE_REVERSED' LIMIT 1
      `).bind(orderId).first();
      if (prior?.provider_event_id === store + ':' + providerEventId &&
          prior?.payload_hash === payloadHash.toLowerCase()) {
        const current = await db.prepare(`
          SELECT expires_at FROM billing_access WHERE user_id = ? LIMIT 1
        `).bind(authenticatedUserId).first();
        return { ok: true, orderId, status: 'REVERSED', alreadyReversed: true,
          expiresAt: current?.expires_at ?? null };
      }
      return { ok: false, error: 'ORDER_ALREADY_REVERSED' };
    }
    if (order.status !== 'PAID') return { ok: false, error: 'ORDER_NOT_REVERSIBLE' };

    const eventId = idFactory();
    if (typeof eventId !== 'string' || !eventId || eventId.length > 128) {
      return { ok: false, error: 'INVALID_EVENT_ID' };
    }
    const providerEventKey = store + ':' + providerEventId;

    // Reversal, immutable event, removal of the old aggregate, and deterministic
    // rebuild from remaining PAID orders are one D1 atomic batch.
    const results = await db.batch([
      db.prepare(`
        UPDATE billing_orders
        SET status = 'REVERSED'
        WHERE id = ? AND user_id = ? AND store = ? AND status = 'PAID'
          AND store_order_id = ? AND purchase_token_hash = ?
          AND EXISTS (
            SELECT 1 FROM billing_events
            WHERE order_id = billing_orders.id AND event_type = 'PURCHASE_VERIFIED'
          )
      `).bind(orderId, authenticatedUserId, store, storeOrderId, purchaseTokenHash.toLowerCase()),

      db.prepare(`
        INSERT INTO billing_events(
          event_id, order_id, event_type, created_at, payload_hash, provider_event_id
        )
        SELECT ?, id, 'PURCHASE_REVERSED', ?, ?, ?
        FROM billing_orders
        WHERE id = ? AND user_id = ? AND store = ? AND status = 'REVERSED'
          AND store_order_id = ? AND purchase_token_hash = ?
          AND changes() = 1
      `).bind(eventId, now, payloadHash.toLowerCase(), providerEventKey,
        orderId, authenticatedUserId, store, storeOrderId, purchaseTokenHash.toLowerCase()),

      db.prepare(`
        DELETE FROM billing_access
        WHERE user_id = ?
          AND EXISTS (
            SELECT 1 FROM billing_events
            WHERE event_id = ? AND order_id = ? AND event_type = 'PURCHASE_REVERSED'
          )
      `).bind(authenticatedUserId, eventId, orderId),

      db.prepare(`
        WITH RECURSIVE ordered AS (
          SELECT id, user_id, paid_at, plan_id,
            ROW_NUMBER() OVER (ORDER BY paid_at ASC, id ASC) AS rn,
            CASE plan_id
              WHEN 'SAHAMBAN_PRO_30D' THEN 30
              WHEN 'SAHAMBAN_PRO_60D' THEN 60
              WHEN 'SAHAMBAN_PRO_90D' THEN 90
              WHEN 'SAHAMBAN_PRO_180D' THEN 180
              WHEN 'SAHAMBAN_PRO_365D' THEN 365
            END AS duration_days
          FROM billing_orders
          WHERE user_id = ? AND status = 'PAID'
        ),
        timeline(user_id, rn, expires_at) AS (
          SELECT user_id, rn,
            strftime('%Y-%m-%dT%H:%M:%fZ', julianday(paid_at) + duration_days)
          FROM ordered WHERE rn = 1
          UNION ALL
          SELECT o.user_id, o.rn,
            strftime(
              '%Y-%m-%dT%H:%M:%fZ',
              max(julianday(t.expires_at), julianday(o.paid_at)) + o.duration_days
            )
          FROM timeline t
          JOIN ordered o ON o.user_id = t.user_id AND o.rn = t.rn + 1
        )
        INSERT INTO billing_access(user_id, expires_at, auto_renewing, updated_at)
        SELECT user_id, expires_at, 0, ?
        FROM timeline
        WHERE rn = (SELECT MAX(rn) FROM ordered)
          AND EXISTS (
            SELECT 1 FROM billing_events
            WHERE event_id = ? AND order_id = ? AND event_type = 'PURCHASE_REVERSED'
          )
        ON CONFLICT(user_id) DO UPDATE SET
          expires_at = excluded.expires_at,
          auto_renewing = 0,
          updated_at = excluded.updated_at
      `).bind(authenticatedUserId, now, eventId, orderId),

      db.prepare(`
        SELECT expires_at FROM billing_access WHERE user_id = ? LIMIT 1
      `).bind(authenticatedUserId)
    ]);

    if (!Array.isArray(results) || results.length !== 5 ||
        results.some((result) => result?.success !== true) ||
        results[0]?.meta?.changes !== 1 ||
        results[1]?.meta?.changes !== 1 ||
        !Array.isArray(results[4]?.results)) {
      return { ok: false, error: 'REVERSAL_FAILED' };
    }

    const expiresAt = results[4].results[0]?.expires_at ?? null;
    return { ok: true, orderId, status: 'REVERSED', expiresAt };
  } catch {
    return { ok: false, error: 'REVERSAL_FAILED' };
  }
}
