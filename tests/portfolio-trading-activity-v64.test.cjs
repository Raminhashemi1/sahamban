'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('portfolio-pilot-v61.js','utf8');
test('v64 reads only non-negative safe integer market activity fields',()=>{
 assert.match(src,/safeMarketCount\s*=\s*raw/);
 assert.match(src,/safeMarketCount\(info\.qTotCap\)/);
 assert.match(src,/safeMarketCount\(info\.qTotTran5J\)/);
 assert.match(src,/safeMarketCount\(info\.zTotTran\)/);
 assert.match(src,/Number\.isSafeInteger\(value\)&&value>=0/);
});
test('v64 reports activity as one-day context, not a liquidity score',()=>{
 assert.match(src,/این آمار یک‌روزه به‌تنهایی رتبه نقدشوندگی نیست/);
 assert.match(src,/ارزش معاملات \(ریال\)/);
 assert.match(src,/حجم معاملات/);
 assert.match(src,/تعداد معاملات/);
});
test('v64 does not fabricate missing market activity',()=>{
 assert.match(src,/tradedValue===null\|\|q\.tradedValue===undefined\?'نامشخص'/);
 assert.match(src,/tradedVolume===null\|\|q\.tradedVolume===undefined\?'نامشخص'/);
 assert.match(src,/tradeCount===null\|\|q\.tradeCount===undefined\?'نامشخص'/);
});
