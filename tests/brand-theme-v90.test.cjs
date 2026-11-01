'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync('brand-theme-v90.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
test('v90 unified palette loads last and works offline',()=>{
 assert.ok(html.indexOf('joyful-theme-v89.css')<html.indexOf('brand-theme-v90.css'));
 assert.ok(html.indexOf('brand-theme-v90.css')<html.indexOf('</head>'));
 assert.match(sw,/sahamban-static-v93-0/);
 assert.match(sw,/brand-theme-v90\.css\?v=90\.0/);
});
test('v90 includes shared styles for form fields, module cards and holdings',()=>{
 for(const token of ['--sb90-navy','--sb90-mint','--sb90-purple','--sb90-blue','--sb90-gold','--sb90-coral']){
  assert.ok(css.includes(token),token);
 }
 for(const selector of ['main>section.card','input,select,textarea','.sahamban-module-v87','#livePortfolioSection .sb88-intro','#portfolioDailySummaryV83']){
  assert.ok(css.includes(selector),selector);
 }
 assert.ok(css.includes(':focus-visible'));
 assert.ok(css.includes('prefers-reduced-motion'));
 assert.doesNotMatch(css,/\.(?:profit|loss|gain|negative|positive|failed)\s*\{/i);
});
