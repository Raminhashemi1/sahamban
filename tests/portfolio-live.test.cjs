'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'holdings-live.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const broker = fs.readFileSync(path.join(root, 'broker-import.js'), 'utf8');

test('quote snapshots use a distinct storage key and never overwrite imported holdings', () => {
  assert.match(source, /const HOLDINGS_KEY='sahamban-broker-holdings-v1'/);
  assert.match(source, /const QUOTES_KEY='sahamban-broker-live-quotes-v1'/);
  assert.match(source, /localStorage\.setItem\(QUOTES_KEY/);
  assert.doesNotMatch(source, /localStorage\.setItem\(HOLDINGS_KEY/);
  assert.match(broker, /const STORAGE='sahamban-broker-holdings-v1'/);
});

test('totals are withheld when any holding has a failed quote', () => {
  assert.match(source, /if\(failed\.length\)/);
  assert.match(source, /return;\s*\}\s*const quotes=outcomes\.map/);
  assert.match(source, /if\(failed\.length\)[\s\S]*?ارزش کل جدید محاسبه نشد/);
});

test('symbol lookup requires exactly one normalized ticker match', () => {
  assert.match(source, /norm\(x\.lVal18AFC\)===holding\.key/);
  assert.match(source, /if\(exact\.length!==1\)/);
  assert.match(source, /قیمت پایانی معتبر/);
});

test('market date is validated and stale prices are rejected', () => {
  assert.match(source, /function validDate/);
  assert.match(source, /if\(age>7\)/);
  assert.match(source, /validDate\(info\.dEven\?\?info\.date\?\?info\.lastDate\)/);
});

test('values are calculated in rial and unrealized P/L uses quantity times price difference', () => {
  assert.match(source, /value\+=q\.price\*h\.quantity/);
  assert.match(source, /cost\+=h\.buy\*h\.quantity/);
  assert.match(source, /const pnl=value-cost/);
  assert.match(html, /ارزش محاسباتی \(ریال\)/);
  assert.match(html, /سود\/زیان \(ریال\)/);
});

test('Persian UI and versioned offline cache include the new module', () => {
  assert.match(html, /holdings-live\.js\?v=48/);
  assert.match(html, /persian-ui\.js\?v=48/);
  assert.match(worker, /sahamban-static-v48/);
  assert.match(worker, /holdings-live\.js\?v=48/);
});

test('imported holdings require positive integer quantity and positive buy price', () => {
  assert.match(source, /Number\.isSafeInteger\(quantity\)/);
  assert.match(source, /Number\.isFinite\(buy\)/);
  assert.match(source, /quantity<=0/);
  assert.match(source, /buy<=0/);
});
