'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('portfolio-fund-nav-v63.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
function el(text=''){return {textContent:text,children:[],style:{},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=[...x]},querySelectorAll(){return []}}}
function deepText(n){return [n.textContent||'',...(n.children||[]).map(deepText)].join(' ')}
function run(quotes){
 const panel=el(),listeners={},document={getElementById:id=>id==='riskFundNavPremiumV63'?panel:null,createElement:()=>el()};
 vm.runInNewContext(src,{Date,document,window:{addEventListener:(n,f)=>(listeners[n]??=[]).push(f)},Intl,Number,String,Math,Error,Object});
 listeners['sahamban:verified-fund-nav-premium-v63'][0]({detail:{quotes}});
 return deepText(panel);
}
test('v63 computes premium from redemption NAV when dates match',()=>{
 const s=run([{symbol:'ETF1',assetClass:'fund_etf',price:110,priceKind:'آخرین معامله',marketDate:'20261030',fundNav:100,fundNavDate:'20261030'}]);
 assert.match(s,/حباب مثبت/);assert.match(s,/۱۰٪/);assert.match(s,/قابل مقایسه با تاریخ یکسان: ۱/);
});
test('v63 computes discount when market price is below NAV',()=>{
 const s=run([{symbol:'ETF2',assetClass:'fund_etf',price:95,marketDate:'20261030',fundNav:100,fundNavDate:'20261030'}]);
 assert.match(s,/حباب منفی/);assert.match(s,/۵٪/);
});
test('v63 excludes NAV from a different date',()=>{
 const s=run([{symbol:'ETF3',assetClass:'fund_etf',price:110,marketDate:'20261030',fundNav:100,fundNavDate:'20261029'}]);
 assert.match(s,/قابل مقایسه با تاریخ یکسان: ۰/);assert.match(s,/تاریخ قیمت بازار و NAV یکسان نیست/);
});
test('v63 does not compare non-funds or missing NAV values',()=>{
 const s=run([{symbol:'STK',assetClass:'equity',price:110,marketDate:'20261030',fundNav:100,fundNavDate:'20261030'},{symbol:'ETF4',assetClass:'fund_etf',price:110,marketDate:'20261030',fundNav:null,fundNavDate:''}]);
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
 assert.ok(sw.includes('sahamban-static-v93-0'));assert.ok(sw.includes('portfolio-fund-nav-v63.js?v=63.1'));
});
