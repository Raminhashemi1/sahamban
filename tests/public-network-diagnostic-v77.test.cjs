'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const diagnostic=fs.readFileSync('portfolio-diagnostic-v74.js','utf8'),pilot=fs.readFileSync('portfolio-pilot-v61.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
function node(text=''){return {textContent:text,children:[],handlers:{},append(...xs){this.children.push(...xs)},addEventListener(name,fn){this.handlers[name]=fn}}}
function setup(){const panel=node(),events={},copied=[],document={getElementById:id=>id==='portfolioDiagnosticV74'?panel:null,createElement:()=>node()},navigator={clipboard:{async writeText(text){copied.push(text)}}};vm.runInNewContext(diagnostic,{document,navigator,Number,String,Array,Map,Set,Error,window:{addEventListener:(name,fn)=>(events[name]??=[]).push(fn)}});return {send:(name,detail)=>(events[name]??[]).forEach(fn=>fn({detail})),get:()=>panel.children[1].textContent,copy:()=>panel.children[0].handlers.click(),copied};}
const probe='sahamban:public-network-probe-v77',refresh='sahamban:portfolio-refresh-status-v76';
test('v77 begins with not-run probe, then verified only after started',()=>{
 const a=setup();assert.match(a.get(),/public_network_probe=not-run/);
 a.send(probe,{status:'verified'});assert.match(a.get(),/public_network_probe=not-run/);
 a.send(probe,{status:'started'});assert.match(a.get(),/public_network_probe=in-progress/);
 a.send(probe,{status:'verified'});assert.match(a.get(),/public_network_probe=verified/);
 assert.match(a.get(),/market_refresh=not-run/);
});
test('v77 distinguishes public network failure from portfolio refresh failure',()=>{
 const a=setup();a.send(probe,{status:'started'});a.send(probe,{status:'failed'});
 assert.match(a.get(),/public_network_probe=failed/);assert.match(a.get(),/market_refresh=not-run/);
 a.send(refresh,{status:'started',reason:'none'});a.send(refresh,{status:'failed',reason:'partial'});
 assert.match(a.get(),/market_refresh=failed/);assert.match(a.get(),/public_network_probe=failed/);
});
test('v77 resets probe when a new public connectivity attempt starts',()=>{
 const a=setup();a.send(probe,{status:'started'});a.send(probe,{status:'verified'});a.send(probe,{status:'started'});
 assert.match(a.get(),/public_network_probe=in-progress/);
});
test('v77 copies only predefined categorical statuses, never real holdings',async()=>{
 const a=setup();a.send(probe,{status:'started'});a.send(probe,{status:'verified'});await a.copy();
 const text=a.copied[0];assert.match(text,/public_network_probe=verified/);assert.match(text,/not-proof-of-portfolio-refresh-or-etf-nav/);
 assert.doesNotMatch(text,/فولاد|عیار|20261030|123456789|quantity=|price=/);
});
test('v77 pilot emits only sanitized probe statuses and uses public synthetic ticker',()=>{
 const i=pilot.indexOf("$('livePortfolioNetworkTest').addEventListener('click'"),j=pilot.indexOf("$('livePortfolioImported').addEventListener",i),part=pilot.slice(i,j);
 assert.ok(i>0&&j>i);
 assert.match(part,/getOne\(\{symbol:'فولاد'/);
 assert.match(part,/sahamban:public-network-probe-v77/);
 assert.match(part,/detail:\{status\}/);
 assert.match(part,/probeStatus\('started'\)/);
 assert.match(part,/probeStatus\('verified'\)/);
 assert.match(part,/probeStatus\('failed'\)/);
 assert.doesNotMatch(part,/readHoldings\s*\(/);
});
test('v77 scripts refresh in offline cache and diagnostic remains offline-only',()=>{
 assert.ok(html.includes('portfolio-pilot-v61.js?v=61.12'));assert.ok(html.includes('portfolio-diagnostic-v74.js?v=74.4'));
 assert.ok(sw.includes('portfolio-pilot-v61.js?v=61.12'));assert.ok(sw.includes('portfolio-diagnostic-v74.js?v=74.4'));
 assert.ok(sw.includes('sahamban-static-v84-0'));
 assert.doesNotMatch(diagnostic,/\bfetch\s*\(|localStorage|sessionStorage/);
});
