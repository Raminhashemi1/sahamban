'use strict';
// SYNTHETIC-ONLY: pure arithmetic demo. Never use this module to authorize
// features, grant real entitlements, verify receipts, or process money.
const PLAN_DAYS=Object.freeze([30,60,90,180,365]);
const CHANNELS=Object.freeze(['CAFEBAZAAR','MYKET','GOOGLE_PLAY','WEB_DIRECT']);
const DAY_MS=86400000;
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9:_-]{1,128}$/.test(x);
function cleanUtc(x){
 if(typeof x!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z$/.test(x))throw new TypeError('INVALID_UTC');
 const n=Date.parse(x);
 if(!Number.isFinite(n)||new Date(n).toISOString()!==new Date(x).toISOString())throw new TypeError('INVALID_UTC');
 return n;
}
function newSyntheticState(){return Object.freeze({simulationOnly:true,ledger:Object.freeze([]),expiries:Object.freeze({})});}
function simulatePurchase({state,accountId,channel,planDays,purchaseId,nowUtc}={}){
 if(!state||state.simulationOnly!==true||!Array.isArray(state.ledger)||!state.expiries||typeof state.expiries!=='object')
  throw new TypeError('NOT_SYNTHETIC_STATE');
 if(!id(accountId)||!id(purchaseId)||!CHANNELS.includes(channel)||!PLAN_DAYS.includes(planDays))
  throw new TypeError('INVALID_SYNTHETIC_PURCHASE');
 const now=cleanUtc(nowUtc);
 const ledgerKey=channel+':'+purchaseId;
 const previous=state.ledger.find(x=>x.key===ledgerKey);
 if(previous){
  if(previous.accountId!==accountId||previous.planDays!==planDays)throw new Error('REPLAY_OR_CONFLICT');
  return Object.freeze({state,applied:false,reason:'DUPLICATE_SYNTHETIC_PURCHASE'});
 }
 const oldExpiry=state.expiries[accountId];
 const anchor=Math.max(now,oldExpiry===undefined?now:cleanUtc(oldExpiry));
 const nextMs=anchor+planDays*DAY_MS;
 if(!Number.isFinite(nextMs)||nextMs>8640000000000000)throw new RangeError('INVALID_EXPIRY');
 const expiresAtUtc=new Date(nextMs).toISOString();
 const event=Object.freeze({key:ledgerKey,accountId,channel,planDays,expiresAtUtc,
  simulationOnly:true,source:'SYNTHETIC_FIXTURE_NOT_PROVIDER_VERIFIED'});
 const nextState=Object.freeze({simulationOnly:true,
  ledger:Object.freeze([...state.ledger,event]),
  expiries:Object.freeze({...state.expiries,[accountId]:expiresAtUtc})});
 return Object.freeze({state:nextState,applied:true,expiresAtUtc,
  simulationOnly:true,reason:'SYNTHETIC_ACCOUNTING_ONLY'});
}
module.exports=Object.freeze({PLAN_DAYS,CHANNELS,newSyntheticState,simulatePurchase});
