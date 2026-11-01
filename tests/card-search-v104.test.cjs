'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('card-search-v104.js','utf8');
const css=fs.readFileSync('card-search-v104.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
test('v104 symbol-only card search never fetches, persists or alters financial calculations',()=>{
 new vm.Script(js);
 assert.match(js,/querySelector\('h4'\)/);
 assert.match(js,/MutationObserver\(filter\)/);
 assert.match(js,/card\.hidden=!match/);
 assert.doesNotMatch(js,/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|portfolioSnapshot|fundNav|\.valueOf\(|parseFloat|parseInt|innerHTML/);
 assert.match(js,/aria-controls/);
});
test('v104 offers accessible results, keyboard clearing and compact mobile actions',()=>{
 assert.match(js,/aria-live/);
 assert.match(js,/event\.key==='Escape'/);
 assert.match(js,/input\.focus\(\)/);
 assert.match(js,/نمادی پیدا نشد/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/focus-visible/);
 assert.match(css,/\.sb99-card\[hidden\]/);
 assert.match(css,/@media\(max-width:360px\)/);
});
test('v104 assets are wired in document and offline cache',()=>{
 for(const name of ['card-search-v104.js?v=104.0','card-search-v104.css?v=104.0']){
  assert.ok(html.includes(name),'html: '+name);
  assert.ok(sw.includes(name),'sw: '+name);
 }
});
