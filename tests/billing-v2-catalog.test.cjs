'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PLANS,getPlan}=require('../server/billing/catalog.cjs');
test('catalog contains exactly five manually renewed fixed-day plans with approved IRR prices',()=>{
 assert.deepEqual(PLANS.map(p=>[p.id,p.days,p.priceRial]),[
  ['SAHAMBAN_PRO_30D',30,1500000],
  ['SAHAMBAN_PRO_60D',60,2850000],
  ['SAHAMBAN_PRO_90D',90,4050000],
  ['SAHAMBAN_PRO_180D',180,7650000],
  ['SAHAMBAN_PRO_365D',365,14600000]
 ]);
 assert.equal(PLANS.length,5);
 assert.ok(PLANS.every(p=>Number.isSafeInteger(p.priceRial)&&p.priceRial>0));
 assert.equal(getPlan('SAHAMBAN_PRO_30D').days,30);
 assert.equal(getPlan('UNKNOWN'),null);
});
