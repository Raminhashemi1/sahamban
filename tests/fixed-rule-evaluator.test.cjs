'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createHash}=require('node:crypto');
const fixed=require('../server/fixed-rule-evaluator.cjs');
const history=Array.from({length:60},(_,i)=>({
 date:new Date(Date.UTC(2026,7,1+i)).toISOString().slice(0,10).replaceAll('-',''),close:100+i
}));
history[59]={date:'20261104',close:159};
test('backend computes exactly the checked-in v50/v129 rules, never browser-supplied decisions',()=>{
 const q={symbol:'AAA',history,historyPriceBasisEvidence:'INDEPENDENTLY_ATTESTED',code:'GUARANTEED_PROFIT',score:100};
 const r=fixed.evaluate(q,{today:'20261104',maxAgeDays:0});
 assert.equal(r.symbol,'AAA');assert.equal(r.marketDate,'20261104');
 assert.ok(['ENTRY_CANDIDATE','WAIT','AVOID','EXIT_REVIEW','RISK_EXIT'].includes(r.code));
 assert.notEqual(r.code,'GUARANTEED_PROFIT');assert.ok(r.score<=100);
});
test('server fixed rule evaluator blocks unverified basis without trusting forged browser scores',()=>{
 for(const evidence of [undefined,'NOT_ESTABLISHED','SELF_ATTESTED']){
  const r=fixed.evaluate({symbol:'AAA',history,historyPriceBasisEvidence:evidence,code:'ENTRY_CANDIDATE',score:100},{today:'20261104',maxAgeDays:0});
  assert.equal(r.code,'DATA_BASIS_UNVERIFIED');
  assert.equal(r.stop,null);
  assert.equal(r.target,null);
  assert.equal(r.riskPerShare,null);
 }
});
test('version fingerprint covers both exact trusted source files',()=>{
 const a=fs.readFileSync('technical-indicators-v50.js','utf8');
 const b=fs.readFileSync('decision-support-v129.js','utf8');
 const hex=createHash('sha256').update('Sahamban trusted fixed-rule v1\0')
  .update(a).update('\0').update(b).digest('hex');
 assert.equal(fixed.ruleSourceSha256,hex);
 assert.match(hex,/^[a-f0-9]{64}$/);
 assert.equal(fixed.ruleVersion,'decision-support-v129-fixed');
});
test('invalid market dates or unknown histories fail without creating a signal',()=>{
 assert.throws(()=>fixed.evaluate({symbol:'AAA',history},{today:'20261105',maxAgeDays:0}),/قدیمی/);
 assert.throws(()=>fixed.evaluate({symbol:'AAA',history:[]},{today:'20261104'}),/حداقل/);
});
