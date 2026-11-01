'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('portfolio-diagnostic-v74.js','utf8');
const pilot=fs.readFileSync('portfolio-pilot-v61.js','utf8');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const el=(s='')=>({textContent:s,children:[],handlers:{},append(...xs){this.children.push(...xs)},addEventListener(n,f){this.handlers[n]=f}});
function run(){const panel=el(),listeners={},copied=[],document={getElementById:id=>id==='portfolioDiagnosticV74'?panel:null,createElement:()=>el()},navigator={clipboard:{async writeText(s){copied.push(s)}}};vm.runInNewContext(src,{document,navigator,Number,String,Array,Map,Set,Error,window:{addEventListener:(e,fn)=>(listeners[e]??=[]).push(fn)}});return {emit:(e,d)=>(listeners[e]??[]).forEach(fn=>fn({detail:d})),text:()=>panel.children[1].textContent,copy:()=>panel.children[0].handlers.click(),copied};}
const q={symbol:'عیار',price:100,marketDate:'20261030',assetClass:'fund_etf',fundNavChecked:true,fundNav:95,fundNavDate:'20261030'};
const p={symbol:'عیار',price:100,quantity:12,marketDate:'20261030'};
const lifecycle='sahamban:portfolio-refresh-status-v76';
const nav='sahamban:verified-fund-nav-premium-v63',positions='sahamban:verified-portfolio-concentration-v68';
test('v76 marks start and partial failure distinctly without reusing old verification',()=>{
 const a=run();a.emit(lifecycle,{status:'started',reason:'none'});
 assert.match(a.text(),/market_refresh=in-progress/);
 a.emit(nav,{quotes:[q]});a.emit(positions,{positions:[p]});a.emit(lifecycle,{status:'completed',reason:'none'});
 assert.match(a.text(),/market_refresh=completed/);
 a.emit(lifecycle,{status:'started',reason:'none'});a.emit(lifecycle,{status:'failed',reason:'partial'});
 assert.match(a.text(),/market_refresh=failed/);assert.match(a.text(),/quote_validation=incomplete/);assert.match(a.text(),/dashboard_validation=not-run/);
});
test('v76 reports thrown errors as failures and never exports user data',async()=>{
 const a=run();a.emit(lifecycle,{status:'started',reason:'none'});a.emit(lifecycle,{status:'failed',reason:'exception'});await a.copy();
 assert.match(a.copied[0],/market_refresh=failed/);assert.doesNotMatch(a.copied[0],/عیار|20261030|100|12/);
});
test('v76 requires matching quote+NAV snapshot before complete',()=>{
 const a=run();a.emit(lifecycle,{status:'started',reason:'none'});a.emit(lifecycle,{status:'completed',reason:'none'});
 assert.match(a.text(),/market_refresh=in-progress/);
 a.emit(nav,{quotes:[q]});a.emit(positions,{positions:[p]});a.emit(lifecycle,{status:'completed',reason:'none'});
 assert.match(a.text(),/market_refresh=completed/);
});
test('v76 pilot dispatches sanitized statuses before any holdings read and on both failure paths',()=>{
 const start=pilot.indexOf("refreshStatus('started','none')"),read=pilot.indexOf('const holdings=readHoldings();',pilot.indexOf('async function refreshLiveQuotes()'));
 assert.ok(start>0&&read>start);
 assert.match(pilot,/refreshStatus\('failed','partial'\)/);
 assert.match(pilot,/refreshStatus\('failed','exception'\)/);
 assert.match(pilot,/refreshStatus\('completed','none'\)/);
 assert.match(pilot,/detail:\{status,reason\}/);
});
test('v76 bundled as a new offline release and remains privacy-safe',()=>{
 assert.ok(html.includes('portfolio-pilot-v61.js?v=61.12'));
 assert.ok(html.includes('portfolio-diagnostic-v74.js?v=74.4'));
 assert.ok(sw.includes('portfolio-pilot-v61.js?v=61.12'));
 assert.ok(sw.includes('portfolio-diagnostic-v74.js?v=74.4'));
 assert.ok(sw.includes('sahamban-static-v92-0'));
 assert.doesNotMatch(src,/\bfetch\s*\(|localStorage|sessionStorage/);
});
