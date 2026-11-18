'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {cancelBazaarSubscription}=require('../server/bazaar-subscription-cancellation.cjs');
const base={packageName:'ir.manahesab.sahmino',planId:'SAHMINO_PRO_30D',purchaseToken:'tok_1234567890abcdef',
 clientId:'client',clientSecret:'secret',refreshToken:'refresh'};
test('cancellation obtains OAuth token and calls Bazaar v2 cancellation endpoint',async()=>{
 const calls=[];
 const result=await cancelBazaarSubscription({...base,fetchImpl:async(url,options)=>{
  calls.push({url,options});
  if(calls.length===1)return {ok:true,json:async()=>({access_token:'access',expires_in:3600})};
  if(calls.length===2)return {ok:true,text:async()=>''};
  return {ok:true,json:async()=>({autoRenewing:false,validUntilTimestampMsec:1790000000000})};
 }});
 assert.deepEqual(result,{ok:true,reason:'CANCELLED'});
 assert.equal(calls.length,3);
 assert.equal(calls[0].options.method,'POST');
 assert.match(calls[1].url,/subscriptions\/sahmino_pro_30d\/purchases\/tok_1234567890abcdef\/cancel\//);
 assert.equal(calls[1].options.method,'GET');
 assert.match(calls[2].url,/subscriptions\/sahmino_pro_30d\/purchases\/tok_1234567890abcdef\//);
 assert.equal(calls[2].options.method,'GET');
});
test('provider errors and unsuccessful HTTP responses never confirm cancellation',async()=>{
 let n=0;
 const rejected=await cancelBazaarSubscription({...base,fetchImpl:async()=>++n===1
  ?{ok:true,json:async()=>({access_token:'access',expires_in:3600})}
  :{ok:true,text:async()=>JSON.stringify({error:'invalid_token'})}});
 assert.deepEqual(rejected,{ok:false,reason:'BAZAAR_CANCELLATION_REJECTED'});
 n=0;
 const failed=await cancelBazaarSubscription({...base,fetchImpl:async()=>++n===1
  ?{ok:true,json:async()=>({access_token:'access',expires_in:3600})}
  :{ok:false}});
 assert.deepEqual(failed,{ok:false,reason:'BAZAAR_CANCELLATION_FAILED'});
});
test('invalid configuration is rejected before network calls',async()=>{
 let calls=0;
 const result=await cancelBazaarSubscription({...base,planId:'UNKNOWN',fetchImpl:async()=>{calls++;}});
 assert.equal(result.reason,'BAZAAR_CANCELLATION_NOT_CONFIGURED');assert.equal(calls,0);
});
test('network and malformed response failures fail closed',async()=>{
 let n=0;
 const result=await cancelBazaarSubscription({...base,fetchImpl:async()=>{
  if(++n===1)return {ok:true,json:async()=>({access_token:'access',expires_in:3600})};
  return {ok:true,text:async()=>'not-json'};
 }});
 assert.equal(result.ok,false);assert.equal(result.reason,'BAZAAR_CANCELLATION_INVALID_RESPONSE');
});

test('successful cancellation request is not enough until Bazaar reports autoRenewing false',async()=>{
 let n=0;
 const result=await cancelBazaarSubscription({...base,fetchImpl:async()=>{
  n++;
  if(n===1)return {ok:true,json:async()=>({access_token:'access',expires_in:3600})};
  if(n===2)return {ok:true,text:async()=>''};
  return {ok:true,json:async()=>({autoRenewing:true,validUntilTimestampMsec:1790000000000})};
 }});
 assert.deepEqual(result,{ok:false,reason:'BAZAAR_CANCELLATION_NOT_CONFIRMED'});
 assert.equal(n,3);
});
test('cancellation confirmation API failures remain pending and fail closed',async()=>{
 let n=0;
 const result=await cancelBazaarSubscription({...base,fetchImpl:async()=>{
  n++;
  if(n===1)return {ok:true,json:async()=>({access_token:'access',expires_in:3600})};
  if(n===2)return {ok:true,text:async()=>''};
  return {ok:false};
 }});
 assert.deepEqual(result,{ok:false,reason:'BAZAAR_CANCELLATION_CONFIRMATION_UNAVAILABLE'});
});
