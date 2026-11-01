'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),src=fs.readFileSync('module-hub-v87.js','utf8'),sw=fs.readFileSync('sw.js','utf8');
function elt(id){
 return {id,hidden:false,children:[],textContent:'',href:'',handlers:{},
  append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x},
  addEventListener(name,fn){this.handlers[name]=fn},setAttribute(k,v){this[k]=v},
  scrollIntoView(){this.scrolled=true},closest(){return null}};
}
function boot(initialHash=''){
 const ids={};for(const id of ['sahambanHubV87','sahambanGuideV87','sahambanGuideTitleV87','sahambanGuideStepsV87','sahambanGuideOpenV87','sahambanModulesV87','sahambanHomeControlV87','sahambanActiveTitleV87','calculate','check'])ids[id]=elt(id);
 const keys=['portfolio-live-entry','positionSizeSectionV87','manualAlertsSectionV87','marketSection','watchlistSection','historicalSectionV87','brokerImportSection','livePortfolioSection','portfolioSection','professionalRiskV49','premiumArea','technicalAnalysisV50'];
 const sections=keys.map(id=>{const e=elt(id);e.closest=()=>e;e.querySelector=()=>null;ids[id]=e;return e});
 ids.calculate.closest=()=>ids.positionSizeSectionV87;ids.check.closest=()=>ids.manualAlertsSectionV87;
 const host={querySelectorAll:()=>sections},listeners={},location={hash:initialHash};
 const document={getElementById:id=>ids[id]??null,querySelector:s=>s==='main'?host:null,createElement:tag=>{const e=elt('');e.tag=tag;return e}};
 vm.runInNewContext(src,{document,location,window:{addEventListener:(n,fn)=>listeners[n]=fn},requestAnimationFrame:fn=>fn()});
 return {ids,sections,location,change:hash=>{location.hash=hash;listeners.hashchange()},buttons:ids.sahambanModulesV87.children};
}
test('v87 creates an at-a-glance 10 module home and guides with no extra traffic',()=>{
 const a=boot();assert.equal(a.buttons.length,10);assert.equal(a.ids.sahambanHubV87.hidden,false);
 assert.ok(a.sections.every(x=>x.hidden));assert.equal(a.ids.sahambanHomeControlV87.hidden,true);
 assert.doesNotMatch(src,/localStorage|sessionStorage|fetch\(|XMLHttpRequest|navigator\.sendBeacon/);
});
test('v87 opens only selected module and returns home',()=>{
 const a=boot();a.change('#livePortfolioSection');
 assert.equal(a.ids.livePortfolioSection.hidden,false);
 assert.equal(a.ids.portfolioSection.hidden,true);
 assert.equal(a.ids.sahambanHubV87.hidden,true);
 assert.equal(a.ids.sahambanHomeControlV87.hidden,false);
 a.ids.sahambanHomeControlV87.handlers.click();assert.equal(a.location.hash,'home');
 a.change('#home');assert.equal(a.ids.sahambanHubV87.hidden,false);
});
test('v87 shows contextual guidance, step list, and a link to selected module',()=>{
 const a=boot(),button=a.buttons[0].children[1];
 button.handlers.click();
 assert.equal(a.ids.sahambanGuideV87.hidden,false);
 assert.equal(a.ids.sahambanGuideStepsV87.children.length,3);
 assert.equal(a.ids.sahambanGuideOpenV87.href,'#livePortfolioSection');
 assert.match(a.ids.sahambanGuideTitleV87.textContent,/سبد من/);
});
test('v87 supports deep links directly and all module ids are backed by HTML',()=>{
 const a=boot('#professionalRiskV49');assert.equal(a.ids.professionalRiskV49.hidden,false);
 assert.match(html,/id="sahambanHubV87"/);assert.match(html,/id="sahambanModulesV87"/);
 assert.match(html,/module-hub-v87\.js\?v=87\.0/);
 for(const id of ['livePortfolioSection','brokerImportSection','portfolioSection','technicalAnalysisV50','marketSection','watchlistSection','professionalRiskV49'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(sw,/module-hub-v87\.js\?v=87\.0/);assert.match(sw,/sahamban-static-v93-0/);
});
