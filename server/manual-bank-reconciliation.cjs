'use strict';
/*
 * SERVER-ONLY manual bank-transfer reconciliation domain model.
 * This module cannot inspect a bank account or verify a transfer itself.
 * Only a trusted backend may call reconcileManualTransfer AFTER an
 * authenticated administrator independently checks the actual bank ledger.
 * Never accept receipt screenshots, client claims or browser callbacks as proof.
 */
const {randomUUID}=require('node:crypto');
const {checkOrder}=require('./subscription-orders.cjs');
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
function validId(x,label){if(typeof x!=='string'||!ID.test(x))throw new TypeError(label+' نامعتبر است.');return x;}
function validTime(x,label){if(typeof x!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,3})?Z$/.test(x))throw new TypeError(label+' باید زمان UTC باشد.');const n=Date.parse(x);if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,19)!==x.slice(0,19))throw new TypeError(label+' نامعتبر است.');return n;}
function createPendingTransfer({order,now,reference=randomUUID()}){
 checkOrder(order);validTime(now,'زمان سرور');validId(reference,'شناسه پیگیری');
 if(order.state!=='PENDING')throw new Error('فقط سفارش در انتظار پرداخت می‌تواند انتقال بانکی بگیرد.');
 return Object.freeze({reference,orderId:order.orderId,userId:order.userId,amountRial:order.amountRial,currency:'IRR',createdAt:now,state:'AWAITING_BANK_RECONCILIATION',bankTransactionId:null,verifiedAt:null,verifiedBy:null});
}
function reconcileManualTransfer(transfer,{order,bankRecord,admin,now,verifyBankRecord}={}){
 if(!transfer||typeof transfer!=='object'||Array.isArray(transfer))throw new TypeError('درخواست انتقال نامعتبر است.');
 validId(transfer.reference,'شناسه پیگیری');checkOrder(order);validTime(now,'زمان سرور');
 if(!admin||admin.authenticated!==true||admin.role!=='PAYMENT_RECONCILER')throw new Error('دسترسی مدیر مجاز برای تطبیق بانکی لازم است.');
 validId(admin.userId,'شناسه مدیر');
 if(transfer.orderId!==order.orderId||transfer.userId!==order.userId||transfer.amountRial!==order.amountRial||transfer.currency!=='IRR')throw new Error('انتقال با سفارش تطابق ندارد.');
 if(order.state!=='PENDING'||transfer.state!=='AWAITING_BANK_RECONCILIATION')throw new Error('وضعیت سفارش یا انتقال برای تطبیق معتبر نیست.');
 if(!bankRecord||typeof bankRecord!=='object'||Array.isArray(bankRecord))throw new TypeError('سند تراکنش بانکی لازم است.');
 const bankId=validId(bankRecord.transactionId,'شناسه تراکنش بانکی'),bookedAt=validTime(bankRecord.bookedAt,'زمان ثبت بانکی');
 if(bankRecord.amountRial!==order.amountRial||bankRecord.currency!=='IRR'||bankRecord.direction!=='CREDIT'||bankRecord.status!=='SETTLED')throw new Error('مبلغ، واحد پول یا وضعیت واریز بانکی معتبر نیست.');
 if(bookedAt<validTime(order.createdAt,'زمان سفارش')-300000||bookedAt>validTime(now,'زمان سرور')+300000)throw new Error('زمان تراکنش بانکی با سفارش تطابق ندارد.');
 if(typeof verifyBankRecord!=='function'||verifyBankRecord(bankRecord,order)!==true)throw new Error('تراکنش باید مستقلاً با گردش حساب واقعی بانک تطبیق داده شود.');
 return Object.freeze({...transfer,state:'MANUALLY_VERIFIED',bankTransactionId:bankId,verifiedAt:now,verifiedBy:admin.userId});
}
module.exports=Object.freeze({createPendingTransfer,reconcileManualTransfer});