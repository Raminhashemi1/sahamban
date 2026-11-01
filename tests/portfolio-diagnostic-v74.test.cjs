'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('portfolio-diagnostic-v74.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
function el(text=''){return {textContent:text,children:[],handlers:{},type:'',append(...children){this.children.push(...children)},addEventListener(name,fn){this.handlers[name]=fn}};}
const output=p=>[p.textContent,...p.children.map(x=>x.textContent)].join('\n');
function run(){const panel=el(),events={},copied=[];const document={getElementById:id=>id==='portfolioDiagnosticV74'?panel:null,createElement:()=>el()};const navigator={clipboard:{async writeText(value){copied.push(value)}}};vm.runInNewContext(src,{document,window:{addEventListener:(name,fn)=>(events[name]??=[]).push(fn)},navigator,Number,String,Array,Error});const send=(name,quotes)=>events[name][0]({detail:quotes});return {panel,send,copied};}
const nav=[{symbol:'عیار',assetClass:'fund_etf',fundNavChecked:true,price:100,fundNav:95,marketDate:'20261030',fundNavDate:'20261030'}];
const positions=[{symbol:'عیار',quantity:12,price:100,marketDate:'20261030'}];
test('v74 leaves the report local until user presses copy',()=>{const a=run();a.send('sahamban:verified-fund-nav-premium-v63',{quotes:nav});a.send('sahamban:verified-portfolio-concentration-v68',{positions});assert.equal(a.copied.length,0);assert.match(output(a.panel),/nav_validation=verified/);assert.match(output(a.panel),/quote_validation=verified/);});
test('v74 copies only predefined categories and no sensitive holdings',async()=>{const a=run();a.send('sahamban:verified-fund-nav-premium-v63',{quotes:nav});a.send('sahamban:verified-portfolio-concentration-v68',{positions});await a.panel.children[0].handlers.click();const x=a.copied[0];assert.match(x,/nav_validation=verified/);assert.doesNotMatch(x,/عیار|20261030|95|100|12/);assert.match(x,/no-symbols;no-quantities;no-prices/);});
test('v74 explicitly reports missing and incomplete NAV',()=>{const a=run();a.send('sahamban:verified-fund-nav-premium-v63',{quotes:[{...nav[0],fundNav:null}]});assert.match(output(a.panel),/nav_validation=unavailable/);const b=run();b.send('sahamban:verified-fund-nav-premium-v63',{quotes:[nav[0],{...nav[0],symbol:'ETF2',fundNav:null}]});assert.match(output(b.panel),/nav_validation=incomplete/);});
test('v74 revokes old verified quote state on a new NAV event',()=>{const a=run();a.send('sahamban:verified-fund-nav-premium-v63',{quotes:nav});a.send('sahamban:verified-portfolio-concentration-v68',{positions});a.send('sahamban:verified-fund-nav-premium-v63',{quotes:nav});assert.match(output(a.panel),/quote_validation=not-run/);});
test('v74 is offline bundled and accesses neither holdings storage nor network',()=>{assert.match(html,/portfolioDiagnosticV74/);assert.match(html,/portfolio-diagnostic-v74\.js\?v=74\.4/);assert.match(sw,/portfolio-diagnostic-v74\.js\?v=74\.4/);assert.doesNotMatch(src,/localStorage|sessionStorage|\bfetch\s*\(/);});

test('v81 reports only categorical ETF probe outcomes and resets on failure',async()=>{
 const a=run();
 a.send('sahamban:portfolio-refresh-status-v76',{status:'started',reason:'none'});
 a.send('sahamban:verified-fund-nav-premium-v63',{quotes:[{...nav[0],fundNavProbeStatus:'identity-mismatch',fundNav:null}]});
 assert.match(output(a.panel),/etf_probe=identity-mismatch/);
 await a.panel.children[0].handlers.click();
 assert.doesNotMatch(a.copied[0],/عیار|20261030|95|100|12/);
 a.send('sahamban:portfolio-refresh-status-v76',{status:'failed',reason:'exception'});
 assert.match(output(a.panel),/etf_probe=not-run/);
 const b=run();
 b.send('sahamban:verified-fund-nav-premium-v63',{quotes:[{...nav[0],fundNavProbeStatus:'nav-verified'}]});
 assert.match(output(b.panel),/etf_probe=verified/);
});
