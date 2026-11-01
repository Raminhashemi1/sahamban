'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('module-guidance-v91.js','utf8');
const css=fs.readFileSync('mobile-guidance-v91.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const ids=['livePortfolioSection','brokerImportSection','portfolioSection','technicalAnalysisV50','marketSection','positionSizeSectionV87','watchlistSection','manualAlertsSectionV87','professionalRiskV49','historicalSectionV87'];
test('v91 helps in each module without accessing portfolio, network or storage',()=>{
 const inserted=[];
 function element(tag){return {tag,children:[],className:'',textContent:'',attributes:{},append(...nodes){this.children.push(...nodes)},setAttribute(k,v){this.attributes[k]=v}};}
 const map=Object.fromEntries(ids.map(id=>{
  const heading=element('h2');heading.textContent=id;heading.parentElement={classList:{contains:()=>false}};
  heading.insertAdjacentElement=(where,node)=>{assert.equal(where,'afterend');inserted.push({id,node})};
  return [id,{id,querySelector:sel=>sel==='h2'?heading:null}];
 }));
 const document={querySelector:s=>s==='main'?{contains:()=>true}:null,getElementById:id=>map[id]||null,createElement:element};
 vm.runInNewContext(js,{document});
 assert.equal(inserted.length,10);
 for(const {node} of inserted){assert.equal(node.tag,'details');assert.equal(node.children[0].tag,'summary');assert.equal(node.children[1].children.length,3);assert.equal(node.children[2].tag,'p');}
 assert.doesNotMatch(js,/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|innerHTML/);
});
test('v91 includes responsive, keyboard-accessible guides and is loaded offline',()=>{
 assert.match(css,/\.sb91-guide summary:focus-visible/);
 assert.match(css,/@media\(min-width:430px\) and \(max-width:719px\)/);
 assert.match(css,/@media\(max-width:375px\)/);
 assert.ok(html.indexOf('brand-theme-v90.css')<html.indexOf('mobile-guidance-v91.css'));
 assert.ok(html.indexOf('module-hub-v87.js')<html.indexOf('module-guidance-v91.js'));
 assert.match(sw,/sahamban-static-v92-0/);
 assert.match(sw,/mobile-guidance-v91\.css\?v=91\.0/);
 assert.match(sw,/module-guidance-v91\.js\?v=91\.0/);
});
