'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('portfolio-pilot-v54.js','utf8');
const html=fs.readFileSync('portfolio-pilot-v54.html','utf8');
assert.match(html,/portfolio-pilot-v54\.js\?v=54\.0/);
assert.match(src,/setInterval\(\(\)=>\{if\(!document\.hidden&&!running/);
const begin=src.indexOf(' async function verifiedCode('),end=src.indexOf(' async function getOne(',begin);
assert.ok(begin>0&&end>begin);
const code=src.slice(begin,end);
assert.doesNotMatch(code,/GetClosingPriceDailyList/);
async function quote(info){
 const ctx={fetchJson:async()=>({closingPriceInfo:info}),validDate:d=>String(d),Number};
 vm.createContext(ctx);
 vm.runInContext(code+'\nthis.verify=verifiedCode;',ctx);
 return ctx.verify({symbol:'TEST',quantity:10,buy:80},'123456789012345');
}
(async()=>{
 const live=await quote({dEven:20261031,pClosing:100,pDrCotVal:110});
 assert.equal(live.price,110);assert.equal(live.closingPrice,100);
 assert.equal(live.marketDate,'20261031');assert.equal(live.priceKind,'آخرین معامله');
 const fallback=await quote({dEven:20261031,pClosing:100,pDrCotVal:0});
 assert.equal(fallback.price,100);assert.equal(fallback.priceKind,'پایانی');
 await assert.rejects(quote({dEven:20261031,pClosing:0,pDrCotVal:110}),/پایانی/);
 console.log('PASS v54 live market quote independent of daily history');
})().catch(e=>{console.error(e);process.exitCode=1;});
