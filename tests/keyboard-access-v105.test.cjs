'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('keyboard-access-v105.js','utf8');
const css=fs.readFileSync('keyboard-access-v105.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const html=fs.readFileSync('index.html','utf8');
test('v105 skip link is a keyboard accessible native anchor with explicit main focus',()=>{
 new vm.Script(js);
 assert.match(js,/querySelector\('body > main'\)/);
 assert.match(js,/main\.tabIndex=-1/);
 assert.match(js,/main\.focus\(\{preventScroll:true\}\)/);
 assert.match(js,/document\.body\.insertBefore\(skip,main\)/);
 assert.match(css,/focus-visible/);
 assert.match(css,/min-height:44px/);
});
test('v105 does not access holdings, trading inputs, storage or network',()=>{
 assert.doesNotMatch(js,/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|portfolioSnapshot|fundNav|innerHTML|parseFloat|parseInt/);
 for(const name of ['keyboard-access-v105.js?v=105.0','keyboard-access-v105.css?v=105.0']){
  assert.ok(html.includes(name),name+' html');assert.ok(sw.includes(name),name+' sw');
 }
});
