'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {crosscheckPublicDps}=require('../day3-dividend-corroboration-v1.cjs');
const base={instrument:'25514780181345713',capitalMillionRial:30842726,
 dpsRial:80,dividendTotalMillionRial:2467418,
 earningsPerShareRial:128,payoutPermille:625,
 retainedProfitBeforeMillionRial:2710720,retainedProfitAfterMillionRial:243302,
 dividendSourceUrl:'https://t.me/s/NoavaranCodal/390591'};
test('80 Rial issuer-republished AGM amount reconciles with registered capital and nominal share',()=>{
 const o=crosscheckPublicDps(base);
 assert.equal(o.status,'SECONDARY_ARITHMETIC_CORROBORATED_ONLY');
 assert.equal(o.shareCount,'30842726000');
 assert.equal(o.exactDividendRial,'2467418080000');
 assert.equal(o.recomputedDividendMillionRial,2467418);
 assert.equal(o.payoutPermille,625);
 assert.equal(o.retainedProfitReconciled,true);
 assert.equal(o.issuerOriginalVerified,false);
 assert.equal(o.historyBasisAuthenticated,false);
 assert.equal(o.day3FinalAccepted,false);
 assert.equal(o.tradingSignalsEnabled,false);
 assert.equal(o.entryEligible,false);
});
test('wrong share-capital or total causes mismatch',()=>{
 for(const v of [{capitalMillionRial:30942726},{dividendTotalMillionRial:2467419},
                 {dpsRial:30},{earningsPerShareRial:127},{payoutPermille:620},
                 {retainedProfitAfterMillionRial:243301},{instrument:'46348559193224090'}]){
  const o=crosscheckPublicDps({...base,...v});
  assert.notEqual(o.status,'SECONDARY_ARITHMETIC_CORROBORATED_ONLY');
  assert.equal(o.day3FinalAccepted,false);
 }
});
test('a syntactically plausible hash never authenticates a third-party republication',()=>{
 const o=crosscheckPublicDps({...base,issuerOriginalSha256:'a'.repeat(64)});
 assert.equal(o.status,'SECONDARY_ARITHMETIC_CORROBORATED_ONLY');
 assert.equal(o.issuerOriginalVerified,false);
 assert.equal(o.sourceAuthenticated,false);
});
test('unknown source URL and fractional amount rejected',()=>{
 assert.equal(crosscheckPublicDps({...base,dividendSourceUrl:'https://evil.invalid'}).status,'NOT_PRIMARY_AUTHENTICATED');
 assert.equal(crosscheckPublicDps({...base,dpsRial:80.5}).status,'NOT_PRIMARY_AUTHENTICATED');
});
