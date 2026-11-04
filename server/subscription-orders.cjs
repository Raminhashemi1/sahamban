'use strict';
/*
 * SERVER-ONLY payment order contract for a future direct bank PSP adapter.
 * Pure business logic: NOT a merchant integration, public payment endpoint,
 * database, login system or proof of real settlement.
 */
const {randomUUID}=require('node:crypto');
function id(value,label){
 if(typeof value!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value))
  throw new TypeError(label+' نامعتبر است.');
 return value;
}
function time(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))
  throw new TypeError('زمان UTC معتبر لازم است.');
 const ms=Date.parse(value);
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,19)!==value.slice(0,19))
  throw new TypeError('زمان تقویمی نامعتبر است.');
 return ms;
}
const PLAN='SAHAMBAN_PRO_ANNUAL';
function createPendingOrder({userId,priceRial,now,orderId=randomUUID()}){
 id(userId,'شناسه حساب');
 id(orderId,'شناسه سفارش');
 time(now);
 if(!Number.isSafeInteger(priceRial)||priceRial<=0)
  throw new RangeError('قیمت ریالی باید عدد صحیح مثبت و معتبر باشد.');
 // priceRial comes ONLY from a trusted server-side price catalog, NOT user input.
 return Object.freeze({orderId,userId,planId:PLAN,amountRial:priceRial,currency:'IRR',
  createdAt:now,state:'PENDING',providerPaymentId:null,paidAt:null});
}
function checkOrder(order){
 if(!order||typeof order!=='object'||Array.isArray(order))throw new TypeError('سفارش نامعتبر است.');
 id(order.orderId,'شناسه سفارش');id(order.userId,'شناسه حساب');
 if(order.planId!==PLAN||order.currency!=='IRR'||!Number.isSafeInteger(order.amountRial)||order.amountRial<=0)
  throw new TypeError('مشخصات قیمت یا پلن سفارش نامعتبر است.');
 time(order.createdAt);
 if(!['PENDING','SETTLED'].includes(order.state))throw new TypeError('وضعیت سفارش نامعتبر است.');
 if(order.state==='PENDING'&&(order.providerPaymentId!==null||order.paidAt!==null))
  throw new TypeError('سفارش تسویه‌نشده دارای رسید نامعتبر است.');
 if(order.state==='SETTLED'){
  id(order.providerPaymentId,'شناسه پرداخت');
  time(order.paidAt);
 }
}
function reconcileVerifiedReceipt(order,receipt,{verifyAtProvider,now}={}){
 checkOrder(order);
 if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))
  throw new TypeError('رسید نامعتبر است.');
 if(typeof verifyAtProvider!=='function')
  throw new Error('استعلام معتبر درگاه بانکی از سمت سرور الزامی است.');
 const paymentId=id(receipt.paymentId,'شناسه پرداخت'),paidAt=time(receipt.paidAt),reference=time(now);
 if(receipt.orderId!==order.orderId||receipt.userId!==order.userId||
    receipt.planId!==PLAN||receipt.currency!=='IRR'||receipt.amountRial!==order.amountRial)
  throw new Error('رسید با سفارش و مبلغ ثبت‌شده تطابق ندارد.');
 if(paidAt>reference+300000||paidAt<time(order.createdAt)-300000)
  throw new Error('زمان تسویه با سفارش معتبر تطابق ندارد.');
 // The backend PSP adapter must verify orderId, amount/currency, merchant,
 // final successful state and unique provider transaction directly with PSP.
 // A client-supplied {success:true}, query parameter or callback cannot satisfy this.
 if(verifyAtProvider({order,receipt})!==true)
  throw new Error('تسویه نزد درگاه بانکی تأیید نشد.');
 if(order.state==='SETTLED'){
  if(order.providerPaymentId!==paymentId||order.paidAt!==receipt.paidAt)
   throw new Error('سفارش قبلاً با تراکنش متفاوتی تسویه شده است.');
  return {order,applied:false,reason:'ALREADY_SETTLED'};
 }
 return {order:Object.freeze({...order,state:'SETTLED',providerPaymentId:paymentId,paidAt:receipt.paidAt}),
  applied:true,reason:'PROVIDER_VERIFIED'};
}
module.exports=Object.freeze({createPendingOrder,reconcileVerifiedReceipt,checkOrder,PLAN});
