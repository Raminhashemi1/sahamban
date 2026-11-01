'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('fund-nav-source-audit-v71.js','utf8');
const pilot=fs.readFileSync('portfolio-pilot-v61.js','utf8');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
function el(s=''){return {textContent:s,children:[],style:{},append(...xs){this.children.push(...xs)},replaceChildren(...xs){this.children=[...xs]}}}
function textOf(n){return [n.textContent||'',...(n.children||[]).map(textOf)].join(' ')}
function run(quotes){const panel=el(),listeners={},document={getElementById:id=>id==='fundNavSourceAuditV71'?panel:null,createElement:()=>el()};vm.runInNewContext(src,{document,window:{addEventListener:(n,f)=>(listeners[n]??=[]).push(f)},Intl,Number,String,Error,Array,Object});listeners['sahamban:verified-fund-nav-premium-v63'][0]({detail:{quotes}});return textOf(panel)}
test('v71 audit distinguishes verified NAV and missing NAV for ETF flow',()=>{
 const s=run([{symbol:'عیار',fundNavChecked:true,assetClass:'fund_etf',fundNav:100,fundNavDate:'20261030',fundNavTime:'12:30:00',fundNavStatus:'NAV بازخرید تأیید شد'},{symbol:'ETF2',fundNavChecked:true,assetClass:'unknown',fundNav:null,fundNavStatus:'سرویس NAV در دسترس نبود'}]);
 assert.match(s,/۱ از ۲/);assert.match(s,/12:30:00/);assert.match(s,/سرویس NAV در دسترس نبود/);assert.match(s,/حباب صفر محسوب نمی‌شود/);
});
test('v71 rejects fabricated fund class solely from symbol text',()=>{
 const s=run([{symbol:'عیار',assetClass:'unknown',fundNavChecked:false,fundNav:100,fundNavDate:'20261030'}]);assert.match(s,/هیچ صندوقی/);
});
test('v71 pilot accepts only strict positive numeric redemption NAV and verifies date and time',()=>{
 assert.match(pilot,/typeof fund\.pRedTran==='number'/);
 assert.match(pilot,/validDate\(fund\.deven\)/);
 assert.match(pilot,/fund\.hEven/);
 assert.match(pilot,/quote\.fundNavStatus=/);
 assert.match(pilot,/fundNavChecked:q\.fundNavChecked===true/);
 assert.doesNotMatch(pilot,/Number\(fund\.pRedTran\)/);
});
test('v80 public Iyar probes ETF by exact verified insCode without inferring from ticker name',()=>{
 assert.match(pilot,/quote\.fundNavChecked=quote\.instrumentFlow===18\|\|norm\(holding\.symbol\)===norm\('عیار'\)/);
 assert.match(pilot,/if\(quote\.fundNavChecked\)/);
 assert.match(pilot,/String\(fund\.insCode\?\?'\'\)===String\(quote\.insCode\)/);
 assert.match(pilot,/fundNavChecked:q\.fundNavChecked===true/);
 assert.doesNotMatch(pilot,/quote\.assetClass='fund_etf';quote\.assetClassLabel='صندوق قابل معامله';\s*quote\.fundNavChecked/);
});
test('v71 is read-only and offline integrated',()=>{
 assert.doesNotMatch(src,/\bfetch\s*\(|localStorage|sessionStorage/);
 assert.match(html,/fundNavSourceAuditV71/);
 assert.match(html,/fund-nav-source-audit-v71\.js\?v=71\.1/);
 assert.match(sw,/fund-nav-source-audit-v71\.js\?v=71\.1/);
});
