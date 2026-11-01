'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('update-notice-v103.js','utf8');
const css=fs.readFileSync('update-notice-v103.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const html=fs.readFileSync('index.html','utf8');
test('v103 update UI never silently reloads or reads portfolio or persistent state',()=>{
 new vm.Script(js);
 assert.match(js,/reload\.addEventListener\('click',\(\)=>location\.reload\(\)\)/);
 assert.match(js,/controllerchange/);assert.match(js,/visibilitychange/);
 assert.match(js,/reg\.update\(\)/);assert.match(js,/lastCheck<600000/);
 assert.match(js,/تغییرات ذخیره‌نشده/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|indexedDB|portfolioSnapshot|fundNav|fetch\s*\(|innerHTML|location\.assign/);
});
test('v103 update banner accessible and keyboard friendly',()=>{
 assert.match(js,/aria-live/);assert.match(js,/role','status/);
 assert.match(css,/min-height:44px/);assert.match(css,/focus-visible/);
 assert.match(css,/\[hidden\]/);assert.match(css,/safe-area-inset-bottom/);
});
test('v103 assets are shipped inside new offline cache generation',()=>{
 assert.match(sw,/sahamban-static-v103-0/);
 assert.doesNotMatch(sw,/const CACHE='sahamban-static-v93-0'/);
 for(const file of ['update-notice-v103.js?v=103.0','update-notice-v103.css?v=103.0']){
  assert.ok(html.includes(file),file+' html');assert.ok(sw.includes(file),file+' sw');
 }
});
