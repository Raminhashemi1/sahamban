'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PLANS,getPlan,nextExpiry}=require('../server/billing/catalog.cjs');

test('catalog contains exactly five fixed-term IRR plans',()=>{
 assert.deepEqual(PLANS.map(p=>[p.days,p.priceRial]),[
  [30,1500000],[60,2850000],[90,4050000],[180,7650000],[365,14600000]
 ]);
 assert.equal(PLANS.length,5);
 assert.equal(getPlan('SAHAMBAN_PRO_30D').days,30);
 assert.equal(getPlan('SAHAMBAN_PRO_365D').priceRial,14600000);
 assert.equal(getPlan('UNKNOWN'),null);
});
test('term expiry uses exact elapsed days and UTC arithmetic',()=>{
 assert.equal(nextExpiry(null,'2026-01-01T00:00:00.000Z',30),'2026-01-31T00:00:00.000Z');
 assert.equal(nextExpiry('2026-01-31T00:00:00.000Z','2026-01-15T00:00:00.000Z',30),'2026-03-02T00:00:00.000Z');
 assert.equal(nextExpiry('2025-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z',365),'2027-01-01T00:00:00.000Z');
});
test('invalid timestamps and durations fail closed',()=>{
 assert.throws(()=>nextExpiry(null,'yesterday',30));
 assert.throws(()=>nextExpiry(null,'2026-01-01T00:00:00.000Z',0));
});
