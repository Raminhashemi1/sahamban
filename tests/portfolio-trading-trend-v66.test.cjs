'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('portfolio-trading-trend-v66.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
function el(v=''){return {textContent:v,children:[],style:{},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=[...x]}}}
function textOf(n){return [n.textContent||'',...(n.children||[]).map(textOf)].join(' ')}
function run(history){const panel=el(),listeners={},document={getElementById:id=>id==='portfolioTradingTrendV66'?panel:null,createElement:()=>el()};vm.runInNewContext(src,{document,window:{addEventListener:(name,fn)=>(listeners[name]??=[]).push(fn)},Intl,Number,String,Math,Error,Object});listeners['sahamban:verified-historical-quotes-v50'][0]({detail:{quotes:[{symbol:'TEST',history}]}});return textOf(panel)}
const rows=(oldValue,newValue)=>Array.from({length:20},(_,i)=>({date:'202610'+String(i+1).padStart(2,'0'),tradedValue:i<10?oldValue:newValue}));
test('v66 compares consecutive ten-session windows',()=>{const output=run(rows(100,150));assert.match(output,/۵۰٪/);assert.match(output,/قابل مقایسه/);assert.match(output,/۱ از ۱/);});
test('v66 distinguishes a decline from an increase',()=>{const output=run(rows(100,75));assert.match(output,/۲۵٪/);assert.ok(output.includes('−'));});
test('v66 rejects fewer than twenty sessions',()=>{assert.match(run(rows(100,150).slice(-19)),/۲۰ جلسه یکتای معتبر موجود نیست/);});
test('v66 rejects missing data and never treats null as zero',()=>{const h=rows(100,150);h[0].tradedValue=null;h[1].tradedValue=null;h[2].tradedValue=null;assert.match(run(h),/پوشش داده کمتر از ۸ جلسه/);});
test('v66 rejects zero baseline and duplicated dates',()=>{assert.match(run(rows(0,150)),/میانگین دوره قبلی صفر یا نامعتبر/);const h=rows(100,150);h[1].date=h[0].date;assert.match(run(h),/۲۰ جلسه یکتای معتبر موجود نیست/);});
test('v66 exposes honest non-recommendation wording and is cached',()=>{assert.match(src,/به معنی بهبود نقدشوندگی، سیگنال خرید یا توصیه فروش نیست/);assert.match(html,/portfolioTradingTrendV66/);assert.match(html,/portfolio-trading-trend-v66\.js\?v=66\.0/);assert.match(sw,/portfolio-trading-trend-v66\.js\?v=66\.0/);});
