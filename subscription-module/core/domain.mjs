export const CURRENCY = 'IRR';

const definitions = [
  { id: 'sahmino_30d', days: 30, price: 1_500_000 },
  { id: 'sahmino_60d', days: 60, price: 2_850_000 },
  { id: 'sahmino_90d', days: 90, price: 4_050_000 },
  { id: 'sahmino_180d', days: 180, price: 7_650_000 },
  { id: 'sahmino_365d', days: 365, price: 14_600_000 }
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
 * Adds a fixed number of 24-hour days to the later of current expiry or now.
 * Inputs and output are UTC ISO timestamps. Calendar-month plans are not implied.
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
