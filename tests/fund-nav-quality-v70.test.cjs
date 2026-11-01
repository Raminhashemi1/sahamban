'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('fund-nav-quality-v70.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
function el(v=''){return {textContent:v,children:[],style:{},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=[...x]}}}
function textOf(n){return [n.textContent||'',...(n.children||[]).map(textOf)].join(' ')}
const good={symbol:'عیار',assetClass:'fund_etf',price:110,fundNav:100,marketDate:'20261030',fundNavDate:'20261030',priceKind:'آخرین معامله'};
function run(quotes){const panel=el(),listeners={},document={getElementById:id=>id==='fundNavQualityV70'?panel:null,createElement:()=>el()};vm.runInNewContext(src,{document,window:{addEventListener:(n,f)=>(listeners[n]??=[]).push(f)},Intl,Date,Number,String,Object,Error,Math});listeners['sahamban:verified-fund-nav-premium-v63'][0]({detail:{quotes}});return textOf(panel);}
test('v70 reports date-matched prices as descriptive only',()=>{const s=run([good]);assert.match(s,/صرفاً توصیفی/);assert.match(s,/زمان به‌روزرسانی NAV/);});
test('v70 rejects mismatched dates',()=>{const s=run([{...good,fundNavDate:'20261029'}]);assert.match(s,/تاریخ NAV و بازار متفاوت است/);});
test('v70 does not turn absent NAV into a zero premium',()=>{const s=run([{...good,fundNav:null}]);assert.match(s,/NAV بازخرید معتبر موجود نیست/);assert.match(s,/به معنای حباب صفر نیست/);});
test('v70 rejects invalid calendar dates and future NAV dates',()=>{const s=run([{...good,marketDate:'20260230',fundNavDate:'20261201'}]);assert.match(s,/تاریخ بازار یا NAV نامعتبر/);});
test('v70 does not infer ETFs from a ticker name',()=>{const s=run([{...good,assetClass:'unknown'}]);assert.match(s,/هیچ صندوق ETF تأییدشده‌ای/);assert.match(s,/اثبات سهام‌بودن عیار نیست/);});
test('v70 panel and module are cached',()=>{assert.match(html,/fundNavQualityV70/);assert.match(html,/fund-nav-quality-v70\.js\?v=70\.0/);assert.match(sw,/fund-nav-quality-v70\.js\?v=70\.0/);});
