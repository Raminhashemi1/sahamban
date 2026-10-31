'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('portfolio-pilot-v57.js','utf8'),html=fs.readFileSync('portfolio-pilot-v57.html','utf8');
assert.match(html,/portfolio-pilot-v57\.js\?v=57\.0/);
assert.match(src,/تاریخ بازار .* نماد مربوط به امروز تهران نیست/);
const a=src.indexOf(' async function verifiedCode('),b=src.indexOf(' async function getOne(',a);
assert.ok(a>=0&&b>a);
async function run(hEven){
 const ctx={fetchJson:async()=>({closingPriceInfo:{pClosing:100,pDrCotVal:105,dEven:20261031,hEven}}),validDate:d=>String(d),Number};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b)+'\nthis.verify=verifiedCode;',ctx);
 return ctx.verify({symbol:'TEST',quantity:10,buy:80},'123456789012345');
}
(async()=>{
 assert.equal((await run(110305)).lastTradeTime,'11:03:05');
 assert.equal((await run('11:03:05')).lastTradeTime,'نامشخص');
 assert.equal((await run(9999999)).lastTradeTime,'نامشخص');
 assert.equal((await run(null)).lastTradeTime,'نامشخص');
 console.log('PASS v57 freshness and market clock guards');
})().catch(e=>{console.error(e);process.exitCode=1;});
