'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTseClientThreeModeSeries } = require('../tse-client-three-mode-adapter-v161.js');

const expected = {
  insCode: '12345678901234567',
  symbol: 'غشهداب',
  startDate: '20200301',
  daysWithoutTrade: false
};

function response(mode, dates, closes, overrides = {}) {
  return {
    request: {
      adjustPrices: mode,
      symbol: expected.symbol,
      insCode: expected.insCode,
      cache: false,
      mergeSimilarSymbols: false,
      startDate: expected.startDate,
      daysWithoutTrade: expected.daysWithoutTrade,
      ...overrides
    },
    data: [{ symbol: [expected.symbol], date: dates, close: closes }]
  };
}

function input(overrides = {}) {
  return {
    ...expected,
    dailyHistory: [
      { dEven: '20200304', pClosing: 340076 },
      { dEven: '20200303', pClosing: 338000 }
    ],
    noneResult: response(0, ['20200304', '20200303'], [340076, 338000]),
    capitalPlusDividendsResult: response(1, ['20200304', '20200303'], [340076, 337000]),
    capitalOnlyResult: response(2, ['20200304', '20200303'], [340076, 339000]),
    ...overrides
  };
}

test('normalizes raw history and all three price bases without authorizing mutation', () => {
  const result = buildTseClientThreeModeSeries(input());
  assert.equal(result.status, 'NORMALIZED_FOR_REVIEW');
  assert.deepEqual(result.series.dailyHistory.map(x => x.date), ['20200303', '20200304']);
  assert.deepEqual(result.series.noneAdjusted.map(x => x.date), ['20200303', '20200304']);
  assert.deepEqual(result.series.capitalPlusDividends.map(x => x.close), [337000, 340076]);
  assert.deepEqual(result.series.capitalOnly.map(x => x.close), [339000, 340076]);
  assert.equal(result.requestContract.adjustPrices[0], 'NONE');
  assert.equal(result.requestContract.adjustPrices[1], 'CAPITAL_INCREASE_PLUS_DIVIDENDS');
  assert.equal(result.requestContract.adjustPrices[2], 'CAPITAL_INCREASE_ONLY');
  assert.equal(result.providerAuthenticated, false);
  assert.equal(result.historyMutated, false);
  assert.equal(result.capitalAdjustmentAllowed, false);
  assert.equal(result.entryEligible, false);
  assert.equal(result.tradingSignalsEnabled, false);
});

test('fails closed when any mode does not match the exact request contract', () => {
  const bad = input();
  bad.capitalOnlyResult = response(1, ['20200303', '20200304'], [339000, 340076]);
  const result = buildTseClientThreeModeSeries(bad);
  assert.equal(result.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(result.series, null);
  assert.equal(result.capitalAdjustmentAllowed, false);
});

test('rejects symbol mismatch, duplicate dates, invalid prices and mismatched arrays', () => {
  const cases = [
    (() => { const x = input(); x.noneResult = response(0, ['20200303'], [338000], { symbol: 'فولاد' }); return x; })(),
    (() => { const x = input(); x.capitalPlusDividendsResult = response(1, ['20200303', '20200303'], [338000, 339000]); return x; })(),
    (() => { const x = input(); x.capitalOnlyResult = response(2, ['20200303', '20200304'], [339000, 0]); return x; })(),
    (() => { const x = input(); x.noneResult = response(0, ['20200303', '20200304'], [338000]); return x; })()
  ];
  for (const candidate of cases) {
    const result = buildTseClientThreeModeSeries(candidate);
    assert.equal(result.status, 'INSUFFICIENT_EVIDENCE');
    assert.equal(result.series, null);
    assert.equal(result.tradingSignalsEnabled, false);
  }
});

test('rejects missing or duplicate raw daily-history rows', () => {
  for (const dailyHistory of [
    [],
    [{ dEven: '20200303', pClosing: 338000 }, { dEven: '20200303', pClosing: 339000 }],
    [{ dEven: '20200303', pClosing: -1 }]
  ]) {
    const result = buildTseClientThreeModeSeries(input({ dailyHistory }));
    assert.equal(result.status, 'INSUFFICIENT_EVIDENCE');
    assert.equal(result.historyMutated, false);
  }
});
