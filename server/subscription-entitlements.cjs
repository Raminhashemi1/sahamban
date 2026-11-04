'use strict';
/*
 * Pro 1.0 — SERVER-ONLY annual entitlement state machine.
 * No provider integration, login, database or secrets in this module.
 * A backend MUST verify a settlement/refund directly with the payment provider
 * before calling applyVerifiedEvent(). NEVER trust browser callbacks, query
 * strings, client-side timestamps, or a boolean "verified" from the browser.
 * Store state and provider payment/event IDs transactionally with UNIQUE indexes.
 * Do not import this module into the public PWA or ship gateway credentials.
 */
const assertId=(value,label)=>{
 if(typeof value!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value))
  throw new TypeError(label+' باید شناسه معتبر و غیرخالی باشد.');
 return value;
};
function instant(value,label){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))
  throw new TypeError(label+' باید زمان UTC معتبر باشد.');
 const ms=Date.parse(value);
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,19)!==value.slice(0,19))
  throw new TypeError(label+' تاریخ واقعی و معتبر لازم دارد.');
 return ms;
}
function addCalendarYear(utcTime){
 const d=new Date(instant(utcTime,'تاریخ شروع'));
 const year=d.getUTCFullYear()+1,month=d.getUTCMonth(),day=d.getUTCDate();
 const lastDay=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 d.setUTCFullYear(year,month,Math.min(day,lastDay));
 return d.toISOString();
}
function emptyEntitlement(userId){
 return {userId:assertId(userId,'شناسه کاربر'),paidUntil:null,
  autoRenewCancelled:false,suspended:false,processedEventIds:[],settledPaymentIds:[]};
}
function validateState(s){
 if(!s||typeof s!=='object'||Array.isArray(s))throw new TypeError('حالت اشتراک نامعتبر است.');
 assertId(s.userId,'شناسه کاربر');
 if(s.paidUntil!==null)instant(s.paidUntil,'زمان انقضا');
 if(typeof s.autoRenewCancelled!=='boolean'||typeof s.suspended!=='boolean'||
  !Array.isArray(s.processedEventIds)||!Array.isArray(s.settledPaymentIds))
  throw new TypeError('ساختار حالت اشتراک نامعتبر است.');
 for(const id of s.processedEventIds)assertId(id,'شناسه رخداد');
 for(const id of s.settledPaymentIds)assertId(id,'شناسه پرداخت');
 if(new Set(s.processedEventIds).size!==s.processedEventIds.length||
    new Set(s.settledPaymentIds).size!==s.settledPaymentIds.length)
  throw new TypeError('فهرست رخدادهای اشتراک تکراری است.');
}
function applyVerifiedEvent(state,event,{verifyProviderEvent,now}={}){
 validateState(state);
 if(typeof verifyProviderEvent!=='function')
  throw new Error('تأیید مستقیم از ارائه‌دهنده پرداخت در سمت سرور الزامی است.');
 if(!event||typeof event!=='object'||Array.isArray(event))
  throw new TypeError('رخداد پرداخت نامعتبر است.');
 const userId=assertId(event.userId,'شناسه کاربر'),
  eventId=assertId(event.eventId,'شناسه رخداد'),
  paymentId=assertId(event.paymentId,'شناسه تراکنش'),
  at=instant(event.occurredAt,'زمان رخداد'),
  reference=instant(now,'زمان سرور');
 if(userId!==state.userId)throw new Error('رخداد متعلق به حساب دیگری است.');
 if(at>reference+300000)throw new Error('زمان رخداد آینده و تأییدنشده است.');
 if(!['PAYMENT_SETTLED','REFUND_SETTLED','CHARGEBACK_CONFIRMED','AUTO_RENEW_CANCELLED'].includes(event.type))
  throw new Error('نوع رخداد پرداخت پشتیبانی نمی‌شود.');
 // The adapter MUST verify exact eventId, paymentId, userId, event type,
 // amount/currency, and settlement/refund status with the provider server-to-server.
 if(verifyProviderEvent(event)!==true)throw new Error('اصالت و تسویه رخداد پرداخت تأیید نشد.');
 if(state.processedEventIds.includes(eventId))return {state:{...state,processedEventIds:[...state.processedEventIds],settledPaymentIds:[...state.settledPaymentIds]},applied:false,reason:'DUPLICATE_EVENT'};
 if(event.type==='PAYMENT_SETTLED'&&state.settledPaymentIds.includes(paymentId))
  throw new Error('تراکنش پرداخت قبلاً ثبت شده؛ تمدید مجدد ممنوع است.');
 if(event.type==='PAYMENT_SETTLED'&&state.suspended)
  throw new Error('حساب تعلیق‌شده نیازمند تطبیق مالی سمت سرور است.');
 if(event.type!=='PAYMENT_SETTLED'&&!state.settledPaymentIds.includes(paymentId))
  throw new Error('برای این رخداد، تراکنش پرداخت ثبت‌شده یافت نشد.');
 const next={...state,processedEventIds:[...state.processedEventIds,eventId],
  settledPaymentIds:[...state.settledPaymentIds]};
 if(event.type==='PAYMENT_SETTLED'){
  const startsAt=state.paidUntil&&instant(state.paidUntil,'زمان انقضا')>at?state.paidUntil:event.occurredAt;
  next.paidUntil=addCalendarYear(startsAt);
  next.autoRenewCancelled=false;
  next.settledPaymentIds.push(paymentId);
 }else if(event.type==='AUTO_RENEW_CANCELLED'){
  next.autoRenewCancelled=true; // Current paid time stays active until expiry.
 }else{
  next.suspended=true; // Fail closed; provider ledger reconciliation is required.
 }
 return {state:next,applied:true,reason:event.type};
}
function accessDecision(state,{now}={}){
 validateState(state);
 const ms=instant(now,'زمان سرور');
 const enabled=!state.suspended&&state.paidUntil!==null&&ms<instant(state.paidUntil,'زمان انقضا');
 return {proEnabled:enabled,reason:state.suspended?'PAYMENT_REVIEW_REQUIRED':state.paidUntil===null?'NO_SUBSCRIPTION':enabled?'ACTIVE':'EXPIRED',paidUntil:state.paidUntil,autoRenewCancelled:state.autoRenewCancelled};
}
module.exports=Object.freeze({emptyEntitlement,applyVerifiedEvent,accessDecision,addCalendarYear});
