'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('holdings-view-v98.js','utf8');
const css=fs.readFileSync('holdings-view-v98.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
function node(tag){
 return {tag,children:[],attrs:{},className:'',textContent:'',scrollLeft:5,listeners:{},
  classList:{classes:new Set(),toggle(name,on){if(on)this.classes.add(name);else this.classes.delete(name);}},
  querySelector(){return null},append(...xs){this.children.push(...xs)},
  insertAdjacentElement(which,el){this.inserted=el},
  setAttribute(k,v){this.attrs[k]=v},
  addEventListener(event,fn){this.listeners[event]=fn},
 };
}
function boot(mobile){
 const root=node('div'),scroll=node('div'),table=node('table');
 root.querySelector=()=>scroll;scroll.querySelector=()=>table;
 vm.runInNewContext(js,{document:{getElementById:id=>id==='livePortfolioTable'?root:null,createElement:node},matchMedia:()=>({matches:mobile})});
 return {root,scroll,controls:scroll.inserted};
}
test('v98 defaults to simple on mobile and allows restoring all original columns',()=>{
 const {root,scroll,controls}=boot(true),simple=controls.children[1],full=controls.children[2],hint=controls.children[3];
 assert.equal(root.classList.classes.has('sb98-compact'),true);
 assert.equal(simple.attrs['aria-pressed'],'true');
 assert.match(hint.textContent,/۱۵ ستون/);
 full.listeners.click();
 assert.equal(root.classList.classes.has('sb98-compact'),false);
 assert.equal(full.attrs['aria-pressed'],'true');
 simple.listeners.click();
 assert.equal(root.classList.classes.has('sb98-compact'),true);
 assert.equal(scroll.scrollLeft,0);
 assert.equal(controls.attrs.role,'group');
});
test('v98 defaults to full view on wide screens',()=>{
 const {root}=boot(false);assert.equal(root.classList.classes.has('sb98-compact'),false);
});
test('v98 hides only 11 columns in compact mode and never accesses financial data',()=>{
 new vm.Script(js);
 assert.doesNotMatch(js,/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|sendBeacon|innerHTML|portfolioSnapshot|fundNav|\.rows|\.cells|\.value/);
 assert.match(css,/:not\(:nth-child\(1\)\):not\(:nth-child\(2\)\):not\(:nth-child\(5\)\):not\(:nth-child\(10\)\)/);
 assert.match(css,/aria-pressed/);assert.match(css,/min-height:44px/);
 assert.match(js,/aria-live/);
 for(const asset of ['holdings-view-v98.js?v=98.0','holdings-view-v98.css?v=98.0']){
  assert.ok(html.includes(asset));assert.ok(sw.includes(asset));
 }
});
