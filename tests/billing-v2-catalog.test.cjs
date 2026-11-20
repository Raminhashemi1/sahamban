'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PLANS,getPlan}=require('../server/billing/catalog.cjs');
test('catalog contains five manually renewable fixed-duration plans without hardcoded prices',()=>{
 assert.deepEqual(PLANS.map(p=>[p.id,p.days]),[
  ['SAHAMBAN_PRO_30D',30],['SAHAMBAN_PRO_60D',60],['SAHAMBAN_PRO_90D',90],
  ['SAHAMBAN_PRO_180D',180],['SAHAMBAN_PRO_365D',365]
 ]);
 assert.equal(PLANS.length,5);
 assert.ok(PLANS.every(p=>!('priceRial' in p)));
 assert.equal(getPlan('SAHAMBAN_PRO_30D').days,30);
 assert.equal(getPlan('UNKNOWN'),null);
});
