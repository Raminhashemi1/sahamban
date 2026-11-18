'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PLANS,getPlan}=require('../server/billing/catalog.cjs');
const {createOrder}=require('../server/billing/orders.cjs');

test('Billing V2 defines exactly the five fixed-term plans; prices stay in Bazaar Pishkhan',()=>{
 assert.deepEqual(PLANS.map(x=>[x.id,x.days]),[
  ['SAHAMBAN_PRO_30D',30],['SAHAMBAN_PRO_60D',60],['SAHAMBAN_PRO_90D',90],
  ['SAHAMBAN_PRO_180D',180],['SAHAMBAN_PRO_365D',365]
 ]);
 assert.ok(PLANS.every(x=>!('priceRial' in x)));
 assert.equal(getPlan('UNKNOWN'),null);
});
test('subscription expiry is not calculated locally',()=>{
 assert.equal(require('../server/billing/catalog.cjs').nextExpiry,undefined);
});
test('order creation uses server catalog SKU and never invents a price',async()=>{
 let sql='',values=[];
 const db={prepare(q){sql=q;return {bind(...v){values=v;return {async run(){return {success:true,meta:{changes:1}};}};}};}};
 const result=await createOrder(db,{subject:'user-1',planId:'SAHAMBAN_PRO_90D',
  now:'2026-01-01T00:00:00.000Z',makeId:()=> 'ord_'+'a'.repeat(32)});
 assert.equal(result.status,201);
 assert.equal(result.order.days,90);
 assert.deepEqual(values,['ord_'+'a'.repeat(32),'SAHAMBAN_PRO_90D','2026-01-01T00:00:00.000Z','user-1']);
 assert.match(sql,/INSERT INTO billing_orders/);
});
test('unknown plans and missing authentication cannot create orders',async()=>{
 assert.equal((await createOrder({}, {subject:'user',planId:'bad'})).status,400);
 assert.equal((await createOrder({}, {planId:'SAHAMBAN_PRO_30D'})).status,401);
});
