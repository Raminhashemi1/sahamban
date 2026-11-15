'use strict';
// Release evidence validator only. NEVER authorizes checkout, payments or entitlements.
const {CHANNELS,PLAN_DAYS}=require('./sahmino-channel-policy-v1.cjs');
const allowedStatus=['PASS','BLOCKED','NOT_CHECKED'];
const requiredProof=['merchantEligibility','providerVerification','refundAndReplay','sandboxPurchase','legalAndPrivacy'];
function assessFourChannelLaunch(inventory){
 const failures=[];
 if(!inventory||typeof inventory!=='object'||Array.isArray(inventory))
  return Object.freeze({ready:false,failures:Object.freeze(['MISSING_INVENTORY']),checkedChannels:0});
 if(!inventory.channels||typeof inventory.channels!=='object')
  return Object.freeze({ready:false,failures:Object.freeze(['MISSING_CHANNELS']),checkedChannels:0});
 for(const channel of CHANNELS){
  const entry=inventory.channels[channel];
  if(!entry||typeof entry!=='object'){failures.push(channel+':MISSING');continue;}
  if(!Array.isArray(entry.products)||entry.products.length!==PLAN_DAYS.length){
   failures.push(channel+':MISSING_FIVE_PRODUCTS');continue;
  }
  const seen=new Set();
  for(const days of PLAN_DAYS){
   const p=entry.products.find(x=>x&&x.days===days);
   if(!p||seen.has(days)||typeof p.sku!=='string'||!/^[a-zA-Z0-9._-]{3,128}$/.test(p.sku)||
       !Number.isSafeInteger(p.priceMinor)||p.priceMinor<=0||typeof p.currency!=='string'||
       !/^[A-Z]{3}$/.test(p.currency)){
    failures.push(channel+':INVALID_PRODUCT_'+days);continue;
   }
   seen.add(days);
  }
  if(entry.products.some(x=>!PLAN_DAYS.includes(x?.days)))failures.push(channel+':EXTRA_PERIOD');
  if(new Set(entry.products.map(x=>x?.sku)).size!==entry.products.length)
   failures.push(channel+':DUPLICATE_SKU');
  for(const proof of requiredProof){
   const ev=entry.evidence?.[proof];
   if(!ev||!allowedStatus.includes(ev.status)||ev.status!=='PASS'||
    typeof ev.reference!=='string'||ev.reference.trim().length<8)
    failures.push(channel+':UNVERIFIED_'+proof);
  }
 }
 if(Object.keys(inventory.channels).some(c=>!CHANNELS.includes(c)))
  failures.push('UNKNOWN_CHANNEL');
 return Object.freeze({ready:failures.length===0,checkedChannels:CHANNELS.length,
  failures:Object.freeze(failures)});
}
module.exports=Object.freeze({assessFourChannelLaunch,requiredProof});
