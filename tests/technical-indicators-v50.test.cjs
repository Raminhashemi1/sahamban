'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const api=require('../technical-indicators-v50.js');
test('v50 parses and exposes a pure indicator API',()=>{new vm.Script(fs.readFileSync('technical-indicators-v50.js','utf8'));assert.equal(typeof api.sma,'function');assert.equal(typeof api.rsi,'function');assert.equal(typeof api.macd,'function');});
test('SMA aligns outputs and uses a rolling window',()=>{assert.deepEqual(api.sma([1,2,3,4,5],3),[null,null,2,3,4]);});
test('EMA seeds with the initial simple average',()=>{assert.deepEqual(api.ema([1,2,3,4],3),[null,null,2,3]);});
test('RSI handles rising, falling and flat series',()=>{assert.equal(api.rsi([1,2,3,4,5],3)[3],100);assert.equal(api.rsi([5,4,3,2,1],3)[3],0);assert.equal(api.rsi([5,5,5,5,5],3)[3],50);});
test('MACD validates periods and aligns signal/histogram',()=>{const r=api.macd(Array.from({length:50},(_,i)=>100+i));assert.equal(r.macd.length,50);assert.equal(r.signal.length,50);assert.equal(r.histogram.length,50);assert.equal(r.macd[24],null);assert.notEqual(r.signal[33],null);assert.ok(Number.isFinite(r.histogram[33]));assert.throws(()=>api.macd([1,2,3],12,12,9),/سریع/);});
test('invalid, empty and non-positive historical prices fail closed',()=>{assert.throws(()=>api.sma([],2),/حداقل/);assert.throws(()=>api.rsi([10,0,12],2),/مثبت/);assert.throws(()=>api.ema([1,2,3],0),/دوره/);assert.throws(()=>api.sma([1,Infinity,2],2),/معتبر/);});
test('short history remains unavailable instead of fabricating indicator values',()=>{assert.deepEqual(api.sma([10,11],3),[null,null]);assert.deepEqual(api.rsi([10,11],14),[null,null]);const m=api.macd([10,11,12]);assert.ok(m.macd.every(v=>v===null));assert.ok(m.signal.every(v=>v===null));});
test('indicator engine has no network or local storage side effects',()=>{const src=fs.readFileSync('technical-indicators-v50.js','utf8');assert.doesNotMatch(src,/\bfetch\s*\(/);assert.doesNotMatch(src,/localStorage\s*\./);});

test('v50 mobile panel is wired to the verified quote flow and offline cache',()=>{const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),pilot=fs.readFileSync('portfolio-pilot-v48.js','utf8'),ui=fs.readFileSync('technical-analysis-v50.js','utf8');assert.match(html,/id="technicalAnalysisV50"/);assert.match(html,/technical-indicators-v50\.js\?v=50/);assert.match(html,/technical-analysis-v50\.js\?v=50/);assert.match(sw,/sahamban-static-v50/);assert.match(sw,/technical-indicators-v50\.js\?v=50/);assert.match(sw,/technical-analysis-v50\.js\?v=50/);assert.match(pilot,/sahamban:verified-historical-quotes-v50/);assert.match(pilot,/historyRows\.sort/);assert.match(ui,/SahambanTechnicalV50\.calculate/);assert.match(ui,/sahamban:verified-historical-quotes-v50/);assert.doesNotMatch(ui,/\bfetch\s*\(/);assert.doesNotMatch(ui,/localStorage\s*\./);});
test('historical analysis is not derived from imported file prices or demo rows',()=>{const html=fs.readFileSync('index.html','utf8'),ui=fs.readFileSync('technical-analysis-v50.js','utf8');assert.match(html,/قیمت‌های فایل کارگزاری به‌تنهایی برای این تحلیل استفاده نمی‌شوند/);assert.match(ui,/تاریخچه معتبر برای این نماد/);assert.match(ui,/منتظر دریافت موفق قیمت پایانی تأییدشده/);});
