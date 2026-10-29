'use strict';
const assert = require('node:assert/strict');
const { analyzePortfolio } = require('../portfolio-risk-v49.cjs');

const result = analyzePortfolio([
  { symbol: 'AAA', quantity: 10, buyPrice: 100, currentPrice: 120, stopLossPrice: 110 },
  { symbol: 'BBB', quantity: 5, buyPrice: 200, currentPrice: 180, stopLossPrice: 150 },
  { symbol: 'CCC', quantity: 2, buyPrice: 50, currentPrice: 60, stopLossPrice: 55 }
]);
assert.equal(result.positionCount, 3);
assert.equal(result.marketValue, 2220);
assert.equal(result.costValue, 2100);
assert.equal(result.unrealizedPnl, 120);
assert.ok(Math.abs(result.unrealizedPnlPct - (120 / 2100 * 100)) < 1e-10);
assert.ok(Math.abs(result.positions[0].weightPct - (1200 / 2220 * 100)) < 1e-10);
assert.equal(result.positions[0].riskToStop, 100);
assert.equal(result.positions[1].riskToStop, 150);
assert.equal(result.positions[2].riskToStop, 10);
assert.equal(result.stopLossRiskTotal, 260);
assert.equal(result.stopLossCoverageComplete, true);
assert.ok(Math.abs(result.stopLossRiskPctOfPortfolio - (260 / 2220 * 100)) < 1e-10);
assert.ok(Math.abs(result.positions.reduce((s, p) => s + p.riskSharePct, 0) - 100) < 1e-10);

const incomplete = analyzePortfolio([
  { symbol: 'AAA', quantity: 10, buyPrice: 100, currentPrice: 120, stopLossPrice: 110 },
  { symbol: 'BBB', quantity: 5, buyPrice: 200, currentPrice: 180 }
]);
assert.equal(incomplete.stopLossCoverageComplete, false);
assert.equal(incomplete.stopLossRiskPctOfPortfolio, null);
assert.equal(incomplete.positions[1].riskToStop, null);
assert.ok(incomplete.stopLossCoveragePct < 100);

assert.throws(() => analyzePortfolio([]), /non-empty array/);
assert.throws(() => analyzePortfolio([{ symbol: 'A', quantity: 0, buyPrice: 1, currentPrice: 2 }]), /quantity/);
assert.throws(() => analyzePortfolio([
  { symbol: 'A', quantity: 1, buyPrice: 1, currentPrice: 2 },
  { symbol: ' A ', quantity: 1, buyPrice: 1, currentPrice: 2 }
]), /duplicate symbol/);
assert.throws(() => analyzePortfolio([{ symbol: 'A', quantity: 1, buyPrice: 1, currentPrice: 2, stopLossPrice: 2 }]), /below currentPrice/);
assert.throws(() => analyzePortfolio([{ symbol: 'A', quantity: 1, buyPrice: NaN, currentPrice: 2 }]), /buyPrice/);
assert.throws(() => analyzePortfolio([{ symbol: 'A', quantity: Number.MAX_SAFE_INTEGER, buyPrice: 2, currentPrice: 2 }]), /safe calculation range/);
console.log('PASS: v49 risk engine calculations, incomplete stop coverage, validation, and safe bounds');
