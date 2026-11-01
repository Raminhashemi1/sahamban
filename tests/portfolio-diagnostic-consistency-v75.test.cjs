'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('portfolio-diagnostic-v74.js','utf8');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
function el(text=''){return {textContent:text,children:[],handlers:{},append(...x){this.children.push(...x)},addEventListener(n,f){this.handlers[n]=f}}}
function setup(){const panel=el(),listeners={},copied=[],document={getElementById:id=>id==='portfolioDiagnosticV74'?panel:null,createElement:()=>el()},navigator={clipboard:{async writeText(s){copied.push(s)}}};vm.runInNewContext(source,{document,navigator,window:{addEventListener:(name,cb)=>(listeners[name]??=[]).push(cb)},Number,String,Array,Map,Set,Error});return {send:(type,detail)=>listeners[type][0]({detail}),report:()=>panel.children[1].textContent,copy:()=>panel.children[0].handlers.click(),copied};}
const quote={symbol:'عیار',price:100,marketDate:'20261030',assetClass:'fund_etf',fundNavChecked:true,fundNav:95,fundNavDate:'20261030'};
const position={symbol:'عیار',quantity:12,price:100,marketDate:'20261030'};
const nav='sahamban:verified-fund-nav-premium-v63',holdings='sahamban:verified-portfolio-concentration-v68';
test('v75 only marks dashboard verified after both exact snapshots',()=>{
 const a=setup();a.send(nav,{quotes:[quote]});assert.match(a.report(),/dashboard_validation=not-run/);
 a.send(holdings,{positions:[position]});assert.match(a.report(),/dashboard_validation=verified/);
});
test('v75 rejects stale dates, prices and missing positions',()=>{
 for(const q of [{...quote,marketDate:'20261029'},{...quote,price:101}]){
  const a=setup();a.send(nav,{quotes:[q]});a.send(holdings,{positions:[position]});
  assert.match(a.report(),/dashboard_validation=inconsistent/);
 }
 const b=setup();b.send(nav,{quotes:[quote]});b.send(holdings,{positions:[position,{symbol:'فولاد',quantity:1,price:90,marketDate:'20261030'}]});assert.match(b.report(),/dashboard_validation=inconsistent/);
});
test('v75 rejects repeated holdings and unsafe values',()=>{
 const a=setup();a.send(nav,{quotes:[quote]});a.send(holdings,{positions:[position,position]});assert.match(a.report(),/quote_validation=incomplete/);assert.match(a.report(),/dashboard_validation=inconsistent/);
 const b=setup();b.send(nav,{quotes:[quote]});b.send(holdings,{positions:[{...position,quantity:Number.MAX_SAFE_INTEGER}]});assert.match(b.report(),/dashboard_validation=inconsistent/);
});
test('v75 revokes previous verification on a new NAV request',()=>{
 const a=setup();a.send(nav,{quotes:[quote]});a.send(holdings,{positions:[position]});a.send(nav,{quotes:[quote]});
 assert.match(a.report(),/quote_validation=not-run/);assert.match(a.report(),/dashboard_validation=not-run/);
});
test('v75 never copies holdings identifiers or numbers',async()=>{
 const a=setup();a.send(nav,{quotes:[quote]});a.send(holdings,{positions:[position]});await a.copy();
 assert.doesNotMatch(a.copied[0],/عیار|20261030|95|100|12/);assert.match(a.copied[0],/dashboard_validation=verified/);
});
test('v75 module is versioned, cached and does not access network or storage',()=>{
 assert.ok(html.includes('portfolio-diagnostic-v74.js?v=74.4'));assert.ok(sw.includes('portfolio-diagnostic-v74.js?v=74.4'));
 assert.ok(sw.includes('sahamban-static-v83-0'));assert.doesNotMatch(source,/\bfetch\s*\(|localStorage|sessionStorage/);
});
