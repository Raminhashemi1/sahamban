import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CURRENCY, listPlans, getPlan, addPlanDuration } from '../core/domain.mjs';

const expected = [
  ['SAHAMBAN_PRO_30D', 30, 1_500_000],
  ['SAHAMBAN_PRO_60D', 60, 2_850_000],
  ['SAHAMBAN_PRO_90D', 90, 4_050_000],
  ['SAHAMBAN_PRO_180D', 180, 7_650_000],
  ['SAHAMBAN_PRO_365D', 365, 14_600_000]
];

test('catalog uses the exact dossier plan IDs and approved IRR amounts', () => {
  assert.equal(CURRENCY, 'IRR');
  assert.deepEqual(listPlans().map(({ id, days, price }) => [id, days, price]), expected);
});

test('JSON catalog mirrors executable domain catalog', async () => {
  const json = JSON.parse(await readFile(new URL('../PLAN_CATALOG.json', import.meta.url), 'utf8'));
  assert.equal(json.currency, 'IRR');
  assert.deepEqual(json.plans.map(({ id, days, price }) => [id, days, price]), expected);
});

test('unknown plan is rejected', () => assert.equal(getPlan('unknown'), null));
test('early renewal extends from existing future expiry', () => {
  assert.equal(addPlanDuration('2027-01-10T00:00:00.000Z', '2027-01-01T00:00:00.000Z', 30),
    '2027-02-09T00:00:00.000Z');
});
test('expired or absent subscription starts from current time', () => {
  assert.equal(addPlanDuration('2026-12-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z', 30),
    '2027-01-31T00:00:00.000Z');
  assert.equal(addPlanDuration(null, '2027-01-01T00:00:00.000Z', 30),
    '2027-01-31T00:00:00.000Z');
});
test('invalid duration and invalid current expiry fail closed', () => {
  assert.throws(() => addPlanDuration(null, 'not-a-date', 30), /INVALID_DURATION_INPUT/);
  assert.throws(() => addPlanDuration(null, '2027-01-01T00:00:00.000Z', 0), /INVALID_DURATION_INPUT/);
  assert.throws(() => addPlanDuration('not-a-date', '2027-01-01T00:00:00.000Z', 30), /INVALID_CURRENT_EXPIRY/);
});
