'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('holdings-cards-v99.js','utf8');
const css=fs.readFileSync('holdings-cards-v99.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
test('v99 creates a read-only card view from pre-rendered DOM cells only',()=>{
 new vm.Script(js);
 assert.match(js,/textContent/);
 assert.match(js,/MutationObserver/);
 assert.match(js,/replaceChildren/);
 assert.match(js,/cells\.length!==15/);
 assert.doesNotMatch(js,/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|innerHTML|sendBeacon|portfolioSnapshot|fundNav|parseFloat|parseInt/);
});
test('v99 preserves a complete table and 15 pre-existing column labels',()=>{
 assert.match(js,/keyColumns=\[0,1,4,9\]/);
 assert.match(js,/index<15/);
 assert.match(js,/aria-pressed/);
 assert.match(css,/\[hidden\]/);
 assert.match(css,/focus-visible/);
 assert.match(css,/min-height:44px/);
});
test('v99 JS and CSS are served and precached for offline access',()=>{
 for(const asset of ['holdings-cards-v99.js?v=99.2','holdings-cards-v99.css?v=99.0']){
  assert.ok(html.includes(asset));assert.ok(sw.includes(asset));
 }
});
