'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const tech=fs.readFileSync('technical-analysis-v50.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');

test('v50 selector has a DOM-table fallback independent of custom events',()=>{
 assert.match(tech,/const portfolioRows=\$\('livePortfolioRows'\)/);
 assert.match(tech,/new MutationObserver\(activateFromVisibleRows\)/);
 assert.match(tech,/row\.cells\[0\]/);
 assert.match(tech,/selector\.disabled=false/);
 assert.match(tech,/history:null/);
});

test('HTML and service worker load cache-busted selector and broker scripts',()=>{
 assert.match(html,/broker-import\.js\?v=48\.2/);
 assert.match(html,/technical-analysis-v50\.js\?v=50\.5/);
 assert.match(sw,/sahamban-static-v50-6/);
 assert.match(sw,/broker-import\.js\?v=48\.2/);
 assert.match(sw,/technical-analysis-v50\.js\?v=50\.5/);
});

test('v50 selector can request real history for every portfolio symbol without fabricated data',()=>{
 assert.match(tech,/technicalHistoryAllV50/);
 assert.match(tech,/GetInstrumentSearch/);
 assert.match(tech,/GetClosingPriceDailyList/);
 assert.match(tech,/sahamban:verified-historical-quotes-v50/);
 assert.match(tech,/history\.length<15/);
 assert.match(html,/technical-analysis-v50\.js\?v=50\.5/);
 assert.match(sw,/sahamban-static-v50-6/);
});
