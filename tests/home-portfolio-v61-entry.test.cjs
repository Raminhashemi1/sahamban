'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const pilot=fs.readFileSync('portfolio-pilot-v61.html','utf8');
const src=fs.readFileSync('portfolio-pilot-v61.js','utf8');
assert.match(html,/id="portfolio-live-entry"/);
assert.match(html,/href="#livePortfolioSection"/);
assert.match(html,/portfolio-pilot-v61\.js\?v=61\.7/);
assert.match(html,/قیمت دریافتی لزوماً لحظه‌ای نیست/);
assert.match(pilot,/portfolio-pilot-v61\.js\?v=61\.2/);
assert.match(pilot,/دریافت و بررسی تاریخچه همه نمادهای سبد/);
assert.doesNotMatch(pilot,/۱۹ نماد|19 نماد|19 symbols/);
console.log('PASS homepage latest pilot entry and variable basket label');

assert.ok(html.includes('portfolio-asset-allocation-v62.js?v=62.0'));

assert.ok(html.includes('portfolio-fund-nav-v63.js?v=63.0'));
assert.ok(html.includes('riskFundNavPremiumV63'));

assert.ok(src.includes('qTotCap'));
assert.ok(src.includes('qTotTran5J'));

assert.ok(html.includes('portfolioLiquidityHistoryV65'));
assert.ok(html.includes('portfolio-liquidity-history-v65.js?v=65.0'));

assert.ok(html.includes('portfolioTradingTrendV66'));
assert.ok(html.includes('portfolio-trading-trend-v66.js?v=66.0'));

assert.ok(html.includes('portfolioRelativeTurnoverV67'));
assert.ok(html.includes('portfolio-relative-turnover-v67.js?v=67.0'));

assert.ok(html.includes('portfolioConcentrationV68'));
assert.ok(html.includes('portfolio-concentration-v68.js?v=68.0'));
assert.ok(src.includes('verified-portfolio-concentration-v68'));

assert.ok(html.includes('portfolioTopThreeStressV69'));
assert.ok(html.includes('portfolio-top-three-stress-v69.js?v=69.0'));

assert.ok(html.includes('fundNavQualityV70'));
assert.ok(html.includes('fund-nav-quality-v70.js?v=70.0'));

assert.ok(html.includes('fundNavSourceAuditV71'));
assert.ok(html.includes('fund-nav-source-audit-v71.js?v=71.0'));
