'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('beginner-reading-v95.js','utf8');
const css=fs.readFileSync('beginner-reading-v95.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
test('v95 education is read-only, parses cleanly and cannot change finance or persist data',()=>{
 new vm.Script(src);
 assert.doesNotMatch(src,/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|sendBeacon|innerHTML|portfolioSnapshot|fundNav\s*=|\.value\s*=/);
 assert.match(src,/document\.createElement/);
});
test('v95 explains stale, missing and mismatched financial data without inventing values',()=>{
 for(const required of ['قدیمی','نامشخص','صفر','NAV بازخرید','توصیه معامله'])assert.ok(src.includes(required),required);
 assert.match(src,/details/);assert.match(src,/summary/);
});
test('v95 mobile and accessibility hooks are shipped offline',()=>{
 assert.match(src,/aria-label/);assert.match(css,/:focus-visible/);
 assert.match(css,/min-height:44px/);assert.match(css,/@media\(max-width:520px\)/);
 for(const asset of ['beginner-reading-v95.js?v=95.0','beginner-reading-v95.css?v=95.0']){
  assert.ok(html.includes(asset),asset+' html');assert.ok(sw.includes(asset),asset+' offline');
 }
});
