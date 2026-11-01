'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync('mobile-table-v97.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
test('v97 keeps existing read-only financial table and scrollable accessible region',()=>{
 assert.match(html,/id="livePortfolioTable"/);
 assert.match(html,/class="portfolio-v61-scroll"[^>]*role="region"[^>]*tabindex="0"/);
 assert.match(css,/overflow-x:auto/);
 assert.match(css,/position:sticky;right:0/);
 assert.match(css,/:focus-visible/);
 assert.doesNotMatch(css,/display\s*:\s*none|visibility\s*:\s*hidden|pointer-events\s*:\s*none/);
});
test('v97 mobile improvements are offline and include motion accommodation',()=>{
 assert.match(css,/@media\(max-width:520px\)/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/-webkit-overflow-scrolling:touch/);
 const asset='mobile-table-v97.css?v=97.0';
 assert.ok(html.includes(asset));assert.ok(sw.includes(asset));
});
