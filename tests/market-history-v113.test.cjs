'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('market-connectivity-test.html','utf8');
const start=html.indexOf('function verifyPublicClosingHistory(');
const end=html.indexOf('\nfunction tehranMarketNow()',start);
assert.ok(start>=0&&end>start,'public history validator must be available');
const context={fa:value=>String(value),String,Number,Array,Set,Error};
vm.createContext(context);
vm.runInContext(html.slice(start,end),context);
const check=context.verifyPublicClosingHistory;
test('v113 confirms only a unique same-day price matching record',()=>{
 assert.equal(check('20261102',4000,[{dEven:20261102,pClosing:4000}]),true);
});
test('v113 explicitly classifies a lagging daily-history feed',()=>{
 const error=()=>check('20261104',4290,[{dEven:20261103,pClosing:4210},{dEven:20261102,pClosing:4090}]);
 assert.throws(error,/UNVERIFIED_HISTORY_NOT_PUBLISHED/);
 assert.throws(error,/آخرین تاریخ تاریخچه: 20261103/);
 assert.throws(error,/تعداد سوابق همان روز: 0/);
});
test('v113 keeps a same-date price mismatch distinct from publication lag',()=>{
 assert.throws(()=>check('20261104',4290,[{dEven:20261104,pClosing:4280}]),/UNVERIFIED_HISTORY_MISMATCH/);
});
test('v113 refuses duplicate public same-day records',()=>{
 assert.throws(()=>check('20261102',4000,[{dEven:20261102,pClosing:4000},{dEven:20261102,pClosing:4000}]),/تعداد سوابق همان روز: 2/);
});
test('v113 displays both actual public prices in rial without treating mismatch as pass',()=>{
 assert.throws(()=>check('20261102',4000,[{dEven:20261102,pClosing:4100}]),/پاسخ اصلی 4000 ریال.*تاریخچه 4100 ریال/);
});
test('v113 refuses invalid history prices and history response shapes',()=>{
 assert.throws(()=>check('20261102',4000,[{dEven:20261102,pClosing:'invalid'}]),/نامعتبر/);
 assert.throws(()=>check('20261102',4000,null),/تاریخچه معتبر نیست/);
});
test('v113 browser diagnostic displays the new explanation without changing holdings',()=>{
 assert.match(html,/verifyPublicClosingHistory\(date,price,hist\)/);
 assert.match(html,/rejectionReasons\.push\(reason\)/);
 assert.doesNotMatch(html,/localStorage|sessionStorage|sahamban-broker-holdings|sahamban-broker-live-quotes/);
});
