'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('portfolio-price-empty-v116.js','utf8');
const css=fs.readFileSync('portfolio-price-empty-v116.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
test('v116 shows an accessible explanation only for a hidden portfolio table',()=>{
 new vm.Script(js);
 assert.match(js,/getElementById\('livePortfolioTable'\)/);
 assert.match(js,/getElementById\('sb88-panel-prices'\)/);
 assert.match(js,/guide\.hidden=!table\.hidden/);
 assert.match(js,/MutationObserver\(update\)/);
 assert.match(js,/attributeFilter:\['hidden'\]/);
 assert.match(js,/ارزش‌گذاری با قیمت فایل/);
 assert.match(js,/قیمت فایل لزوماً قیمت امروز بازار نیست/);
});
test('v116 explicit guide button switches to overview and restores focus',()=>{
 assert.match(js,/overviewTab\.click\(\)/);
 assert.match(js,/overviewTab\.focus\(\)/);
 assert.match(js,/role','status'/);
 assert.match(js,/button\.type='button'/);
 assert.match(css,/#sb116PriceEmpty\[hidden\]\{display:none!important\}/);
 assert.match(css,/:focus-visible/);
});
test('v116 stays presentation-only and is offline available',()=>{
 assert.doesNotMatch(js,/localStorage|sessionStorage|fetch\(|XMLHttpRequest|indexedDB|\.hidden=false;|\.hidden=true;/);
 for(const asset of ['portfolio-price-empty-v116.js?v=116.0','portfolio-price-empty-v116.css?v=116.0']){
  assert.ok(html.includes(asset),'missing HTML '+asset);
  assert.ok(sw.includes(asset),'missing offline '+asset);
 }
});
