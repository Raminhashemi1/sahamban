'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {settle}=require('../server/billing/settlement.cjs');

const now='2026-01-01T00:00:00.000Z';
const expiry='2026-02-01T00:00:00.000Z';
const input={orderId:'ord_'+'a'.repeat(32),subject:'pilot-user',
 planId:'SAHAMBAN_PRO_30D',bazaarOrderId:'bazaar-order',tokenHash:'a'.repeat(64),
 verifiedExpiresAt:expiry,autoRenewing:true,now};
function fakeDb(order,{batchChanges=1,updateChanges=1}={}){
 const calls=[];
 return {
  calls,
  prepare(sql){return {sql,bind(...values){return {sql,values,
   first:async()=>order,
   run:async()=>({success:true,meta:{changes:updateChanges}})
  }}}},
  async batch(statements){
   calls.push(statements);
   return statements.map(()=>({success:true,meta:{changes:batchChanges}}));
  }
 };
}
test('first verified purchase atomically creates paid order, access and event',async()=>{
 const db=fakeDb({id:'order',user_id:'u1',status:'CREATED',plan_id:input.planId,purchase_token_hash:null,expires_at:null});
 const result=await settle(db,input);
 assert.deepEqual(result,{ok:true,restored:false,expiresAt:expiry});
 assert.equal(db.calls.length,1);
 assert.equal(db.calls[0].length,3);
 assert.match(db.calls[0][0].sql,/status='PAID'/);
 assert.match(db.calls[0][1].sql,/INSERT INTO billing_access/);
 assert.match(db.calls[0][2].sql,/INSERT INTO billing_events/);
});
test('same receipt is idempotent and does not create a second event',async()=>{
 const db=fakeDb({id:'order',user_id:'u1',status:'PAID',plan_id:input.planId,
  purchase_token_hash:input.tokenHash,expires_at:expiry});
 const result=await settle(db,input);
 assert.deepEqual(result,{ok:true,restored:true,expiresAt:expiry});
 assert.equal(db.calls.length,0);
});
test('new provider token for same signed order is recorded as a renewal',async()=>{
 const db=fakeDb({id:'order',user_id:'u1',status:'PAID',plan_id:input.planId,
  purchase_token_hash:'b'.repeat(64),expires_at:expiry});
 const result=await settle(db,{...input,tokenHash:'c'.repeat(64),
  verifiedExpiresAt:'2026-03-01T00:00:00.000Z'});
 assert.deepEqual(result,{ok:true,restored:true,expiresAt:'2026-03-01T00:00:00.000Z'});
 assert.equal(db.calls.length,1);
 assert.equal(db.calls[0].length,3);
 assert.match(db.calls[0][0].sql,/purchase_token_hash/);
 assert.match(db.calls[0][2].sql,/PURCHASE_VERIFIED/);
});
test('expired provider access and unknown plans fail closed',async()=>{
 const db=fakeDb({id:'order',user_id:'u1',status:'CREATED',plan_id:input.planId,purchase_token_hash:null,expires_at:null});
 assert.equal((await settle(db,{...input,verifiedExpiresAt:'2025-12-01T00:00:00.000Z'})).error,'INVALID_VERIFIED_SUBSCRIPTION');
 assert.equal((await settle(db,{...input,planId:'UNKNOWN'})).error,'INVALID_VERIFIED_SUBSCRIPTION');
 assert.equal(db.calls.length,0);
});
test('partial D1 batch results never report an active entitlement',async()=>{
 const db=fakeDb({id:'order',user_id:'u1',status:'CREATED',plan_id:input.planId,purchase_token_hash:null,expires_at:null},{batchChanges:0});
 const result=await settle(db,input);
 assert.equal(result.ok,false);
 assert.equal(result.error,'SETTLEMENT_FAILED');
});
