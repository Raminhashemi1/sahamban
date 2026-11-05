'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createPendingOrder}=require('../server/subscription-orders.cjs');
const {emptyEntitlement,accessDecision}=require('../server/subscription-entitlements.cjs');
const {createPendingTransfer}=require('../server/manual-bank-reconciliation.cjs');
const {prepareManualSettlement}=require('../server/manual-subscription-settlement.cjs');
function fixture(){
 const now='2026-11-05T10:00:00.000Z',
  order=createPendingOrder({orderId:'order-1',userId:'user-1',priceRial:1800000,now:'2026-11-05T09:00:00.000Z'}),
  transfer=createPendingTransfer({order,now:'2026-11-05T09:01:00.000Z',reference:'manual-1'}),
  entitlement=emptyEntitlement('user-1'),
  bankRecord={transactionId:'real-bank-tx-1',amountRial:1800000,currency:'IRR',direction:'CREDIT',status:'SETTLED',bookedAt:'2026-11-05T09:30:00.000Z'},
  admin={authenticated:true,role:'PAYMENT_RECONCILER',userId:'admin-1'};
 return {order,transfer,entitlement,bankRecord,admin,now,eventId:'unique-event-1',verifyBankRecord:()=>true};
}
test('real-ledger-verified manual settlement yields a consistent annual entitlement proposal',()=>{
 const f=fixture(),out=prepareManualSettlement(f);
 assert.equal(out.order.state,'SETTLED');
 assert.equal(out.order.providerPaymentId,f.bankRecord.transactionId);
 assert.equal(out.transfer.state,'MANUALLY_VERIFIED');
 assert.equal(out.entitlement.paidUntil,'2027-11-05T09:30:00.000Z');
 assert.equal(out.verifiedEvent.paymentId,f.bankRecord.transactionId);
 assert.equal(out.requiresAtomicCommit,true);
 assert.equal(accessDecision(out.entitlement,{now:f.now}).proEnabled,true);
 assert.equal(f.entitlement.paidUntil,null);
 assert.equal(f.order.state,'PENDING');
 assert.equal(f.transfer.state,'AWAITING_BANK_RECONCILIATION');
});
test('never issue paid entitlement on receipt images, client confirmation or unverified bank records',()=>{
 const f=fixture();
 assert.throws(()=>prepareManualSettlement({...f,verifyBankRecord:()=>false}),/مستقلاً/);
 assert.throws(()=>prepareManualSettlement({...f,verifyBankRecord:undefined}),/مستقلاً/);
 assert.throws(()=>prepareManualSettlement({...f,admin:{...f.admin,role:'USER'}}),/دسترسی مدیر/);
 assert.throws(()=>prepareManualSettlement({...f,bankRecord:{...f.bankRecord,status:'PENDING'}}),/وضعیت واریز/);
 assert.equal(f.entitlement.paidUntil,null);
});
test('no cross-account grants, amount modifications, or duplicated bank events',()=>{
 const f=fixture();
 assert.throws(()=>prepareManualSettlement({...f,entitlement:emptyEntitlement('other-user')}),/مطابقت/);
 assert.throws(()=>prepareManualSettlement({...f,bankRecord:{...f.bankRecord,amountRial:1}}),/مبلغ/);
 assert.throws(()=>prepareManualSettlement({...f,eventId:''}),/یکتای/);
 const first=prepareManualSettlement(f);
 assert.throws(()=>prepareManualSettlement({...f,entitlement:first.entitlement}),/تراکنش اشتراک قبلاً اعمال/);
});
test('manual settlement states are never persisted by the pure coordinator',()=>{
 const f=fixture(),out=prepareManualSettlement(f);
 assert.equal(out.accessGrantedOnThisObjectOnly,true);
 assert.deepEqual(f.entitlement.settledPaymentIds,[]);
 assert.deepEqual(out.entitlement.settledPaymentIds,['real-bank-tx-1']);
});
