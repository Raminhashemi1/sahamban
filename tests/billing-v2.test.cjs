'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PLANS,getPlan,nextExpiry}=require('../server/billing/catalog.cjs');
const {createOrder}=require('../server/billing/orders.cjs');

test('Billing V2 defines exactly the five fixed-day IRR plans',()=>{
 assert.deepEqual(PLANS.map(x=>[x.id,x.days,x.priceRial]),[
  ['SAHAMBAN_PRO_30D',30,1500000],['SAHAMBAN_PRO_60D',60,2850000],
  ['SAHAMBAN_PRO_90D',90,4050000],['SAHAMBAN_PRO_180D',180,7650000],
  ['SAHAMBAN_PRO_365D',365,14600000]
 ]);
 assert.equal(getPlan('UNKNOWN'),null);
});
test('fixed-term extension adds exact 24-hour days to remaining access',()=>{
 assert.equal(nextExpiry(null,'2026-01-01T00:00:00.000Z',30),'2026-01-31T00:00:00.000Z');
 assert.equal(nextExpiry('2026-02-01T00:00:00.000Z','2026-01-01T00:00:00.000Z',30),'2026-03-03T00:00:00.000Z');
 assert.throws(()=>nextExpiry(null,'not-a-date',30));
});
test('order creation uses server catalog price and ignores client-supplied amount',async()=>{
 let sql='',values=[];
 const db={prepare(q){sql=q;return {bind(...v){values=v;return {async run(){return {success:true,meta:{changes:1}};}};}};}};
 const result=await createOrder(db,{subject:'user-1',planId:'SAHAMBAN_PRO_90D',
  now:'2026-01-01T00:00:00.000Z',makeId:()=> 'ord_'+'a'.repeat(32),amountRial:1});
 assert.equal(result.status,201);
 assert.equal(result.order.amountRial,4050000);
 assert.equal(result.order.currency,'IRR');
 assert.equal(values[2],4050000);
 assert.match(sql,/INSERT INTO billing_orders/);
});
test('unknown plans and missing authentication cannot create orders',async()=>{
 assert.equal((await createOrder({}, {subject:'user',planId:'bad'})).status,400);
 assert.equal((await createOrder({}, {planId:'SAHAMBAN_PRO_30D'})).status,401);
});
