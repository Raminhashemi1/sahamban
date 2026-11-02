'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('beginner-experience-v93.js','utf8');
const css=fs.readFileSync('beginner-experience-v93.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
test('v93 only affects presentation and does not access financial data or browser storage',()=>{
 new vm.Script(js);
 assert.doesNotMatch(js,/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|innerHTML|portfolioSnapshot|navigator\.sendBeacon/);
 assert.match(js,/textContent/);
});
test('v93 explains NAV absence without presenting it as zero and warns against predictions',()=>{
 assert.match(js,/نبود داده معتبر به معنی صفر نیست/);
 assert.match(js,/پیش‌بینی قطعی یا پیشنهاد خرید و فروش نیست/);
});
test('v93 retains accessible education and mobile targets',()=>{
 assert.match(js,/details/);assert.match(js,/summary/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media\(max-width:400px\)/);
 assert.match(html,/beginner-experience-v93\.js\?v=93\.0/);
 assert.match(html,/beginner-experience-v93\.css\?v=93\.0/);
 assert.match(sw,/beginner-experience-v93\.js\?v=93\.0/);
 assert.match(sw,/beginner-experience-v93\.css\?v=93\.0/);
 assert.match(sw,/sahamban-static-v103-0/);
});
