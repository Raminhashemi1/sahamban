'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('portfolio-relative-turnover-v67.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
function el(v=''){return {textContent:v,children:[],style:{},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=[...x]}}}
function textOf(n){return [n.textContent||'',...(n.children||[]).map(textOf)].join(' ')}
function run(history){const panel=el(),listeners={},document={getElementById:id=>id==='portfolioRelativeTurnoverV67'?panel:null,createElement:()=>el()};vm.runInNewContext(src,{document,window:{addEventListener:(n,f)=>(listeners[n]??=[]).push(f)},Intl,Number,String,Math,Error,Object});listeners['sahamban:verified-historical-quotes-v50'][0]({detail:{quotes:[{symbol:'TEST',history}]}});return textOf(panel)}
const series=(v)=>Array.from({length:20},(_,i)=>({date:'202610'+String(i+1).padStart(2,'0'),tradedValue:v(i)}));
test('v67 normalizes latest activity to own-symbol median',()=>{const s=run(series(i=>i===19?200:100));assert.match(s,/۲۰۰٪/);assert.match(s,/بالاتر از میانه/);});
test('v67 handles even-count median and stable activity',()=>{const s=run(series(i=>100));assert.match(s,/۱۰۰٪/);assert.match(s,/نزدیک به میانه/);});
test('v67 refuses insufficient valid history',()=>{const h=series(()=>100);for(let i=0;i<6;i++)h[i].tradedValue=null;assert.match(run(h),/داده ناکافی/);});
test('v67 never treats zero or missing as valid turnover',()=>{const h=series(()=>100);h[19].tradedValue=0;assert.match(run(h),/نامشخص/);});
test('v67 is integrated and offline cached',()=>{assert.match(html,/portfolioRelativeTurnoverV67/);assert.match(html,/portfolio-relative-turnover-v67\.js\?v=67\.0/);assert.match(sw,/portfolio-relative-turnover-v67\.js\?v=67\.0/);});
