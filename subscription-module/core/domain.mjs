export const CURRENCY = 'IRR';

const definitions = [
  {
    id: 'SAHAMBAN_PRO_30D',
    days: 30,
    price: 1500000
  },
  {
    id: 'SAHAMBAN_PRO_60D',
    days: 60,
    price: 2850000
  },
  {
    id: 'SAHAMBAN_PRO_90D',
    days: 90,
    price: 4050000
  },
  {
    id: 'SAHAMBAN_PRO_180D',
    days: 180,
    price: 7650000
  },
  {
    id: 'SAHAMBAN_PRO_365D',
    days: 365,
    price: 14600000
  }
];

export const PLANS = new Map(
  definitions.map((plan) => [plan.id, Object.freeze({ ...plan })])
);

export function listPlans() {
  return definitions.map((plan) => ({ ...plan }));
}

export function getPlan(planId) {
  return PLANS.get(planId) ?? null;
}

/**
 * Adds fixed 24-hour days to the later of current expiry or now.
 * Inputs and output are UTC ISO timestamps.
 */
export function addPlanDuration(currentExpiryIso, nowIso, days) {
  const now = Date.parse(nowIso);
  const current = currentExpiryIso ? Date.parse(currentExpiryIso) : Number.NaN;

  if (!Number.isFinite(now) || !Number.isInteger(days) || days <= 0) {
    throw new TypeError('INVALID_DURATION_INPUT');
  }
  if (currentExpiryIso !== null && currentExpiryIso !== undefined && !Number.isFinite(current)) {
    throw new TypeError('INVALID_CURRENT_EXPIRY');
  }

  const anchor = Number.isFinite(current) && current > now ? current : now;
  return new Date(anchor + days * 86_400_000).toISOString();
}
