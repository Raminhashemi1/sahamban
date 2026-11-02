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
test('v113 explicitly identifies missing same-day history instead of generic mismatch',()=>{
 assert.throws(()=>check('20261102',4000,[{dEven:20261031,pClosing:4000}]),/تعداد سوابق همان روز: 0/);
 assert.throws(()=>check('20261102',4000,[{dEven:20261031,pClosing:4000}]),/20261031/);
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
