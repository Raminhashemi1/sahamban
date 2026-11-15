'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {makeProviderConnectionGate}=require('../billing/staging/sahmino-provider-connection-gate.cjs');
const channels=['CAFEBAZAAR','MYKET','GOOGLE_PLAY','WEB_DIRECT'];
const days=[30,60,90,180,365];
const catalog=days.map(days=>({days,sku:'sahmino_'+days,priceMinor:50000+days,currency:'IRR'}));
const principal={authenticated:true,subject:'user_7'};
const order=(channel,days)=>({channel,accountId:'user_7',planDays:days,sku:'sahmino_'+days,
 priceMinor:50000+days,currency:'IRR',orderId:'order_777',merchantId:'merchant_999'});
const fixture=(channel,days)=>({channel,status:'SETTLED',sku:'sahmino_'+days,
 purchaseId:'purchase_999',orderId:'order_777',priceMinor:50000+days,currency:'IRR'});
test('all 20 plans fail closed without official merchant configuration',async()=>{
 for(const channel of channels)for(const duration of days){
  const gate=makeProviderConnectionGate({channel,catalog});
  const result=await gate.check({principal,serverOrder:order(channel,duration),receipt:'fixture-token-001'});
  assert.equal(result.reason,'OFFICIAL_PROVIDER_NOT_CONFIGURED');
  assert.equal(result.realEntitlement,false);assert.equal(result.checkoutEnabled,false);
 }
});
test('all 20 positive mock callbacks remain non-authoritative',async()=>{
 for(const channel of channels)for(const duration of days){
  const gate=makeProviderConnectionGate({channel,catalog,merchantApproved:true,
   queryOfficialProvider:async()=>fixture(channel,duration)});
  const result=await gate.check({principal,serverOrder:order(channel,duration),receipt:'fixture-token-001'});
  assert.equal(result.reason,'PROVIDER_RESPONSE_REQUIRES_DURABLE_REVIEW');
  assert.equal(result.evidenceMatched,true);
  assert.equal(result.providerVerified,false);assert.equal(result.entitlementGranted,false);
 }
});
test('tampered price, plan, channel and account never call provider',async()=>{
 for(const channel of channels){
  let calls=0;
  const gate=makeProviderConnectionGate({channel,catalog,merchantApproved:true,
   queryOfficialProvider:async()=>{calls++;return fixture(channel,30);}});
  for(const change of [{accountId:'bob'},{channel:'WRONG'},{planDays:270},
   {priceMinor:1},{sku:'other'}]){
   const result=await gate.check({principal,serverOrder:{...order(channel,30),...change},
    receipt:'fixture-token-001'});
   assert.equal(result.realEntitlement,false);
  }
  assert.equal(calls,0);
 }
});
test('pending, refund, ambiguous flags and web order tampering deny grant',async()=>{
 for(const channel of channels){
  for(const data of [null,{...fixture(channel,30),status:'PENDING'},
    {...fixture(channel,30),refunded:true},{...fixture(channel,30),refunded:'false'},
    {...fixture(channel,30),sku:'wrong'},...channel==='WEB_DIRECT'?
      [{...fixture(channel,30),orderId:'different'}]:[]]){
   const gate=makeProviderConnectionGate({channel,catalog,merchantApproved:true,
    queryOfficialProvider:async()=>data});
   const result=await gate.check({principal,serverOrder:order(channel,30),receipt:'fixture-token-001'});
   assert.equal(result.providerVerified,false);assert.equal(result.realEntitlement,false);
   assert.notEqual(result.evidenceMatched,true);
  }
 }
});
test('catalog integrity and merchant configuration are enforced',async()=>{
 assert.throws(()=>makeProviderConnectionGate({channel:'UNKNOWN',catalog}),/UNKNOWN_CHANNEL/);
 assert.throws(()=>makeProviderConnectionGate({channel:'MYKET',catalog:[...catalog.slice(0,4),catalog[0]]}),/INVALID_CATALOG/);
 const gate=makeProviderConnectionGate({channel:'MYKET',catalog,merchantApproved:false,
   queryOfficialProvider:async()=>{throw Error('must not call');}});
 const r=await gate.check({principal,serverOrder:order('MYKET',30),receipt:'fixture-token-001'});
 assert.equal(r.reason,'OFFICIAL_PROVIDER_NOT_CONFIGURED');
});
