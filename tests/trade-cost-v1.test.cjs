'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {calculateOrderCosts,calculateRoundTrip}=require('../trade-cost-v1.js');
test('100 million rial ordinary-share order matches published ceiling totals',()=>{
 const buy=calculateOrderCosts({side:'BUY',quantity:1000,priceRial:100000});const sell=calculateOrderCosts({side:'SELL',quantity:1000,priceRial:100000});
 assert.equal(buy.grossRial,100000000);assert.equal(buy.feesRial,371200);assert.equal(buy.settlementRial,100371200);assert.equal(sell.feesRial,880000);assert.equal(sell.settlementRial,99120000);
});
test('round-trip P/L includes buy and sell fees and sale tax',()=>{
 const r=calculateRoundTrip({quantity:1000,buyPriceRial:1000,sellPriceRial:1100});assert.equal(r.buy.settlementRial,1003712);assert.equal(r.sell.settlementRial,1090320);assert.equal(r.realizedPnlRial,86608);assert.equal(r.profitable,true);
});
test('component ceilings apply independently and sale tax has no cap',()=>{
 const buy=calculateOrderCosts({side:'BUY',quantity:2000000,priceRial:1000000});const sell=calculateOrderCosts({side:'SELL',quantity:2000000,priceRial:1000000});
 assert.deepEqual(buy.components.map(x=>x.amountRial),[300000000,300000000,160000000,80000000,100000000]);
 assert.deepEqual(sell.components.map(x=>x.amountRial),[300000000,300000000,240000000,120000000,100000000,10000000000]);
 assert.equal(buy.feesRial,940000000);assert.equal(sell.feesRial,11060000000);
});
test('invalid, unsupported and unsafe transaction inputs fail closed',()=>{
 for(const args of [{side:'BUY',quantity:0,priceRial:1000},{side:'BUY',quantity:1.5,priceRial:1000},{side:'HOLD',quantity:1,priceRial:1000},{side:'BUY',quantity:1,priceRial:Number.MAX_SAFE_INTEGER+1},{side:'BUY',quantity:Number.MAX_SAFE_INTEGER,priceRial:2},{side:'BUY',quantity:1,priceRial:1000,instrumentType:'ETF'}])assert.throws(()=>calculateOrderCosts(args));
});
test('loss-making round trip remains negative after all transaction costs',()=>{
 const r=calculateRoundTrip({quantity:500,buyPriceRial:10000,sellPriceRial:9900});assert.ok(r.realizedPnlRial<0);assert.equal(r.profitable,false);
});
