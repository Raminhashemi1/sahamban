'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const tech=fs.readFileSync('technical-analysis-v50.js','utf8');
const pilot=fs.readFileSync('portfolio-pilot-v48.js','utf8');
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
 assert.match(html,/technical-analysis-v50\.js\?v=50\.7/);
 assert.match(sw,/sahamban-static-v50-10/);
 assert.match(sw,/broker-import\.js\?v=48\.2/);
 assert.match(sw,/technical-analysis-v50\.js\?v=50\.7/);
});

test('v50 selector can request real history for every portfolio symbol without fabricated data',()=>{
 assert.match(html,/technicalHistoryAllV50/);
 assert.match(pilot,/getHistoricalOne/);
 assert.match(pilot,/GetInstrumentSearch/);
 assert.match(pilot,/GetClosingPriceDailyList/);
 assert.match(pilot,/sahamban:verified-historical-quotes-v50/);
 assert.match(pilot,/history\.length<15/);
 assert.ok(pilot.includes("if(!/^\\d{8}$/.test(date)"));
 assert.ok(pilot.includes("if(!/^\\d{8}$/.test(d)"));
 assert.doesNotMatch(tech, /\bfetch\s*\(/);
 assert.match(html,/technical-analysis-v50\.js\?v=50\.7/);
 assert.match(sw,/sahamban-static-v50-10/);
});

test('history failure reasons are visible in both selector labels and status details',()=>{
 assert.match(tech,/q\.error\?'\\nعلت اعلام‌شده از سرویس: '/);
 assert.match(tech,/const failed=quotes\.filter/);
 assert.match(tech,/q\.error\|\|'علت از سرویس گزارش نشده'/);
 assert.match(tech,/تأیید نشد.*q\.error\.slice/);
});
