import plansDocument from '../PLAN_CATALOG.json' with { type: 'json' };

export const CURRENCY = 'IRR';
export const PLANS = new Map(
  plansDocument.plans.map((plan) => [plan.id, Object.freeze({ ...plan })])
);

export function getPlan(planId) {
  return PLANS.get(planId) ?? null;
}

export function addPlanDuration(currentExpiryIso, nowIso, days) {
  const now = Date.parse(nowIso);
  const current = currentExpiryIso ? Date.parse(currentExpiryIso) : Number.NaN;

  if (!Number.isFinite(now) || !Number.isInteger(days) || days <= 0) {
    throw new TypeError('INVALID_DURATION_INPUT');
  }

  const anchor = Number.isFinite(current) && current > now ? current : now;
  return new Date(anchor + days * 86_400_000).toISOString();
}
