'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {summarize,markdown}=require('./after-close-summary.cjs');
test('network timeout is never a market-data pass',()=>{
 const r=summarize({status:'UNVERIFIED_NETWORK'},{status:'UNVERIFIED_NETWORK'});
 assert.equal(r.status,'NOT_VERIFIED');
 assert.match(markdown(r),/Both GitHub-runner network paths timed out/);
});
test('gateway reachability cannot substitute for live quote verification',()=>{
 const r=summarize({status:'UNVERIFIED_NETWORK'},{status:'JSON_RESPONSE_RECEIVED'});
 assert.equal(r.status,'NOT_VERIFIED');
});
test('history publication lag never passes even if gateway is reachable',()=>{
 const r=summarize({status:'UNVERIFIED_HISTORY_NOT_PUBLISHED'},{status:'JSON_RESPONSE_RECEIVED'});
 assert.equal(r.status,'NOT_VERIFIED');
 assert.match(r.explain,/Do not merge/);
});
test('only strict CDN live verification permits verified status',()=>{
 const r=summarize({status:'AUTOMATED_QUOTE_CHECK_PASSED'},null);
 assert.equal(r.status,'VERIFIED_LIVE_QUOTE_AND_HISTORY');
 assert.match(markdown(r),/not physical-device acceptance/);
});
test('missing or malformed reports cannot pass',()=>{
 for(const x of [null,{},[],{status:'AUTOMATED_QUOTE_CHECK_FAILED'}])
  assert.equal(summarize(x,null).status,'NOT_VERIFIED');
});
