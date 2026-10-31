'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('portfolio-pilot-v53.js','utf8');
const begin=src.indexOf(' async function verifiedCode(');
const end=src.indexOf('\n async function getOne(',begin);
assert.ok(begin>0&&end>begin);
const code=src.slice(begin,end);
assert.doesNotMatch(src,/localStorage\.setItem\s*\(HOLDINGS_KEY/);
assert.doesNotMatch(src,/localStorage\.removeItem\s*\(HOLDINGS_KEY/);
assert.doesNotMatch(src,/localStorage\.clear\s*\(/);
const holding={symbol:'آزمایش',quantity:10,buy:100,importCurrent:100};
async function run(stamp,rows,price=100){
 const context=vm.createContext({
  fetchJson:async path=>path.includes('GetClosingPriceInfo')
   ?{closingPriceInfo:{pClosing:price,dEven:stamp}}
   :{closingPriceDaily:rows},
  validDate:date=>String(date),
  fmt:String,Date,Number,Set,Math
 });
 vm.runInContext(code+'\nthis.runQuote=verifiedCode;',context);
 return context.runQuote(holding,'123456789012345');
}
(async()=>{
 const last=[{dEven:20261028,pClosing:100}];
 assert.equal((await run(20261030,last)).marketDate,'20261028','weekend exact-match uses actual trading date');
 assert.equal((await run(20261030,[...last,...last])).marketDate,'20261028','identical duplicate history accepted');
 await assert.rejects(run(20261030,[{dEven:20261028,pClosing:101}]),/تاریخ قیمت روز/,'price mismatch fails closed');
 await assert.rejects(run(20261030,[...last,{dEven:20261028,pClosing:99}]),/تاریخ قیمت روز/,'conflicting latest prices fail closed');
 await assert.rejects(run(20261031,last),/تاریخ قیمت روز/,'Saturday requires its own trading date');
 await assert.rejects(run(20261029,last),/تاریخ قیمت روز/,'weekday stamp never falls back');
 await assert.rejects(run(20261030,[{dEven:20261020,pClosing:100}]),/تاریخ قیمت روز/,'older than seven days fails');
 assert.equal((await run(20261028,last)).marketDate,'20261028','same-date independent match preserved');
 console.log('PASS pilot v53 weekend date reconciliation and fail-closed cases');
})().catch(e=>{console.error(e);process.exitCode=1;});
