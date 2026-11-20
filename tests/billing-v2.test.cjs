'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PLANS,getPlan}=require('../server/billing/catalog.cjs');
const {createOrder}=require('../server/billing/orders.cjs');
test('Billing V2 defines exactly five fixed-day plans with approved IRR prices',()=>{
 assert.deepEqual(PLANS.map(x=>[x.id,x.days,x.priceRial]),[
  ['SAHAMBAN_PRO_30D',30,1500000],['SAHAMBAN_PRO_60D',60,2850000],
  ['SAHAMBAN_PRO_90D',90,4050000],['SAHAMBAN_PRO_180D',180,7650000],
  ['SAHAMBAN_PRO_365D',365,14600000]
 ]);
 assert.equal(getPlan('UNKNOWN'),null);
});
test('order creation persists and returns the authoritative server IRR price',async()=>{
 let sql='',values=[];
 const db={prepare(q){sql=q;return {bind(...v){values=v;return {async run(){return {success:true,meta:{changes:1}};}};}};}};
 const result=await createOrder(db,{subject:'user-1',planId:'SAHAMBAN_PRO_90D',now:'2026-01-01T00:00:00.000Z',makeId:()=> 'ord_'+'a'.repeat(32)});
 assert.equal(result.status,201);
 assert.deepEqual(result.order,{id:'ord_'+'a'.repeat(32),planId:'SAHAMBAN_PRO_90D',days:90,priceRial:4050000});
 assert.deepEqual(values,['ord_'+'a'.repeat(32),'SAHAMBAN_PRO_90D',4050000,'2026-01-01T00:00:00.000Z','user-1']);
 assert.match(sql,/amount_irr/);
});
test('unknown plans and missing authentication cannot create orders',async()=>{
 assert.equal((await createOrder({}, {subject:'user',planId:'bad'})).status,400);
 assert.equal((await createOrder({}, {planId:'SAHAMBAN_PRO_30D'})).status,401);
});
