import { addPlanDuration } from '../core/domain.mjs';

/** Reads entitlement only from the server-side billing_access table. */
export async function getBillingEntitlement(db, authenticatedUserId, now = new Date().toISOString()) {
  if (typeof authenticatedUserId !== 'string' || !authenticatedUserId) {
    return { ok: false, error: 'UNAUTHENTICATED' };
  }
  if (!Number.isFinite(Date.parse(now))) return { ok: false, error: 'INVALID_TIMESTAMP' };

  try {
    const row = await db.prepare(`
      SELECT expires_at, auto_renewing
      FROM billing_access WHERE user_id = ? LIMIT 1
    `).bind(authenticatedUserId).first();

    const expiresAt = row?.expires_at ?? null;
    return {
      ok: true,
      active: Boolean(expiresAt && Date.parse(expiresAt) > Date.parse(now)),
      expiresAt,
      autoRenewing: row?.auto_renewing === 1,
      checkedAt: now
    };
  } catch {
    return { ok: false, error: 'ENTITLEMENT_LOOKUP_FAILED' };
  }
}

/** Pure policy helper used by settlement implementation and tests. */
export function calculateRenewedExpiry(currentExpiry, settledAt, planDays) {
  return addPlanDuration(currentExpiry ?? null, settledAt, planDays);
}
