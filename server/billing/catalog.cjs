'use strict';
const PLANS=Object.freeze([
 Object.freeze({id:'SAHAMBAN_PRO_30D',days:30,priceRial:1500000}),
 Object.freeze({id:'SAHAMBAN_PRO_60D',days:60,priceRial:2850000}),
 Object.freeze({id:'SAHAMBAN_PRO_90D',days:90,priceRial:4050000}),
 Object.freeze({id:'SAHAMBAN_PRO_180D',days:180,priceRial:7650000}),
 Object.freeze({id:'SAHAMBAN_PRO_365D',days:365,priceRial:14600000})
]);
const BY_ID=new Map(PLANS.map(p=>[p.id,p]));
function getPlan(id){return BY_ID.get(id)||null;}
function isoMs(value){
 if(typeof value!=='string')throw new TypeError('INVALID_UTC_TIME');
 const ms=Date.parse(value);
 if(!Number.isFinite(ms)||new Date(ms).toISOString()!==value)throw new TypeError('INVALID_UTC_TIME');
 return ms;
}
function nextExpiry(currentPaidUntil,now,days){
 const nowMs=isoMs(now);
 if(!Number.isInteger(days)||days<1||days>365)throw new TypeError('INVALID_TERM');
 const oldMs=currentPaidUntil?isoMs(currentPaidUntil):NaN;
 return new Date((Number.isFinite(oldMs)&&oldMs>nowMs?oldMs:nowMs)+days*86400000).toISOString();
}
module.exports=Object.freeze({PLANS,getPlan,nextExpiry});
