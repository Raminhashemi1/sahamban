'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('portfolio-insights-scroll-v115.js','utf8');
const css=fs.readFileSync('portfolio-insights-scroll-v115.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
test('v115 wraps only already-created insight tables without reading or altering holdings',()=>{
 new vm.Script(js);
 assert.match(js,/getElementById\('portfolioInsightsV613'\)/);
 assert.match(js,/table\.tagName!=='TABLE'/);
 assert.match(js,/table\.before\(region\)/);
 assert.match(js,/region\.append\(table\)/);
 assert.match(js,/MutationObserver\(wrapTables\)/);
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|innerHTML|\.textContent\s*=/);
 assert.doesNotMatch(js,/livePortfolioRows|parseFloat|Number\(|NAV|marketDate/);
});
test('v115 offers independent scrollable, accessible table regions without hiding financial columns',()=>{
 assert.match(js,/role','region'/);
 assert.match(js,/region\.tabIndex=0/);
 assert.match(css,/#portfolioInsightsV613 \.sb115-insight-scroll/);
 assert.match(css,/overflow-x:auto/);
 assert.match(css,/width:max-content!important/);
 assert.match(css,/white-space:nowrap/);
 assert.match(css,/position:sticky;right:0/);
 assert.match(css,/:focus-visible/);
 assert.doesNotMatch(css,/display\s*:\s*none|visibility\s*:\s*hidden/);
});
test('v115 linked and cached for offline with versioned static assets',()=>{
 for(const asset of ['portfolio-insights-scroll-v115.js?v=115.0','portfolio-insights-scroll-v115.css?v=115.0']){
  assert.ok(html.includes(asset),'missing HTML '+asset);
  assert.ok(sw.includes(asset),'missing offline '+asset);
 }
});
