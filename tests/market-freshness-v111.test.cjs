'use strict';

const assert = require('node:assert/strict');
const { classifyTehranQuoteFreshness, parseTradeTime, tehranParts } =
  require('./market-freshness-v111.cjs');

const duringSession = new Date('2026-11-02T07:50:00.000Z'); // Monday 11:20 Tehran

assert.equal(tehranParts(duringSession).date, '20261102');
assert.equal(tehranParts(duringSession).time, '11:20:00');
assert.equal(parseTradeTime(111500).time, '11:15:00');

assert.equal(classifyTehranQuoteFreshness({
  marketDate: '20261102', lastTradeTime: 111500, now: duringSession
}).status, 'FRESH');

assert.equal(classifyTehranQuoteFreshness({
  marketDate: '20261101', lastTradeTime: 111500, now: duringSession
}).status, 'UNVERIFIED_STALE_SESSION_DATE');

assert.equal(classifyTehranQuoteFreshness({
  marketDate: '20261102', lastTradeTime: 105900, now: duringSession
}).status, 'UNVERIFIED_STALE_TRADE');

assert.equal(classifyTehranQuoteFreshness({
  marketDate: '20261102', lastTradeTime: null, now: duringSession
}).status, 'UNVERIFIED_MISSING_TRADE_TIME');

assert.equal(classifyTehranQuoteFreshness({
  marketDate: '20261102', lastTradeTime: 112100,
  now: new Date('2026-11-02T08:30:00.000Z') // Monday 12:00 Tehran
}).status, 'FRESH');

assert.equal(classifyTehranQuoteFreshness({
  marketDate: '20261102', lastTradeTime: 122900,
  now: new Date('2026-11-02T09:01:00.000Z') // Monday 12:31 Tehran
}).status, 'UNVERIFIED_OUTSIDE_SESSION');

assert.equal(classifyTehranQuoteFreshness({
  marketDate: '20261105', lastTradeTime: 111500,
  now: new Date('2026-11-05T07:50:00.000Z') // Thursday 11:20 Tehran
}).status, 'UNVERIFIED_OUTSIDE_SESSION');

assert.equal(classifyTehranQuoteFreshness({
  marketDate: '20261102', lastTradeTime: 112000,
  now: new Date('2026-11-02T07:50:00.000Z'), maxAgeMinutes: 0
}).status, 'FRESH');

assert.equal(classifyTehranQuoteFreshness({
  marketDate: '20261102', lastTradeTime: 112001,
  now: duringSession
}).status, 'UNVERIFIED_STALE_TRADE');

console.log('PASS v111 market freshness: same-session date, last-trade age, outside-session and malformed/missing timestamps');
