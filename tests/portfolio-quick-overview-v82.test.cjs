'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('portfolio-quick-overview-v82.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const el=()=>({textContent:'',children:[],append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x}});
function start(){
 const panel=el(),listeners={},document={getElementById:id=>id==='portfolioQuickOverviewV82'?panel:null,createElement:()=>el()};
 vm.runInNewContext(src,{document,window:{addEventListener:(key,fn)=>(listeners[key]??=[]).push(fn)},Date,Intl,Number,String,Array,Object,Math,Map,Set,Error});
 return {send:(key,detail)=>(listeners[key]||[]).forEach(f=>f({detail})),text:()=>JSON.stringify(panel.children.map(function walk(x){return [x.textContent,...x.children.map(walk)]}))};
}
function today(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));return [p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('');}
const quotes=(d=today())=>[{symbol:'عیار',assetClass:'fund_etf',fundNavProbeStatus:'nav-verified',price:110,fundNav:100,marketDate:d,fundNavDate:d},{symbol:'فولاد',assetClass:'equity',price:100,marketDate:d}];
const positions=(d=today())=>[{symbol:'عیار',quantity:9,price:110,marketDate:d},{symbol:'فولاد',quantity:1,price:100,marketDate:d}];
const nav='sahamban:verified-fund-nav-premium-v63',pos='sahamban:verified-portfolio-concentration-v68',refresh='sahamban:portfolio-refresh-status-v76';
test('v82 shows NAV and concentration only after matching complete snapshots',()=>{
 const a=start();a.send(nav,{quotes:quotes()});assert.doesNotMatch(a.text(),/حباب مثبت/);
 a.send(pos,{positions:positions()});assert.match(a.text(),/NAV بازخرید/);assert.match(a.text(),/حباب مثبت/);assert.match(a.text(),/هشدار تمرکز/);assert.match(a.text(),/۳۰٪/);
});
test('v82 drops all values immediately on refresh failure or new refresh',()=>{
 const a=start();a.send(nav,{quotes:quotes()});a.send(pos,{positions:positions()});
 a.send(refresh,{status:'started'});assert.doesNotMatch(a.text(),/NAV بازخرید/);
 a.send(nav,{quotes:quotes()});a.send(pos,{positions:positions()});a.send(refresh,{status:'failed'});
 assert.match(a.text(),/خلاصه قبلی/);assert.doesNotMatch(a.text(),/حباب مثبت/);
});
test('v82 refuses stale, mismatched or nonexistent NAV and portfolio values',()=>{
 const a=start();a.send(nav,{quotes:quotes()});a.send(pos,{positions:positions().map((p,i)=>i?{...p,price:111}:p)});
 assert.match(a.text(),/هیچ عدد تخمینی/);
 const b=start();b.send(nav,{quotes:quotes().map((q,i)=>i? q:{...q,fundNavProbeStatus:'request-failed'})});b.send(pos,{positions:positions()});
 assert.match(b.text(),/حباب نمایش داده نمی‌شود/);
 const c=start();c.send(nav,{quotes:quotes('20200101')});c.send(pos,{positions:positions('20200101')});assert.match(c.text(),/حباب نمایش داده نمی‌شود/);
});
test('v82 uses no network, storage or trade automation and is cached',()=>{
 assert.doesNotMatch(src,/localStorage|sessionStorage|navigator\.clipboard|fetch\(/);
 assert.match(html,/id="portfolioQuickOverviewV82"/);assert.match(html,/portfolio-quick-overview-v82\.js\?v=82\.0/);
 assert.match(sw,/portfolio-quick-overview-v82\.js\?v=82\.0/);assert.match(sw,/sahamban-static-v89-0/);
});
