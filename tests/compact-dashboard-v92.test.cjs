'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('compact-dashboard-v92.js','utf8');
const css=fs.readFileSync('compact-dashboard-v92.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
function node(tag){
 return {tag,children:[],attrs:{},hidden:false,textContent:'',handlers:{},
  append(...xs){this.children.push(...xs)},setAttribute(k,v){this.attrs[k]=v},
  addEventListener(k,fn){this.handlers[k]=fn},insertAdjacentElement(k,x){this.after=x},
  focus(){this.focused=true},querySelector(){return null},classList:{add(){}}
 };
}
function boot(){
 const cards=Array.from({length:10},()=>{const c=node('div'),link=node('a'),help=node('button'),head=node('strong');head.textContent='ماژول';link.querySelector=()=>head;c.querySelector=s=>s.includes('link')?link:help;return c});
 const intro=node('div'),h2=node('h2'),p=node('p');intro.querySelector=s=>s==='h2'?h2:p;
 const home=node('section'),grid=node('nav');grid.querySelectorAll=()=>cards;
 home.querySelector=()=>intro;
 const document={getElementById:id=>id==='sahambanHubV87'?home:id==='sahambanModulesV87'?grid:null,createElement:node};
 const listeners={},location={hash:''};
 vm.runInNewContext(src,{document,window:{addEventListener:(k,fn)=>listeners[k]=fn},location});
 return {home,grid,intro,cards,quick:intro.after,tour:intro.after.after,listeners,location};
}
test('v92 keeps all ten modules and adds an optional four-step first-use tour',()=>{
 const a=boot();
 assert.equal(a.cards.length,10);assert.equal(a.tour.hidden,true);
 const open=a.quick.children[1];assert.equal(open.attrs['aria-expanded'],'false');
 open.handlers.click();assert.equal(a.tour.hidden,false);assert.equal(open.attrs['aria-expanded'],'true');
 const top=a.tour.children[0],title=a.tour.children[1],actions=a.tour.children[3];
 assert.match(title.textContent,/سبدتان/);
 assert.equal(actions.children[2].href,'#brokerImportSection');
 actions.children[1].handlers.click();assert.equal(actions.children[2].href,'#livePortfolioSection');
 actions.children[1].handlers.click();actions.children[1].handlers.click();
 assert.equal(actions.children[1].textContent,'شروع دوباره');
 top.children[1].handlers.click();assert.equal(a.tour.hidden,true);
 assert.equal(open.attrs['aria-expanded'],'false');
});
test('v92 is safe, keyboard navigable and offline-ready',()=>{
 assert.doesNotMatch(src,/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|innerHTML/);
 assert.match(src,/Escape/);assert.match(src,/aria-expanded/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/:focus-visible/);
 assert.match(html,/compact-dashboard-v92\.js\?v=92\.0/);
 assert.match(html,/compact-dashboard-v92\.css\?v=92\.0/);
 assert.match(sw,/sahamban-static-v92-0/);
 assert.match(sw,/compact-dashboard-v92\.js\?v=92\.0/);
 assert.match(sw,/compact-dashboard-v92\.css\?v=92\.0/);
});
