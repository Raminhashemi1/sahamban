'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('portfolio-daily-summary-v83.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const el=()=>({textContent:'',children:[],href:'',append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x}});
function run(){
 const panel=el(),listeners={},document={getElementById:id=>id==='portfolioDailySummaryV83'?panel:null,createElement:()=>el()};
 vm.runInNewContext(src,{document,window:{addEventListener:(name,f)=>(listeners[name]??=[]).push(f)},Intl,Number,String,Array,Map,Set,Date,Error});
 const flat=x=>[x.textContent,...x.children.map(flat)].join(' ');
 return {send:(name,detail)=>(listeners[name]||[]).forEach(f=>f({detail})),text:()=>flat(panel),panel};
}
const nav='sahamban:verified-fund-nav-premium-v63',pos='sahamban:verified-portfolio-concentration-v68',refresh='sahamban:portfolio-refresh-status-v76';
const quotes=[{symbol:'عیار',price:100,marketDate:'20261101'},{symbol:'فولاد',price:200,marketDate:'20261101'}];
const positions=[{symbol:'عیار',quantity:9,price:100,marketDate:'20261101'},{symbol:'فولاد',quantity:2,price:200,marketDate:'20261101'}];
test('v83 shows total, count, time and quick prices only after a completed verification',()=>{
 const a=run();
 a.send(refresh,{status:'started',reason:'none'});
 a.send(nav,{quotes});a.send(pos,{positions});
 assert.doesNotMatch(a.text(),/۱٬۳۰۰/);
 a.send(refresh,{status:'completed',reason:'none'});
 assert.match(a.text(),/۱٬۳۰۰/);assert.match(a.text(),/۲/);
 assert.match(a.text(),/ساعت دستگاه/);assert.match(a.text(),/فهرست سریع/);
 assert.equal(a.panel.children.some(x=>x.href==='#livePortfolioTable'),true);
});
test('v83 fails closed on mismatched and incomplete snapshots',()=>{
 const a=run();a.send(refresh,{status:'started'});a.send(nav,{quotes:[...quotes]});a.send(pos,{positions:[{...positions[0],price:101},positions[1]]});a.send(refresh,{status:'completed'});
 assert.match(a.text(),/تطبیق کامل/);assert.doesNotMatch(a.text(),/۱٬۳۰۰/);
 const b=run();b.send(refresh,{status:'started'});b.send(nav,{quotes:quotes.slice(0,1)});b.send(pos,{positions});b.send(refresh,{status:'completed'});
 assert.match(b.text(),/تطبیق کامل/);
});
test('v83 clears previous values on a new refresh and failed requests',()=>{
 const a=run();a.send(refresh,{status:'started'});a.send(nav,{quotes});a.send(pos,{positions});a.send(refresh,{status:'completed'});
 a.send(refresh,{status:'started'});assert.doesNotMatch(a.text(),/۱٬۳۰۰/);
 a.send(refresh,{status:'failed'});assert.match(a.text(),/نتیجه قبلی پاک/);
});
test('v83 does not access storage or network, and is offline bundled',()=>{
 assert.doesNotMatch(src,/localStorage|sessionStorage|fetch\(|XMLHttpRequest/);
 assert.match(html,/id="portfolioDailySummaryV83"/);assert.match(html,/portfolio-daily-summary-v83\.js\?v=83\.0/);
 assert.match(sw,/portfolio-daily-summary-v83\.js\?v=83\.0/);assert.match(sw,/sahamban-static-v83-0/);
});
