'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync('visual-consistency-v96.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
test('v96 shared styling is presentation-only and preserves semantic states',()=>{
 assert.doesNotMatch(css,/\.result[^}]*color\s*:/s);
 assert.doesNotMatch(css,/\.tag[^}]*background\s*:/s);
 assert.doesNotMatch(css,/display\s*:\s*none|visibility\s*:\s*hidden/);
 assert.match(css,/focus-visible/);assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/min-height:44px/);assert.match(css,/@media\(max-width:719px\)/);
});
test('v96 stylesheet is versioned in the document and offline cache',()=>{
 const asset='visual-consistency-v96.css?v=96.0';
 assert.ok(html.includes(asset));assert.ok(sw.includes(asset));
});
