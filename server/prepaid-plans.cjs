'use strict';
// Provider-independent prepaid Pro domain rules. NOT a checkout endpoint.
// Amounts are final server-owned catalogue values in IRR; no extra discounts.
const LAUNCH_PLANS=Object.freeze({
 SAHAMBAN_PRO_30D:Object.freeze({days:30,priceRial:1500000}),
 SAHAMBAN_PRO_60D:Object.freeze({days:60,priceRial:2850000}),
 SAHAMBAN_PRO_90D:Object.freeze({days:90,priceRial:4050000}),
 SAHAMBAN_PRO_180D:Object.freeze({days:180,priceRial:7650000}),
 SAHAMBAN_PRO_365D:Object.freeze({days:365,priceRial:14600000})
});
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
function id(value,label){
 if(typeof value!=='string'||!ID.test(value))throw new TypeError(label+' نامعتبر است.');
 return value;
}
function timestamp(value){
 if(typeof value!=='string'||!/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$/.test(value))throw new TypeError('زمان UTC معتبر لازم است.');
 const ms=Date.parse(value);
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,19)!==value.slice(0,19))
  throw new TypeError('زمان تقویمی معتبر لازم است.');
 return ms;
}
function plan(idValue){
 if(!Object.prototype.hasOwnProperty.call(LAUNCH_PLANS,idValue))
  throw new RangeError('شناسه پلن حرفه‌ای نامعتبر است.');
 return LAUNCH_PLANS[idValue];
}
function addDays(utcTime,days){
 const d=new Date(timestamp(utcTime));
 if(!Number.isInteger(days)||days<1||days>3660)throw new RangeError('تعداد روز نامعتبر است.');
 d.setUTCDate(d.getUTCDate()+days);
 return d.toISOString();
}
function emptyPrepaidAccess(userId){
 return {userId:id(userId,'شناسه کاربر'),paidUntil:null,processedReceipts:[]};
}
function checkAccessState(state){
 if(!state||typeof state!=='object'||Array.isArray(state))throw new TypeError('وضعیت اشتراک نامعتبر است.');
 id(state.userId,'شناسه کاربر');
 if(state.paidUntil!==null)timestamp(state.paidUntil);
 if(!Array.isArray(state.processedReceipts))throw new TypeError('سوابق رسید نامعتبر است.');
 for(const key of state.processedReceipts)id(key,'شناسه رسید');
 if(new Set(state.processedReceipts).size!==state.processedReceipts.length)
  throw new TypeError('رسید تکراری در وضعیت اشتراک.');
}
function grantVerifiedPrepaid(state,purchase,{verifyAtProvider,now}={}){
 checkAccessState(state);
 if(typeof verifyAtProvider!=='function')throw new Error('تأیید مستقیم پرداخت سمت سرور لازم است.');
 if(!purchase||typeof purchase!=='object'||Array.isArray(purchase))throw new TypeError('خرید نامعتبر است.');
 const userId=id(purchase.userId,'شناسه کاربر');
 const provider=id(purchase.provider,'شناسه ارائه‌دهنده');
 const paymentId=id(purchase.paymentId,'شناسه تراکنش');
 if(userId!==state.userId)throw new Error('خرید متعلق به حساب دیگری است.');
 const product=plan(purchase.planId);
 if(!Number.isSafeInteger(purchase.amountRial)||purchase.amountRial!==product.priceRial||purchase.currency!=='IRR')
  throw new Error('مبلغ یا ارز خرید با تعرفه تطابق ندارد.');
 const paymentAt=timestamp(purchase.paidAt),reference=timestamp(now);
 if(paymentAt>reference+300000)throw new Error('زمان خرید در آینده است.');
 const uniqueKey=provider+':'+paymentId;
 if(verifyAtProvider({purchase,expectedPlan:product})!==true)
  throw new Error('اصالت پرداخت نزد ارائه‌دهنده تأیید نشده است.');
 if(state.processedReceipts.includes(uniqueKey))
  return {state,applied:false,reason:'ALREADY_APPLIED'};
 const start=state.paidUntil&&timestamp(state.paidUntil)>reference?state.paidUntil:now;
 const next=addDays(start,product.days);
 return {state:{userId:state.userId,paidUntil:next,processedReceipts:[...state.processedReceipts,uniqueKey]},
  applied:true,reason:'PROVIDER_VERIFIED'};
}
function prepaidAccessDecision(state,{now}={}){
 checkAccessState(state);
 const current=timestamp(now);
 return Object.freeze({proEnabled:state.paidUntil!==null&&current<timestamp(state.paidUntil),
  paidUntil:state.paidUntil});
}
module.exports=Object.freeze({LAUNCH_PLANS,plan,addDays,emptyPrepaidAccess,grantVerifiedPrepaid,prepaidAccessDecision});
