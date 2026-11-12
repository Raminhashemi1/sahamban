'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createPrepaidOrder,findPrepaidPendingOrder,INSERT_SQL}=require('../server/prepaid-orders-api.cjs');
const now='2026-11-12T10:00:00.000Z',subject='oidc|issuer:user-123',orderId='ord_'+'a'.repeat(32);
function dbFor({changes=1,row=null,error=null}={}){
 const calls=[];
 return {calls,prepare(sql){calls.push(['sql',sql]);return {bind(...args){calls.push(['bind',...args]);return {
  async run(){if(error)throw error;return {success:true,meta:{changes}};},
  async first(){if(error)throw error;return row;}
 };}};}};
}
test('creates a pending order with server catalog price for each of four plans',async()=>{
 const plans=[['SAHAMBAN_PRO_3M',4500000],['SAHAMBAN_PRO_6M',8550000],
 ['SAHAMBAN_PRO_9M',12150000],['SAHAMBAN_PRO_12M',15300000]];
 for(const [planId,amountRial] of plans){
  const db=dbFor(),out=await createPrepaidOrder(db,{authenticatedSubject:subject,planId,now,makeOrderId:()=>orderId});
  assert.equal(out.status,201);assert.equal(out.order.amountRial,amountRial);
  assert.equal(out.checkoutEnabled,false);assert.equal(out.proEnabled,false);
  assert.match(db.calls[0][1],/FROM sahamban_users u/);
  assert.deepEqual(db.calls[1],['bind',orderId,planId,amountRial,now,subject]);
 }
});
test('rejects unauthenticated, invalid plan, invalid time, bad order ID and missing DB',async()=>{
 assert.equal((await createPrepaidOrder(dbFor(),{planId:'SAHAMBAN_PRO_3M',now})).reason,'NOT_AUTHENTICATED');
 assert.equal((await createPrepaidOrder(dbFor(),{authenticatedSubject:subject,planId:'ANNUAL',now,makeOrderId:()=>orderId})).reason,'INVALID_PLAN');
 assert.equal((await createPrepaidOrder(dbFor(),{authenticatedSubject:subject,planId:'SAHAMBAN_PRO_3M',now:'bad',makeOrderId:()=>orderId})).reason,'SERVER_TIME_UNAVAILABLE');
 assert.equal((await createPrepaidOrder(dbFor(),{authenticatedSubject:subject,planId:'SAHAMBAN_PRO_3M',now,makeOrderId:()=>'bad'})).reason,'ORDER_ID_UNAVAILABLE');
 assert.equal((await createPrepaidOrder(null,{authenticatedSubject:subject,planId:'SAHAMBAN_PRO_3M',now,makeOrderId:()=>orderId})).reason,'DATABASE_UNAVAILABLE');
});
test('inactive account and pending-order uniqueness fail closed',async()=>{
 const inactive=await createPrepaidOrder(dbFor({changes:0}),{authenticatedSubject:subject,planId:'SAHAMBAN_PRO_3M',now,makeOrderId:()=>orderId});
 assert.equal(inactive.reason,'ACCOUNT_NOT_ELIGIBLE');
 const duplicate=await createPrepaidOrder(dbFor({error:new Error('unique index')}),{authenticatedSubject:subject,planId:'SAHAMBAN_PRO_3M',now,makeOrderId:()=>orderId});
 assert.equal(duplicate.reason,'ORDER_UNAVAILABLE');
});
test('retrieves only a matching pending order and never enables checkout',async()=>{
 const row={id:orderId,plan_id:'SAHAMBAN_PRO_9M',amount_rial:12150000,currency:'IRR',created_at:now};
 const db=dbFor({row}),out=await findPrepaidPendingOrder(db,subject);
 assert.equal(out.pending,true);assert.equal(out.order.planId,row.plan_id);
 assert.equal(out.checkoutEnabled,false);assert.equal(out.proEnabled,false);
 assert.deepEqual(db.calls[1],['bind',subject]);
});
test('no order and malformed order state fail closed',async()=>{
 const none=await findPrepaidPendingOrder(dbFor({row:null}),subject);
 assert.equal(none.pending,false);assert.equal(none.proEnabled,false);
 const bad=await findPrepaidPendingOrder(dbFor({row:{id:orderId,plan_id:'SAHAMBAN_PRO_3M',amount_rial:1,currency:'IRR',created_at:now}}),subject);
 assert.equal(bad.reason,'INVALID_ORDER_STATE');
 assert.equal(await findPrepaidPendingOrder(null,subject).then(x=>x.reason),'DATABASE_UNAVAILABLE');
 assert.match(INSERT_SQL,/u\.auth_subject=\?/);
});
