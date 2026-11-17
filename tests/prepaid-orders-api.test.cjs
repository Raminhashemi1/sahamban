'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createPrepaidOrder,findPrepaidPendingOrder,INSERT_SQL}=require('../server/prepaid-orders-api.cjs');
const now='2026-11-12T10:00:00.000Z',subject='oidc|issuer:user-123',orderId='ord_'+'a'.repeat(32);
function dbFor({changes=1,row=null,error=null}={}){const calls=[];return {calls,prepare(sql){calls.push(['sql',sql]);return {bind(...args){calls.push(['bind',...args]);return {async run(){if(error)throw error;return {success:true,meta:{changes}};},async first(){if(error)throw error;return row;}};}};}};}
test('creates pending orders for all five plans with server-owned final prices',async()=>{
 const plans=[['SAHAMBAN_PRO_30D',1500000],['SAHAMBAN_PRO_60D',2850000],['SAHAMBAN_PRO_90D',4050000],['SAHAMBAN_PRO_180D',7650000],['SAHAMBAN_PRO_365D',14600000]];
 for(const [planId,amountRial] of plans){const db=dbFor(),out=await createPrepaidOrder(db,{authenticatedSubject:subject,planId,now,makeOrderId:()=>orderId});
  assert.equal(out.status,201);assert.equal(out.order.amountRial,amountRial);assert.equal(out.checkoutEnabled,false);assert.equal(out.proEnabled,false);
  assert.match(db.calls[0][1],/sahmino_prepaid_subscription_orders/);
  assert.deepEqual(db.calls[1],['bind',orderId,planId,amountRial,now,subject]);
 }
});
test('rejects unauthenticated, legacy or unknown plans, invalid time, bad ID and missing DB',async()=>{
 assert.equal((await createPrepaidOrder(dbFor(),{planId:'SAHAMBAN_PRO_30D',now})).reason,'NOT_AUTHENTICATED');
 assert.equal((await createPrepaidOrder(dbFor(),{authenticatedSubject:subject,planId:'SAHAMBAN_PRO_3M',now,makeOrderId:()=>orderId})).reason,'INVALID_PLAN');
 assert.equal((await createPrepaidOrder(dbFor(),{authenticatedSubject:subject,planId:'SAHAMBAN_PRO_30D',now:'bad',makeOrderId:()=>orderId})).reason,'SERVER_TIME_UNAVAILABLE');
 assert.equal((await createPrepaidOrder(dbFor(),{authenticatedSubject:subject,planId:'SAHAMBAN_PRO_30D',now,makeOrderId:()=>'bad'})).reason,'ORDER_ID_UNAVAILABLE');
 assert.equal((await createPrepaidOrder(null,{authenticatedSubject:subject,planId:'SAHAMBAN_PRO_30D',now,makeOrderId:()=>orderId})).reason,'DATABASE_UNAVAILABLE');
});
test('inactive account and pending-order uniqueness fail closed',async()=>{
 assert.equal((await createPrepaidOrder(dbFor({changes:0}),{authenticatedSubject:subject,planId:'SAHAMBAN_PRO_30D',now,makeOrderId:()=>orderId})).reason,'ACCOUNT_NOT_ELIGIBLE');
 assert.equal((await createPrepaidOrder(dbFor({error:new Error('unique index')}),{authenticatedSubject:subject,planId:'SAHAMBAN_PRO_30D',now,makeOrderId:()=>orderId})).reason,'ORDER_UNAVAILABLE');
});
test('retrieves only matching pending Sahmino order and never enables checkout',async()=>{
 const row={id:orderId,plan_id:'SAHAMBAN_PRO_90D',amount_rial:4050000,currency:'IRR',created_at:now};
 const db=dbFor({row}),out=await findPrepaidPendingOrder(db,subject);
 assert.equal(out.pending,true);assert.equal(out.order.planId,row.plan_id);assert.equal(out.checkoutEnabled,false);assert.equal(out.proEnabled,false);
 assert.deepEqual(db.calls[1],['bind',subject]);
});
test('no order and malformed pending order fail closed',async()=>{
 assert.equal((await findPrepaidPendingOrder(dbFor({row:null}),subject)).pending,false);
 assert.equal((await findPrepaidPendingOrder(dbFor({row:{id:orderId,plan_id:'SAHAMBAN_PRO_30D',amount_rial:1,currency:'IRR',created_at:now}}),subject)).reason,'INVALID_ORDER_STATE');
 assert.equal((await findPrepaidPendingOrder(null,subject)).reason,'DATABASE_UNAVAILABLE');
 assert.match(INSERT_SQL,/u\.auth_subject=\?/);
});
