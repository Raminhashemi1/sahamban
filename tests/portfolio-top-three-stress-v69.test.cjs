'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('portfolio-top-three-stress-v69.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
function el(value=''){return {textContent:value,children:[],style:{},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=[...x]}}}
function flatten(n){return [n.textContent||'',...(n.children||[]).map(flatten)].join(' ')}
function render(positions){const panel=el(),listeners={},document={getElementById:id=>id==='portfolioTopThreeStressV69'?panel:null,createElement:()=>el()};vm.runInNewContext(src,{document,window:{addEventListener:(n,f)=>(listeners[n]??=[]).push(f)},Intl,Number,String,Math,Set,Error,Object});listeners['sahamban:verified-portfolio-concentration-v68'][0]({detail:{positions}});return flatten(panel)}
const data=[{symbol:'عیار',quantity:7,price:100,marketDate:'20261030'},{symbol:'فولاد',quantity:2,price:100,marketDate:'20261030'},{symbol:'خودرو',quantity:1,price:50,marketDate:'20261030'},{symbol:'وبملت',quantity:1,price:50,marketDate:'20261030'}];
test('v69 calculates top-three value and simultaneous portfolio losses',()=>{
 const s=render(data);assert.match(s,/۹۵٪/);assert.match(s,/آزمون تنش هم‌زمان/);assert.match(s,/۸۱۰/);assert.match(s,/۱۹٪/);
});
test('v69 reports remaining value and supports one-holding portfolios',()=>{
 const s=render([{symbol:'عیار',quantity:10,price:100,marketDate:'20261030'}]);
 assert.match(s,/۱۰۰٪/);assert.match(s,/۸۰۰/);assert.match(s,/همه دارایی‌های موجود/);
});
test('v69 is fail-closed for duplicate symbols and unsafe values',()=>{
 assert.match(render([{symbol:'عیار',quantity:1,price:100},{symbol:'عیار',quantity:1,price:100}]),/معتبر نیست/);
 assert.match(render([{symbol:'عیار',quantity:9007199254740991,price:200}]),/امن نیست/);
});
test('v69 labels quote date mismatches explicitly',()=>{
 const s=render([{symbol:'عیار',quantity:2,price:100,marketDate:'20261030'},{symbol:'فولاد',quantity:1,price:100,marketDate:'20261029'}]);
 assert.match(s,/هشدار تاریخ/);
});
test('v69 uses the verified existing event and is offline cached',()=>{
 assert.match(src,/sahamban:verified-portfolio-concentration-v68/);assert.doesNotMatch(src,/\bfetch\s*\(/);
 assert.match(html,/portfolioTopThreeStressV69/);assert.match(html,/portfolio-top-three-stress-v69\.js\?v=69\.0/);
 assert.match(sw,/portfolio-top-three-stress-v69\.js\?v=69\.0/);
});
