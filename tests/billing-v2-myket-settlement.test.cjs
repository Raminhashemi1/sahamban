'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {settleMyket}=require('../server/billing/settlement.cjs');

const now='2026-01-01T00:00:00.000Z';
const purchaseTime='2026-01-01T00:00:00.000Z';
const orderId='ord_'+'c'.repeat(32);
const tokenHash='d'.repeat(64);
function fakeDb(order){
 const calls=[];
 return {
  calls,
  prepare(sql){return {sql,bind(...values){calls.push({sql,values});return {sql,values,
   async first(){
    if(sql.includes('SELECT expires_at FROM billing_access'))return {expires_at:order.expires_at};
    return order;
   }
  };}}},
  async batch(statements){
   const [update,event,access]=statements;
   assert.match(update.sql,/store='MYKET'/);
   assert.equal(update.values[1],'myket-order-789');
   assert.equal(update.values[2],tokenHash);
   const days=access.values[4];
   const base=order.expires_at&&Date.parse(order.expires_at)>Date.parse(now)?order.expires_at:now;
   order.expires_at=new Date(Date.parse(base)+days*86400000).toISOString();
   order.status='PAID';order.store_order_id='myket-order-789';order.purchase_token_hash=tokenHash;
   return [update,event,access].map(()=>({success:true,meta:{changes:1}}));
  }
 };
}

test('Myket settlement grants one fixed term in the shared access ledger',async()=>{
 const order={id:orderId,user_id:'u1',status:'CREATED',plan_id:'SAHAMBAN_PRO_30D',
  store:'MYKET',store_product_id:'myket_30d',store_order_id:null,purchase_token_hash:null,
  created_at:now,expires_at:null};
 const db=fakeDb(order);
 const result=await settleMyket(db,{orderId,subject:'account-1',planId:'SAHAMBAN_PRO_30D',
  storeOrderId:'myket-order-789',tokenHash,purchaseTime,now});
 assert.equal(result.ok,true);
 assert.equal(result.daysAdded,30);
 assert.equal(result.expiresAt,'2026-01-31T00:00:00.000Z');
 assert.equal(order.status,'PAID');
 assert.equal(db.calls.length,5);
});

test('Myket replay of the same settled order is idempotent',async()=>{
 const expiresAt='2026-01-31T00:00:00.000Z';
 const order={id:orderId,user_id:'u1',status:'PAID',plan_id:'SAHAMBAN_PRO_30D',
  store:'MYKET',store_product_id:'myket_30d',store_order_id:'myket-order-789',
  purchase_token_hash:tokenHash,created_at:now,expires_at:expiresAt};
 const db=fakeDb(order);
 const result=await settleMyket(db,{orderId,subject:'account-1',planId:'SAHAMBAN_PRO_30D',
  storeOrderId:'myket-order-789',tokenHash,purchaseTime,now});
 assert.equal(result.ok,true);
 assert.equal(result.restored,true);
 assert.equal(result.daysAdded,0);
 assert.equal(result.expiresAt,expiresAt);
 assert.equal(db.calls.length,1);
});

test('Myket settlement rejects wrong provider, account, order and token replay',async()=>{
 const order={id:orderId,user_id:'u1',status:'CREATED',plan_id:'SAHAMBAN_PRO_30D',
  store:'BAZAAR',store_product_id:null,store_order_id:null,purchase_token_hash:null,
  created_at:now,expires_at:null};
 const db=fakeDb(order);
 const result=await settleMyket(db,{orderId,subject:'account-1',planId:'SAHAMBAN_PRO_30D',
  storeOrderId:'myket-order-789',tokenHash,purchaseTime,now});
 assert.equal(result.error,'ORDER_MISMATCH');
});
