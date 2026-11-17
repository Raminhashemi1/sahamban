'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {requestPayment,verifyPayment,PROVIDER}=require('../server/zarinpal-gateway.cjs');
const env={ZARINPAL_MERCHANT_ID:'123e4567-e89b-12d3-a456-426614174000'};
const order={id:'ord_'+'a'.repeat(32),amountRial:1500000,currency:'IRR'};
function fetchWith(data,seen=[]){return async(url,opts)=>{seen.push({url,body:JSON.parse(opts.body)});return {ok:true,json:async()=>data};};}
test('creates request with server-owned IRR amount and valid authority',async()=>{
 const seen=[],out=await requestPayment({env,order,callbackUrl:'https://api.example.com/api/v1/payments/zarinpal/callback',fetchImpl:fetchWith({data:{code:100,authority:'A'.repeat(36)}},seen)});
 assert.equal(out.provider,PROVIDER);assert.equal(out.paymentUrl,'https://www.zarinpal.com/pg/StartPay/'+'A'.repeat(36));
 assert.equal(seen[0].url,'https://api.zarinpal.com/pg/v4/payment/request.json');
 assert.equal(seen[0].body.amount,1500000);assert.equal(seen[0].body.currency,'IRR');assert.equal(seen[0].body.metadata.order_id,order.id);
 assert.equal(seen[0].body.merchant_id,env.ZARINPAL_MERCHANT_ID);
});
test('verifies amount, reference and fresh-success code before returning trusted receipt',async()=>{
 const out=await verifyPayment({env,authority:'B'.repeat(36),amountRial:1500000,fetchImpl:fetchWith({data:{code:100,amount:1500000,ref_id:987654321}})});
 assert.deepEqual(out,{verified:true,providerName:'ZARINPAL',providerEventId:'zarinpal:'+'B'.repeat(36),providerPaymentId:'987654321',authority:'B'.repeat(36),amountRial:1500000,currency:'IRR'});
});
test('fails closed for already-verified, wrong amount and provider errors',async()=>{
 await assert.rejects(()=>verifyPayment({env,authority:'B'.repeat(36),amountRial:1500000,fetchImpl:fetchWith({data:{code:101,amount:1500000,ref_id:1}})}),/ALREADY_VERIFIED/);
 await assert.rejects(()=>verifyPayment({env,authority:'B'.repeat(36),amountRial:1500000,fetchImpl:fetchWith({data:{code:100,amount:100,ref_id:1}})}),/NOT_VERIFIED/);
 await assert.rejects(()=>requestPayment({env,order,callbackUrl:'http://insecure.example/cb',fetchImpl:fetchWith({data:{code:100,authority:'A'.repeat(36)}})}),/INVALID_CALLBACK_URL/);
});
test('does not operate without merchant configuration or accepts malformed order',async()=>{
 await assert.rejects(()=>requestPayment({env:{},order,callbackUrl:'https://api.example.com/cb'}),/NOT_CONFIGURED/);
 await assert.rejects(()=>requestPayment({env,order:{...order,amountRial:1},callbackUrl:'https://api.example.com/cb'}),/INVALID_ORDER/);
});

test('uses sandbox endpoints for both request and verification only when explicitly enabled',async()=>{
 const sandboxEnv={...env,ZARINPAL_SANDBOX:'true'};
 const requestSeen=[];
 const request=await requestPayment({env:sandboxEnv,order,callbackUrl:'https://api.example.com/api/v1/payments/zarinpal/callback',
  fetchImpl:fetchWith({data:{code:100,authority:'S'.repeat(36)}},requestSeen)});
 assert.equal(requestSeen[0].url,'https://sandbox.zarinpal.com/pg/v4/payment/request.json');
 assert.equal(request.paymentUrl,'https://sandbox.zarinpal.com/pg/StartPay/'+'S'.repeat(36));
 const verifySeen=[];
 const receipt=await verifyPayment({env:sandboxEnv,authority:'S'.repeat(36),amountRial:1500000,
  fetchImpl:fetchWith({data:{code:100,amount:1500000,ref_id:123456789}},verifySeen)});
 assert.equal(verifySeen[0].url,'https://sandbox.zarinpal.com/pg/v4/payment/verify.json');
 assert.equal(receipt.verified,true);
});
