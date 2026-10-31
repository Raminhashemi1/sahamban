'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('portfolio-pilot-v58.js','utf8'),html=fs.readFileSync('portfolio-pilot-v58.html','utf8');
assert.match(html,/portfolio-pilot-v58\.js\?v=58\.0/);
assert.match(html,/مبنای ارزش‌گذاری/);
assert.match(src,/mode==='import'\?'قیمت فایل':q\.priceKind\?\?'نامشخص'/);
assert.match(src,/i===13/);
console.log('PASS v58 price-basis column');
