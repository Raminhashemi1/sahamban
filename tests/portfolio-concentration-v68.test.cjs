'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('portfolio-concentration-v68.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),pilot=fs.readFileSync('portfolio-pilot-v61.js','utf8');
function el(text=''){return {textContent:text,children:[],style:{},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=[...x]}}}
function flatten(x){return [x.textContent||'',...(x.children||[]).map(flatten)].join(' ')}
function run(positions){const panel=el(),listeners={},document={getElementById:id=>id==='portfolioConcentrationV68'?panel:null,createElement:()=>el()};vm.runInNewContext(src,{document,window:{addEventListener:(n,fn)=>(listeners[n]??=[]).push(fn)},Intl,Number,String,Math,Set,Error,Object});listeners['sahamban:verified-portfolio-concentration-v68'][0]({detail:{positions}});return flatten(panel)}
test('v68 reports asset value concentration and the largest position',()=>{
 const s=run([{symbol:'عیار',quantity:9,price:100,marketDate:'20261030',assetClass:'fund_etf'},{symbol:'فولاد',quantity:1,price:100,marketDate:'20261030',assetClass:'equity'}]);
 assert.match(s,/بزرگ‌ترین دارایی: عیار/);assert.match(s,/۹۰٪/);assert.match(s,/هشدار تمرکز/);assert.match(s,/صندوق ETF تأییدشده/);assert.match(s,/HHI/);
});
test('v68 tests portfolio-level loss from a 10 percent shock to the largest holding',()=>{
 const s=run([{symbol:'عیار',quantity:9,price:100,marketDate:'20261030'},{symbol:'فولاد',quantity:1,price:100,marketDate:'20261030'}]);
 assert.match(s,/افت کل سبد/);assert.match(s,/۹٪/);assert.match(s,/۹۰/);
});
test('v68 rejects duplicate and unsafe positions without estimates',()=>{
 assert.match(run([{symbol:'عیار',quantity:1,price:100},{symbol:'عیار',quantity:1,price:100}]),/معتبر نیست/);
 assert.match(run([{symbol:'عیار',quantity:9007199254740991,price:100}]),/محدوده مطمئن/);
});
test('v68 never assumes gold classification from the ticker symbol',()=>{
 const s=run([{symbol:'عیار',quantity:1,price:100,assetClass:'unknown'}]);
 assert.match(s,/هنوز قطعی نیست/);assert.match(s,/از نام عیار حدس زده نمی‌شود/);
});
test('v68 warns if verified quote dates are different',()=>{
 const s=run([{symbol:'عیار',quantity:2,price:100,marketDate:'20261030'},{symbol:'فولاد',quantity:1,price:100,marketDate:'20261029'}]);
 assert.match(s,/هشدار هم‌زمانی/);
});
test('v68 has verified market event, panel and offline cache',()=>{
 assert.match(pilot,/sahamban:verified-portfolio-concentration-v68/);
 assert.match(html,/portfolioConcentrationV68/);assert.match(html,/portfolio-concentration-v68\.js\?v=68\.0/);
 assert.match(sw,/portfolio-concentration-v68\.js\?v=68\.0/);
});
