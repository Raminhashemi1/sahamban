'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('ux-milestone-v100.js','utf8');
const css=fs.readFileSync('ux-milestone-v100.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
test('v100 adds task-first navigation, not financial logic',()=>{
 new vm.Script(src);
 for(const anchor of ['brokerImportSection','livePortfolioSection','portfolioSection'])assert.ok(src.includes(anchor));
 assert.match(src,/createElement\('nav'\)/);
 assert.match(src,/aria-label/);
 assert.doesNotMatch(src,/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|sendBeacon|innerHTML|portfolioSnapshot|fundNav|parseInt|parseFloat/);
});
test('v100 resolves stacked card/table controls without touching their actions',()=>{
 assert.match(src,/\.sb98-view-controls/);
 assert.match(src,/\.sb99-controls/);
 assert.match(src,/v98\.hidden=root\.classList\.contains/);
 assert.match(css,/\.sb98-view-controls\[hidden\]\{display:none!important\}/);
 assert.match(css,/focus-visible/);assert.match(css,/min-height:52px/);
});
test('v100 offline assets are referenced consistently',()=>{
 for(const asset of ['ux-milestone-v100.js?v=100.0','ux-milestone-v100.css?v=100.0']){
  assert.ok(html.includes(asset),asset+' html');assert.ok(sw.includes(asset),asset+' offline');
 }
});
