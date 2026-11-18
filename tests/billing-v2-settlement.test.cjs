'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {settle}=require('../server/billing/settlement.cjs');
const now='2026-01-01T00:00:00.000Z';
const purchaseTime=now;
const orderId='ord_'+'a'.repeat(32);
const input={orderId,subject:'pilot-user',planId:'SAHAMBAN_PRO_30D',
 bazaarOrderId:'bazaar-order',tokenHash:'a'.repeat(64),purchaseTime,now};
function fakeDb(order,{batchChanges=1}={}){
 const calls=[];
 return {calls,
  prepare(sql){return {sql,bind(...values){return {sql,values,first:async()=>order}}}},
  async batch(statements){calls.push(statements);return statements.map(()=>({success:true,meta:{changes:batchChanges}}));}
 };
}
test('first verified in-app purchase atomically records payment and grants 30 days manually',async()=>{
 const db=fakeDb({id:'order',user_id:'u1',status:'CREATED',plan_id:input.planId,expires_at:null});
 const result=await settle(db,input);
 assert.deepEqual(result,{ok:true,restored:false,expiresAt:'2026-01-31T00:00:00.000Z',daysAdded:30,renewalMode:'MANUAL'});
 assert.equal(db.calls.length,1);assert.equal(db.calls[0].length,3);
 assert.match(db.calls[0][0].sql,/status='PAID'/);
 assert.match(db.calls[0][1].sql,/auto_renewing=0/);
 assert.match(db.calls[0][2].sql,/PURCHASE_VERIFIED/);
});
test('same Bazaar purchase is idempotent and never grants days twice',async()=>{
 const db=fakeDb({id:'order',user_id:'u1',status:'PAID',plan_id:input.planId,
  purchase_token_hash:input.tokenHash,expires_at:'2026-01-31T00:00:00.000Z'});
 const result=await settle(db,input);
 assert.deepEqual(result,{ok:true,restored:true,expiresAt:'2026-01-31T00:00:00.000Z',daysAdded:0,renewalMode:'MANUAL'});
 assert.equal(db.calls.length,0);
});
test('manual repurchase stacks days on top of current unexpired access',async()=>{
 const db=fakeDb({id:'order2',user_id:'u1',status:'CREATED',plan_id:input.planId,
  expires_at:'2026-02-01T00:00:00.000Z'});
 const result=await settle(db,{...input,orderId:'ord_'+'b'.repeat(32),tokenHash:'b'.repeat(64)});
 assert.equal(result.expiresAt,'2026-03-03T00:00:00.000Z');
 assert.equal(result.daysAdded,30);
});
test('a different purchase token cannot settle an already paid order',async()=>{
 const db=fakeDb({id:'order',user_id:'u1',status:'PAID',plan_id:input.planId,
  purchase_token_hash:'c'.repeat(64),expires_at:'2026-01-31T00:00:00.000Z'});
 assert.equal((await settle(db,input)).error,'ORDER_ALREADY_SETTLED');
 assert.equal(db.calls.length,0);
});
test('expired purchase window, invalid plan and partial database batch fail closed',async()=>{
 const order={id:'order',user_id:'u1',status:'CREATED',plan_id:input.planId,expires_at:null};
 assert.equal((await settle(fakeDb(order),{...input,purchaseTime:'2025-12-01T00:00:00.000Z'})).error,'INVALID_VERIFIED_PURCHASE');
 assert.equal((await settle(fakeDb(order),{...input,planId:'UNKNOWN'})).error,'INVALID_VERIFIED_PURCHASE');
 assert.equal((await settle(fakeDb(order,{batchChanges:0}),input)).error,'SETTLEMENT_FAILED');
});
