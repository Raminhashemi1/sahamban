'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createMyketOrder,parseStoreSkuMap}=require('../server/billing/orders.cjs');

const map=JSON.stringify({
 SAHAMBAN_PRO_30D:'myket_30d',SAHAMBAN_PRO_60D:'myket_60d',
 SAHAMBAN_PRO_90D:'myket_90d',SAHAMBAN_PRO_180D:'myket_180d',
 SAHAMBAN_PRO_365D:'myket_365d'
});

test('Myket SKU map requires all five unique product IDs',()=>{
 assert.ok(parseStoreSkuMap(map));
 assert.equal(parseStoreSkuMap('{}'),null);
 assert.equal(parseStoreSkuMap(JSON.stringify({
  SAHAMBAN_PRO_30D:'same',SAHAMBAN_PRO_60D:'same',
  SAHAMBAN_PRO_90D:'x',SAHAMBAN_PRO_180D:'y',SAHAMBAN_PRO_365D:'z'
 })),null);
});

test('Myket order stores the trusted server-selected store and SKU, not client pricing',async()=>{
 let sql='',values=[];
 const db={prepare(query){sql=query;return {bind(...args){values=args;return {
  async run(){return {success:true,meta:{changes:1}};}
 };}};}};
 const result=await createMyketOrder(db,{
  subject:'user-1',planId:'SAHAMBAN_PRO_90D',now:'2026-01-01T00:00:00.000Z',
  makeId:()=> 'ord_'+'b'.repeat(32),skuMap:map
 });
 assert.equal(result.status,201);
 assert.deepEqual(result.order,{id:'ord_'+'b'.repeat(32),planId:'SAHAMBAN_PRO_90D',days:90,store:'MYKET'});
 assert.match(sql,/store,store_product_id,created_at/);
 assert.deepEqual(values,['ord_'+'b'.repeat(32),'SAHAMBAN_PRO_90D','myket_90d',
  '2026-01-01T00:00:00.000Z','user-1']);
});

test('Myket order fails closed if SKU map is absent or user is unauthenticated',async()=>{
 assert.equal((await createMyketOrder({},{
  subject:'user',planId:'SAHAMBAN_PRO_30D',skuMap:null
 })).status,503);
 assert.equal((await createMyketOrder({},{
  planId:'SAHAMBAN_PRO_30D',skuMap:map
 })).status,401);
});
