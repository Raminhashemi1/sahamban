'use strict';
/*
 * Pure SERVER-ONLY bridge: a manually verified settled bank credit can prepare
 * a paid annual order + entitlement transition. It NEVER persists changes.
 * Caller MUST authenticate/authorize the admin, independently verify the bank
 * ledger, atomically persist all returned state + unique IDs in one DB
 * transaction, and enforce uniqueness across every customer/account.
 * NOT a payment endpoint, a bank integration or deployable frontend.
 */
const {reconcileManualTransfer}=require('./manual-bank-reconciliation.cjs');
const {reconcileVerifiedReceipt}=require('./subscription-orders.cjs');
const {applyVerifiedEvent}=require('./subscription-entitlements.cjs');
function prepareManualSettlement({order,transfer,entitlement,bankRecord,admin,eventId,now,verifyBankRecord}={}){
 if(!entitlement||entitlement.userId!==order?.userId)
  throw new Error('شناسه حساب سفارش و اشتراک باید مطابقت داشته باشد.');
 if(typeof eventId!=='string'||!eventId.trim())
  throw new TypeError('شناسه یکتای رخداد تسویه الزامی است.');
 const verifiedTransfer=reconcileManualTransfer(transfer,{order,bankRecord,admin,now,verifyBankRecord});
 const receipt={orderId:order.orderId,userId:order.userId,planId:order.planId,
   currency:order.currency,amountRial:order.amountRial,
   paymentId:verifiedTransfer.bankTransactionId,paidAt:bankRecord.bookedAt};
 const verifiedOrder=reconcileVerifiedReceipt(order,receipt,{
  verifyAtProvider:({receipt:r})=>r.paymentId===verifiedTransfer.bankTransactionId&&
   verifiedTransfer.state==='MANUALLY_VERIFIED',now
 });
 if(!verifiedOrder.applied)throw new Error('تسویه تکراری یا نامعتبر است.');
 const event={type:'PAYMENT_SETTLED',userId:order.userId,eventId,
  paymentId:verifiedTransfer.bankTransactionId,occurredAt:bankRecord.bookedAt};
 const grant=applyVerifiedEvent(entitlement,event,{
  verifyProviderEvent:e=>e.eventId===eventId&&e.paymentId===verifiedTransfer.bankTransactionId&&
    verifiedOrder.order.state==='SETTLED',now
 });
 if(!grant.applied)throw new Error('تراکنش اشتراک قبلاً اعمال شده است.');
 return Object.freeze({order:verifiedOrder.order,transfer:verifiedTransfer,
   entitlement:grant.state,verifiedEvent:event,
   requiresAtomicCommit:true,accessGrantedOnThisObjectOnly:true});
}
module.exports=Object.freeze({prepareManualSettlement});
