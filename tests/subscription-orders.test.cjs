'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createPendingOrder,reconcileVerifiedReceipt,checkOrder,PLAN}=require('../server/subscription-orders.cjs');
const now='2026-11-04T18:00:00.000Z',later='2026-11-04T18:03:00.000Z';
function order(){return createPendingOrder({userId:'user-1',priceRial:1500000,now,orderId:'ord-1'});}
function receipt(){return {orderId:'ord-1',userId:'user-1',planId:PLAN,amountRial:1500000,currency:'IRR',paymentId:'psp-pay-1',paidAt:later};}
const opts={verifyAtProvider:()=>true,now:'2026-11-04T18:04:00.000Z'};
test('annual checkout order uses integer server catalog price, not browser-supplied totals',()=>{
 const x=order();assert.equal(x.state,'PENDING');assert.equal(x.amountRial,1500000);assert.equal(x.currency,'IRR');assert.equal(Object.isFrozen(x),true);
 assert.throws(()=>createPendingOrder({userId:'u',priceRial:0,now}),/قیمت/);
 assert.throws(()=>createPendingOrder({userId:'u',priceRial:1.5,now}),/قیمت/);
 assert.throws(()=>createPendingOrder({userId:'u',priceRial:Number.MAX_SAFE_INTEGER+1,now}),/قیمت/);
 assert.throws(()=>createPendingOrder({userId:'u',priceRial:10,now:'2026-02-30T00:00:00Z'}),/تقویمی/);
});
test('provider confirmation required before payment transitions out of PENDING',()=>{
 const x=order(),r=receipt();
 assert.throws(()=>reconcileVerifiedReceipt(x,{...r,success:true},{now:opts.now}),/استعلام/);
 assert.throws(()=>reconcileVerifiedReceipt(x,{...r,success:true},{now:opts.now,verifyAtProvider:()=>false}),/تأیید نشد/);
 assert.equal(x.state,'PENDING');
 const verified=reconcileVerifiedReceipt(x,r,opts);
 assert.equal(verified.applied,true);assert.equal(verified.order.state,'SETTLED');
 assert.equal(verified.order.providerPaymentId,'psp-pay-1');assert.equal(verified.order.paidAt,later);
});
test('fake amount, other account, wrong currency, mismatched order and plan rejected before provider check',()=>{
 const variants=[{amountRial:2},{userId:'other'},{currency:'IRT'},{orderId:'ord-2'},{planId:'MONTHLY'}];
 for(const patch of variants){let invoked=false;
  assert.throws(()=>reconcileVerifiedReceipt(order(),{...receipt(),...patch},{now:opts.now,verifyAtProvider:()=>{invoked=true;return true;}}),/تطابق/);
  assert.equal(invoked,false);
 }
});
test('receipt replay does not renew subscription twice, conflicting settlement is rejected',()=>{
 const s=reconcileVerifiedReceipt(order(),receipt(),opts).order;
 const duplicate=reconcileVerifiedReceipt(s,receipt(),opts);
 assert.equal(duplicate.applied,false);assert.equal(duplicate.reason,'ALREADY_SETTLED');
 assert.throws(()=>reconcileVerifiedReceipt(s,{...receipt(),paymentId:'different' },opts),/متفاوت/);
});
test('receipt timestamps must be credible and order cannot be silently forged as settled',()=>{
 assert.throws(()=>reconcileVerifiedReceipt(order(),{...receipt(),paidAt:'2027-01-01T00:00:00Z'},opts),/زمان/);
 assert.throws(()=>reconcileVerifiedReceipt(order(),{...receipt(),paidAt:'2026-11-01T00:00:00Z'},opts),/زمان/);
 assert.throws(()=>reconcileVerifiedReceipt(order(),{...receipt(),paidAt:'2026-02-30T00:00:00Z'},opts),/تقویمی/);
 assert.throws(()=>checkOrder({...order(),state:'SETTLED'}),/شناسه/);
});
