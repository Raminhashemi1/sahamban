'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const pilot=fs.readFileSync('portfolio-pilot-v61.html','utf8');
assert.match(html,/id="portfolio-live-entry"/);
assert.match(html,/href="#livePortfolioSection"/);
assert.match(html,/portfolio-pilot-v61\.js\?v=61\.6/);
assert.match(html,/قیمت دریافتی لزوماً لحظه‌ای نیست/);
assert.match(pilot,/portfolio-pilot-v61\.js\?v=61\.2/);
assert.match(pilot,/دریافت و بررسی تاریخچه همه نمادهای سبد/);
assert.doesNotMatch(pilot,/۱۹ نماد|19 نماد|19 symbols/);
console.log('PASS homepage latest pilot entry and variable basket label');

assert.ok(html.includes('portfolio-asset-allocation-v62.js?v=62.0'));
