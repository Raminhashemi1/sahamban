'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('holdings-cards-v99.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
test('v102 coalesces same-frame portfolio row mutations',()=>{
 new vm.Script(source);
 assert.match(source,/let queued=false/);
 assert.match(source,/if\(queued\)return/);
 assert.match(source,/requestAnimationFrame/);
 assert.match(source,/queued=false/);
 assert.match(source,/if\(mode==='cards'\)render\(\)/);
 assert.match(source,/new MutationObserver\(sync\)/);
});
test('v102 retains read-only fail-closed card cloning of 15 source cells',()=>{
 assert.match(source,/cells\.length!==headings\.length\|\|cells\.length!==15/);
 assert.match(source,/list\.replaceChildren\(fragment\)/);
 assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|innerHTML|sendBeacon|fundNav|parseFloat|parseInt/);
});
test('v102 updated script URL is precached offline',()=>{
 const uri='holdings-cards-v99.js?v=99.2';
 assert.ok(html.includes(uri));assert.ok(sw.includes(uri));
});
