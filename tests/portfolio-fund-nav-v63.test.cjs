'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('portfolio-fund-nav-v63.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
// Use the current Tehran calendar day for valid market/NAV fixtures; retain fixed stale/future fixtures for negative tests.
const fixtureToday=()=>{
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 return parts.year+parts.month+parts.day;
};
const fixtureYesterday=()=>{
 const today=fixtureToday();
 const dt=new Date(Date.UTC(+today.slice(0,4),+today.slice(4,6)-1,+today.slice(6,8)-1));
 return dt.toISOString().slice(0,10).replace(/-/g,'');
};
function el(text=''){return {textContent:text,children:[],style:{},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=[...x]},querySelectorAll(){return []}}}
function deepText(n){return [n.textContent||'',...(n.children||[]).map(deepText)].join(' ')}
function run(quotes){
 const panel=el(),listeners={},document={getElementById:id=>id==='riskFundNavPremiumV63'?panel:null,createElement:()=>el()};
 vm.runInNewContext(src,{Date,document,window:{addEventListener:(n,f)=>(listeners[n]??=[]).push(f)},Intl,Number,String,Math,Error,Object});
 listeners['sahamban:verified-fund-nav-premium-v63'][0]({detail:{quotes}});
 return deepText(panel);
}
test('v63 computes premium from redemption NAV when dates match',()=>{
 const s=run([{symbol:'ETF1',assetClass:'fund_etf',price:110,priceKind:'آخرین معامله',marketDate:fixtureToday(),fundNav:100,fundNavDate:fixtureToday()}]);
 assert.match(s,/حباب مثبت/);assert.match(s,/۱۰٪/);assert.match(s,/قابل مقایسه با تاریخ یکسان: ۱/);
});
test('v63 computes discount when market price is below NAV',()=>{
 const s=run([{symbol:'ETF2',assetClass:'fund_etf',price:95,marketDate:fixtureToday(),fundNav:100,fundNavDate:fixtureToday()}]);
 assert.match(s,/حباب منفی/);assert.match(s,/۵٪/);
});
test('v63 excludes NAV from a different date',()=>{
 const s=run([{symbol:'ETF3',assetClass:'fund_etf',price:110,marketDate:fixtureToday(),fundNav:100,fundNavDate:fixtureYesterday()}]);
 assert.match(s,/قابل مقایسه با تاریخ یکسان: ۰/);assert.match(s,/تاریخ قیمت بازار و NAV یکسان نیست/);
});
test('v63 does not compare non-funds or missing NAV values',()=>{
 const s=run([{symbol:'STK',assetClass:'equity',price:110,marketDate:fixtureToday(),fundNav:100,fundNavDate:fixtureToday()},{symbol:'ETF4',assetClass:'fund_etf',price:110,marketDate:fixtureToday(),fundNav:null,fundNavDate:''}]);
 assert.match(s,/قابل مقایسه با تاریخ یکسان: ۰/);assert.match(s,/قیمت یا NAV معتبر/);
});
test('v79 excludes impossible, future and old NAV comparison dates',()=>{
 for(const date of ['20260230','20991231','20200101']){
  const s=run([{symbol:'عیار',assetClass:'fund_etf',price:110,marketDate:date,fundNav:100,fundNavDate:date}]);
  assert.match(s,/قابل مقایسه با تاریخ یکسان: ۰/);
  assert.match(s,/نامعتبر است|بیش از ۷ روز/);
 }
});
test('v63 is integrated and cached offline',()=>{
 assert.ok(html.includes('riskFundNavPremiumV63'));assert.ok(html.includes('portfolio-fund-nav-v63.js?v=63.1'));
 assert.ok(/const CACHE='sahamban-static-v[0-9]+-[0-9]+'/.test(sw));assert.ok(sw.includes('portfolio-fund-nav-v63.js?v=63.1'));
});
