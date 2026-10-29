'use strict';

/**
 * Sahamban v49 risk engine.
 * Pure calculations only: no browser storage, network, or order execution.
 * All prices must use one consistent currency/unit (for Sahamban, rial is preferred).
 *
 * Input holdings: { symbol, quantity, buyPrice, currentPrice, stopLossPrice? }
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SahambanRiskV49 = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const MAX_SAFE = Number.MAX_SAFE_INTEGER;

  function positiveFinite(value, label) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) throw new TypeError(label + ' must be a finite number greater than zero');
    return n;
  }

  function safeProduct(a, b, label) {
    const result = a * b;
    if (!Number.isFinite(result) || result <= 0 || result > MAX_SAFE) {
      throw new RangeError(label + ' is outside the safe calculation range');
    }
    return result;
  }

  function analyzePortfolio(holdings) {
    if (!Array.isArray(holdings) || holdings.length === 0) {
      throw new TypeError('holdings must be a non-empty array');
    }
    if (holdings.length > 1000) throw new RangeError('at most 1000 holdings are supported');

    const seen = new Set();
    const positions = holdings.map((holding, index) => {
      if (!holding || typeof holding !== 'object') throw new TypeError('holding ' + (index + 1) + ' must be an object');
      const symbol = String(holding.symbol == null ? '' : holding.symbol).trim();
      const key = symbol.replace(/[\u200c\u200e\u200f\uFEFF\s]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').toUpperCase();
      if (!key) throw new TypeError('holding ' + (index + 1) + ' has no symbol');
      if (seen.has(key)) throw new TypeError('duplicate symbol: ' + symbol);
      seen.add(key);

      const quantity = Number(holding.quantity);
      if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new TypeError('quantity for ' + symbol + ' must be a positive safe integer');
      const buyPrice = positiveFinite(holding.buyPrice, 'buyPrice for ' + symbol);
      const currentPrice = positiveFinite(holding.currentPrice, 'currentPrice for ' + symbol);
      const costValue = safeProduct(quantity, buyPrice, 'cost value for ' + symbol);
      const marketValue = safeProduct(quantity, currentPrice, 'market value for ' + symbol);
      const unrealizedPnl = marketValue - costValue;
      if (!Number.isFinite(unrealizedPnl)) throw new RangeError('P/L for ' + symbol + ' is not finite');

      let stopLossPrice = null;
      let riskToStop = null;
      if (holding.stopLossPrice !== undefined && holding.stopLossPrice !== null && holding.stopLossPrice !== '') {
        stopLossPrice = positiveFinite(holding.stopLossPrice, 'stopLossPrice for ' + symbol);
        if (stopLossPrice >= currentPrice) throw new RangeError('stopLossPrice for ' + symbol + ' must be below currentPrice for a long holding');
        riskToStop = safeProduct(quantity, currentPrice - stopLossPrice, 'risk to stop for ' + symbol);
      }
      return { symbol, quantity, buyPrice, currentPrice, costValue, marketValue, unrealizedPnl,
        weightPct: null, stopLossPrice, riskToStop, riskSharePct: null };
    });

    const marketValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
    const costValue = positions.reduce((sum, p) => sum + p.costValue, 0);
    const unrealizedPnl = marketValue - costValue;
    if (![marketValue, costValue, unrealizedPnl].every(Number.isFinite) ||
        marketValue > MAX_SAFE || costValue > MAX_SAFE) {
      throw new RangeError('portfolio totals are outside the safe calculation range');
    }

    positions.forEach(p => { p.weightPct = p.marketValue / marketValue * 100; });
    const ranked = [...positions].sort((a, b) => b.marketValue - a.marketValue);
    const maxPositionWeightPct = ranked[0].weightPct;
    const top3ConcentrationPct = ranked.slice(0, 3).reduce((sum, p) => sum + p.weightPct, 0);
    const positionsWithStops = positions.filter(p => p.riskToStop !== null);
    const stopLossRiskTotal = positionsWithStops.reduce((sum, p) => sum + p.riskToStop, 0);
    const stopLossCoveragePct = positionsWithStops.reduce((sum, p) => sum + p.marketValue, 0) / marketValue * 100;
    const allPositionsHaveStops = positionsWithStops.length === positions.length;

    if (![stopLossRiskTotal, stopLossCoveragePct, maxPositionWeightPct, top3ConcentrationPct].every(Number.isFinite) ||
        stopLossRiskTotal > MAX_SAFE) {
      throw new RangeError('risk totals are outside the safe calculation range');
    }

    if (allPositionsHaveStops && stopLossRiskTotal > 0) {
      positions.forEach(p => { p.riskSharePct = p.riskToStop / stopLossRiskTotal * 100; });
    }

    return {
      currencyUnit: 'input-unit',
      marketValue,
      costValue,
      unrealizedPnl,
      unrealizedPnlPct: costValue > 0 ? unrealizedPnl / costValue * 100 : null,
      positionCount: positions.length,
      maxPositionWeightPct,
      top3ConcentrationPct,
      stopLossRiskTotal,
      stopLossRiskPctOfPortfolio: allPositionsHaveStops ? stopLossRiskTotal / marketValue * 100 : null,
      stopLossCoveragePct,
      stopLossCoverageComplete: allPositionsHaveStops,
      positions,
      warnings: [
        'Calculations assume all prices use the same currency and unit.',
        'Stop-loss risk is a scenario estimate, not a guarantee; gaps, liquidity, slippage, fees, and taxes are excluded.',
        'Concentration metrics do not measure correlation, volatility, or total portfolio risk.'
      ]
    };
  }

  return { analyzePortfolio };
});
