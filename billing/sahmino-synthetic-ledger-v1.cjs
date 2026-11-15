'use strict';
// SYNTHETIC ONLY. No provider API, no production verification, no real entitlement.
// In-memory immutable event ledger: NOT durable, atomic or safe for concurrent servers.
const {PLAN_DAYS,CHANNELS}=require('./sahmino-subscription-simulation-v1.cjs');
const DAY=86400000;
const validId=x=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(x)&&!['__proto__','constructor','prototype'].includes(x);
function utc(x){
 if(typeof x!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z$/.test(x))throw new TypeError('INVALID_UTC');
 const n=Date.parse(x),normalized=x.includes('.')?x:x.replace('Z','.000Z');
 if(!Number.isFinite(n)||new Date(n).toISOString()!==normalized)throw new TypeError('INVALID_UTC');
 return n;
}
const initialState=()=>Object.freeze({simulationOnly:true,events:Object.freeze([])});
function check(s){
 if(!s||s.simulationOnly!==true||!Array.isArray(s.events)||!Object.isFrozen(s.events))throw new TypeError('INVALID_SYNTHETIC_LEDGER');
}
function append(s,event){
 return Object.freeze({simulationOnly:true,events:Object.freeze([...s.events,Object.freeze(event)])});
}
function syntheticBuy({state,accountId,channel,purchaseId,planDays,atUtc,fixtureResult}={}){
 check(state);
 if(!validId(accountId)||!validId(purchaseId)||!CHANNELS.includes(channel)||!PLAN_DAYS.includes(planDays))throw new TypeError('INVALID_PURCHASE');
 utc(atUtc);
 if(fixtureResult!=='APPROVED'&&fixtureResult!=='DECLINED')throw new TypeError('FIXTURE_RESULT_REQUIRED');
 const key=channel+':'+purchaseId;
 const prior=state.events.find(e=>e.type==='BUY'&&e.key===key);
 if(prior){
  if(prior.accountId!==accountId||prior.planDays!==planDays)throw new Error('PURCHASE_KEY_CONFLICT');
  return Object.freeze({state,applied:false,reason:'DUPLICATE_FIXTURE'});
 }
 if(fixtureResult==='DECLINED')return Object.freeze({state,applied:false,reason:'DECLINED_FIXTURE'});
 const next=append(state,{type:'BUY',key,accountId,channel,purchaseId,planDays,atUtc,source:'SYNTHETIC_APPROVAL_NOT_PROVIDER_VERIFIED'});
 return Object.freeze({state:next,applied:true,simulationOnly:true});
}
function syntheticRefund({state,accountId,channel,purchaseId,atUtc}={}){
 check(state);
 if(!validId(accountId)||!validId(purchaseId)||!CHANNELS.includes(channel))throw new TypeError('INVALID_REFUND');
 utc(atUtc);
 const key=channel+':'+purchaseId;
 const purchase=state.events.find(e=>e.type==='BUY'&&e.key===key);
 if(!purchase)throw new Error('UNKNOWN_FIXTURE_PURCHASE');
 if(purchase.accountId!==accountId)throw new Error('ACCOUNT_CONFLICT');
 if(utc(atUtc)<utc(purchase.atUtc))throw new Error('REFUND_BEFORE_PURCHASE');
 if(state.events.some(e=>e.type==='REFUND'&&e.key===key))return Object.freeze({state,applied:false,reason:'DUPLICATE_REFUND'});
 return Object.freeze({state:append(state,{type:'REFUND',key,accountId,atUtc,source:'SYNTHETIC_REFUND_NOT_PROVIDER_VERIFIED'}),applied:true,simulationOnly:true});
}
function syntheticBalance(state,accountId,atUtc){
 check(state);
 if(!validId(accountId))throw new TypeError('INVALID_ACCOUNT');
 const at=utc(atUtc);
 const refunded=new Set(state.events.filter(e=>e.type==='REFUND'&&utc(e.atUtc)<=at).map(e=>e.key));
 const buys=state.events.filter(e=>e.type==='BUY'&&e.accountId===accountId&&utc(e.atUtc)<=at&&!refunded.has(e.key))
  .sort((a,b)=>utc(a.atUtc)-utc(b.atUtc)||a.key.localeCompare(b.key));
 let until=null;
 for(const e of buys){
  const start=Math.max(utc(e.atUtc),until===null?utc(e.atUtc):until);
  const next=start+e.planDays*DAY;
  if(!Number.isFinite(next)||next>8640000000000000)throw new RangeError('INVALID_EXPIRY');
  until=next;
 }
 return Object.freeze({simulationOnly:true,accountId,syntheticActive:until!==null&&until>at,expiresAtUtc:until===null?null:new Date(until).toISOString(),acceptedFixtureCount:buys.length,realEntitlement:false});
}
module.exports=Object.freeze({initialState,syntheticBuy,syntheticRefund,syntheticBalance});
