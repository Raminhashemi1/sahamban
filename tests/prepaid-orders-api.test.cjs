'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createPrepaidOrder,findPrepaidPendingOrder,INSERT_SQL}=require('../server/prepaid-orders-api.cjs');
const now='2026-11-12T10:00:00.000Z',subject='oidc|issuer:user-123',orderId='ord_'+'a'.repeat(32);
function dbFor({changes=1,row=null,error=null}={}){const calls=[];return {calls,prepare(sql){calls.push(['sql',sql]);return {bind(...args){calls.push(['bind',...args]);return {async run(){if(error)throw error;return {success:true,meta:{changes}};},async first(){if(error)throw error;return row;}};}};}};}
test('creates pending orders for all five plans with server-owned final prices',async()=>{
 const plans=[['SAHMINO_PRO_30D',1500000],['SAHMINO_PRO_60D',2850000],['SAHMINO_PRO_90D',4050000],['SAHMINO_PRO_180D',7650000],['SAHMINO_PRO_365D',14600000]];
 for(const [planId,amountRial] of plans){const db=dbFor(),out=await createPrepaidOrder(db,{authenticatedSubject:subject,planId,now,makeOrderId:()=>orderId});
  assert.equal(out.status,201);assert.equal(out.order.amountRial,amountRial);assert.equal(out.checkoutEnabled,false);assert.equal(out.proEnabled,false);
  assert.match(db.calls[0][1],/sahmino_prepaid_subscription_orders/);
  assert.deepEqual(db.calls[1],['bind',orderId,planId,amountRial,now,'MANUAL',null,null,subject]);
 }
});
test('rejects unauthenticated, legacy or unknown plans, invalid time, bad ID and missing DB',async()=>{
 assert.equal((await createPrepaidOrder(dbFor(),{planId:'SAHMINO_PRO_30D',now})).reason,'NOT_AUTHENTICATED');
 assert.equal((await createPrepaidOrder(dbFor(),{authenticatedSubject:subject,planId:'SAHAMBAN_PRO_3M',now,makeOrderId:()=>orderId})).reason,'INVALID_PLAN');
 assert.equal((await createPrepaidOrder(dbFor(),{authenticatedSubject:subject,planId:'SAHMINO_PRO_30D',now:'bad',makeOrderId:()=>orderId})).reason,'SERVER_TIME_UNAVAILABLE');
 assert.equal((await createPrepaidOrder(dbFor(),{authenticatedSubject:subject,planId:'SAHMINO_PRO_30D',now,makeOrderId:()=>'bad'})).reason,'ORDER_ID_UNAVAILABLE');
 assert.equal((await createPrepaidOrder(null,{authenticatedSubject:subject,planId:'SAHMINO_PRO_30D',now,makeOrderId:()=>orderId})).reason,'DATABASE_UNAVAILABLE');
});
test('inactive account and pending-order uniqueness fail closed',async()=>{
 assert.equal((await createPrepaidOrder(dbFor({changes:0}),{authenticatedSubject:subject,planId:'SAHMINO_PRO_30D',now,makeOrderId:()=>orderId})).reason,'ACCOUNT_NOT_ELIGIBLE');
 assert.equal((await createPrepaidOrder(dbFor({error:new Error('unique index')}),{authenticatedSubject:subject,planId:'SAHMINO_PRO_30D',now,makeOrderId:()=>orderId})).reason,'ORDER_UNAVAILABLE');
});
test('retrieves only matching pending Sahmino order and never enables checkout',async()=>{
 const row={id:orderId,plan_id:'SAHMINO_PRO_90D',amount_rial:4050000,currency:'IRR',created_at:now};
 const db=dbFor({row}),out=await findPrepaidPendingOrder(db,subject);
 assert.equal(out.pending,true);assert.equal(out.order.planId,row.plan_id);assert.equal(out.checkoutEnabled,false);assert.equal(out.proEnabled,false);
 assert.deepEqual(db.calls[1],['bind',subject]);
});
test('no order and malformed pending order fail closed',async()=>{
 assert.equal((await findPrepaidPendingOrder(dbFor({row:null}),subject)).pending,false);
 assert.equal((await findPrepaidPendingOrder(dbFor({row:{id:orderId,plan_id:'SAHMINO_PRO_30D',amount_rial:1,currency:'IRR',created_at:now}}),subject)).reason,'INVALID_ORDER_STATE');
 assert.equal((await findPrepaidPendingOrder(null,subject)).reason,'DATABASE_UNAVAILABLE');
 assert.match(INSERT_SQL,/u\.auth_subject=\?/);
});

test('OTP internal user ID creates and retrieves orders using only the internal account key',async()=>{
 const userId='usr_'+'b'.repeat(32),db=dbFor(),created=await createPrepaidOrder(db,{authenticatedUserId:userId,planId:'SAHMINO_PRO_30D',now,makeOrderId:()=>orderId});
 assert.equal(created.status,201);
 assert.deepEqual(db.calls[1],['bind',orderId,'SAHMINO_PRO_30D',1500000,now,'MANUAL',null,null,userId]);
 assert.match(db.calls[0][1],/u\.id=\?/);
 const pending=await findPrepaidPendingOrder(dbFor({row:{id:orderId,plan_id:'SAHMINO_PRO_30D',amount_rial:1500000,currency:'IRR',created_at:now}}),null,userId);
 assert.equal(pending.pending,true);
});
test('invalid client-supplied internal account IDs are never accepted',async()=>{
 const db=dbFor(),out=await createPrepaidOrder(db,{authenticatedUserId:'usr_client_supplied',planId:'SAHMINO_PRO_30D',now,makeOrderId:()=>orderId});
 assert.equal(out.status,401);assert.equal(db.calls.length,0);
});

test('automatic renewal requires a versioned explicit consent and records server time',async()=>{
 const db=dbFor(),out=await createPrepaidOrder(db,{authenticatedUserId:'usr_'+'c'.repeat(32),
  planId:'SAHMINO_PRO_90D',renewalMode:'AUTO',consentVersion:'sahmino-auto-renew-v1',
  now,makeOrderId:()=>orderId});
 assert.equal(out.status,201);
 assert.equal(out.order.renewalMode,'AUTO');
 assert.equal(out.order.consentVersion,'sahmino-auto-renew-v1');
 assert.equal(out.order.consentAt,now);
 assert.deepEqual(db.calls[1],['bind',orderId,'SAHMINO_PRO_90D',4050000,now,'AUTO','sahmino-auto-renew-v1',now,'usr_'+'c'.repeat(32)]);
 assert.equal((await createPrepaidOrder(dbFor(),{authenticatedSubject:subject,planId:'SAHMINO_PRO_30D',
  renewalMode:'AUTO',now,makeOrderId:()=>orderId})).reason,'EXPLICIT_RENEWAL_CONSENT_REQUIRED');
 assert.equal((await createPrepaidOrder(dbFor(),{authenticatedSubject:subject,planId:'SAHMINO_PRO_30D',
  renewalMode:'MANUAL',consentVersion:'sahmino-auto-renew-v1',now,makeOrderId:()=>orderId})).reason,'UNEXPECTED_RENEWAL_CONSENT');
});
