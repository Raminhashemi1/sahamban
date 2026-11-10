'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const {attestPriceBasis}=require('./day3-trusted-evidence-boundary-v1.cjs');
const insCode='25514780181345713',daily='a'.repeat(64),date='20261110';
const evidence={insCode,dailySha256:daily,modes:['0','1','2'].map(mode=>
 ({mode,sha256:'b'.repeat(64),rowCount:500,firstDate:'20241015',lastDate:date}))};
const review={reviewerKeyId:'user-controlled',insCode,dailySha256:daily,
 fromDate:'20241015',throughDate:date,verifiedAt:'2026-11-09T00:00:00.000Z',
 expiresAt:'2099-01-01T00:00:00.000Z',signature:'ZmFrZQ=='};
const input={evidence,review,expectedInsCode:insCode,expectedDate:date,expectedDailySha256:daily};
function closed(v){assert.equal(v.historyBasisAuthenticated,false);assert.equal(v.threeModesVerified,false);
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
