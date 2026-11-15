'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assessFourChannelLaunch,requiredProof}=require('../billing/staging/sahmino-four-channel-release-evidence.cjs');
const channels=['CAFEBAZAAR','MYKET','GOOGLE_PLAY','WEB_DIRECT'];
const days=[30,60,90,180,365];
function inventory(){
 const evidence=Object.fromEntries(requiredProof.map(k=>[k,{status:'PASS',reference:'approved-evidence-123'}]));
 return {channels:Object.fromEntries(channels.map(c=>[c,{products:days.map(d=>({
  days:d,sku:c.toLowerCase()+'_'+d,priceMinor:10000,currency:'IRR'})),evidence:structuredClone(evidence)}]))};
}
test('nothing configured never qualifies as paid launch',()=>{
 assert.equal(assessFourChannelLaunch({}).ready,false);
 assert.equal(assessFourChannelLaunch(null).ready,false);
});
test('all four channels need five distinct exact-day SKUs and prices',()=>{
 const x=inventory();
 for(const ch of channels){
  const y=structuredClone(x);y.channels[ch].products.pop();
  assert.equal(assessFourChannelLaunch(y).ready,false);
 }
 const z=inventory();z.channels.MYKET.products[2].days=270;
 assert.equal(assessFourChannelLaunch(z).ready,false);
});
test('a single missing store sandbox proof blocks all-channel launch',()=>{
 const x=inventory();delete x.channels.GOOGLE_PLAY.evidence.sandboxPurchase;
 const r=assessFourChannelLaunch(x);
 assert.equal(r.ready,false);assert.ok(r.failures.includes('GOOGLE_PLAY:UNVERIFIED_sandboxPurchase'));
});
test('missing legal eligibility or provider verification blocks launch',()=>{
 const x=inventory();x.channels.CAFEBAZAAR.evidence.providerVerification.status='BLOCKED';
 x.channels.GOOGLE_PLAY.evidence.merchantEligibility.status='NOT_CHECKED';
 const r=assessFourChannelLaunch(x);
 assert.equal(r.ready,false);assert.ok(r.failures.some(x=>x.includes('GOOGLE_PLAY:UNVERIFIED_merchantEligibility')));
});
test('invalid prices currencies and duplicated SKU block release',()=>{
 const x=inventory();x.channels.WEB_DIRECT.products[0].priceMinor=0;
 x.channels.MYKET.products[1].currency='FAKE';
 x.channels.CAFEBAZAAR.products[1].sku=x.channels.CAFEBAZAAR.products[0].sku;
 assert.equal(assessFourChannelLaunch(x).ready,false);
});
test('complete fictional evidence matrix passes structural review only',()=>{
 const x=inventory();const r=assessFourChannelLaunch(x);
 assert.equal(r.ready,true);
 // The checker is NOT a provider/verifier and must not expose approval flags.
 assert.equal(Object.hasOwn(r,'realEntitlement'),false);
 assert.equal(Object.hasOwn(r,'paymentEnabled'),false);
});
