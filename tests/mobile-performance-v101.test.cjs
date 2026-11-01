'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('holdings-cards-v99.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
test('v101 only constructs cards while card view is selected',()=>{
 new vm.Script(source);
 assert.match(source,/function sync\(\)/);
 assert.match(source,/if\(mode==='cards'\)render\(\)/);
 assert.match(source,/else\{list\.replaceChildren\(\);showMode\(\);\}/);
 assert.match(source,/MutationObserver\(sync\)/);
});
test('v101 keeps display copy isolated from financial data and persistent state',()=>{
 assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|innerHTML|sendBeacon|portfolioSnapshot|fundNav|parseFloat|parseInt/);
 assert.match(source,/cells\[index\]\.textContent/);
 assert.match(source,/cells\.length!==15/);
});
test('v101 JS asset is versioned for service-worker cache updates',()=>{
 const asset='holdings-cards-v99.js?v=99.1';
 assert.ok(html.includes(asset));assert.ok(sw.includes(asset));
});
