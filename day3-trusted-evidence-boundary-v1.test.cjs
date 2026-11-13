'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const {attestPriceBasis}=require('./day3-trusted-evidence-boundary-v1.cjs');
const insCode='25514780181345713',daily='a'.repeat(64),date='20261110';
const evidence={insCode,dailySha256:daily,modes:['0','1','2'].map(mode=>
 ({mode,sha256:({0:'b',1:'c',2:'d'})[mode].repeat(64),rowCount:500,firstDate:'20241015',lastDate:date}))};
const review={reviewerKeyId:'user-controlled',insCode,dailySha256:daily,
 fromDate:'20241015',throughDate:date,verifiedAt:'2026-11-09T00:00:00.000Z',
 expiresAt:'2099-01-01T00:00:00.000Z',signature:'ZmFrZQ=='};
const input={evidence,review,expectedInsCode:insCode,expectedDate:date,expectedDailySha256:daily};
function closed(v){assert.equal(v.entryEligible,false);assert.equal(v.historyBasisAuthenticated,false);assert.equal(v.threeModesVerified,false);
 assert.equal(v.tradingSignalsEnabled,false);assert.equal(v.day3FinalAccepted,false);}
test('self-issued reviewer not trusted',()=>{const v=attestPriceBasis(input);closed(v);assert.equal(v.reason,'NO_TRUSTED_REVIEWER');});
for(const [name,override] of [
 ['swapped instrument',{expectedInsCode:'12345678901234567'}],
 ['mutated digest',{expectedDailySha256:'b'.repeat(64)}],
 ['out-of-range date',{expectedDate:'20270102'}],
 ['invalid digest',{expectedDailySha256:'x'}],
 ['missing review',{review:null}],
 ['missing capture',{evidence:null}]
])test(name,()=>closed(attestPriceBasis({...input,...override})));
test('relabelled duplicate modes',()=>closed(attestPriceBasis({...input,evidence:{...evidence,modes:evidence.modes.map(x=>({...x,mode:'0'}))}})));
test('missing modes',()=>closed(attestPriceBasis({...input,evidence:{...evidence,modes:[]}})));
test('self-declared attestation flag',()=>closed(attestPriceBasis({...input,evidence:{...evidence,INDEPENDENTLY_ATTESTED:true},review:{...review,historyBasisAuthenticated:true}})));
test('browser public key cannot enroll reviewer',()=>closed(attestPriceBasis({...input,review:{...review,publicKey:'bogus'}})));

test('price-basis attestation never by itself grants portfolio entry eligibility',()=>{
 const fs=require('node:fs');
 const source=fs.readFileSync(require.resolve('./day3-trusted-evidence-boundary-v1.cjs'),'utf8');
 assert.doesNotMatch(source,/entryEligible\s*:\s*true/);
 assert.match(source,/status:'INDEPENDENTLY_ATTESTED'[\s\S]*?entryEligible:false/);
});

test('identical hashes cannot masquerade as distinct 0/1/2 price modes',()=>{
 const modes=evidence.modes.map(x=>({...x,sha256:'b'.repeat(64)}));
 const result=attestPriceBasis({...input,evidence:{...evidence,modes}});
 closed(result);assert.equal(result.reason,'UNALIGNED_OR_RELABELED_PRICE_MODES');
});
test('mismatched row counts, dates and invalid calendar spans fail before signing',()=>{
 for(const alter of [
  {rowCount:499}, {firstDate:'20241016'}, {lastDate:'20261111'},
  {firstDate:'20260230'}, {lastDate:'20261131'}, {rowCount:0},
 ]){
  const modes=evidence.modes.map((x,i)=>i===2?{...x,...alter}:{...x});
  const result=attestPriceBasis({...input,evidence:{...evidence,modes}});
  closed(result);assert.notEqual(result.reason,'NO_TRUSTED_REVIEWER');
 }
});
test('invalid expected session date fails closed',()=>{
 const result=attestPriceBasis({...input,expectedDate:'20260230'});
 closed(result);assert.equal(result.reason,'INVALID_CONTEXT');
});
test('duplicate adjusted mode cannot be relabelled with signed-looking review',()=>{
 const modes=evidence.modes.map((x,i)=>i===2?{...x,mode:'1'}:x);
 const result=attestPriceBasis({...input,evidence:{...evidence,modes}});
 closed(result);assert.equal(result.reason,'MISSING_OR_INVALID_THREE_MODE_EVIDENCE');
});
