'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {createStagingServer}=require('../server/sahmino-staging-server.cjs');
const originalClaim={channel:'WEB_DIRECT',planDays:30,
 productId:'sahmino_30',purchaseToken:'synthetic-no-real-purchase'};
async function withServer(fn,options){
 const server=createStagingServer(options);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 const request=(method,path,body,headers={})=>new Promise((resolve,reject)=>{
  const bytes=body===undefined?undefined:Buffer.from(typeof body==='string'?body:JSON.stringify(body));
  const req=http.request({hostname:'127.0.0.1',port,method,path,
   headers:{...(bytes?{'content-type':'application/json'}:{}),...headers}},res=>{
    const data=[];
    res.on('data',chunk=>data.push(chunk));
    res.on('end',()=>{
     try{resolve({status:res.statusCode,headers:res.headers,
      body:JSON.parse(Buffer.concat(data).toString('utf8'))});}
     catch(e){reject(e);}
    });
   });
  req.on('error',reject);
  req.end(bytes);
 });
 try{return await fn(request);}
 finally{await new Promise(resolve=>server.close(resolve));}
}
test('server can be created and binds only in explicit local test',async()=>{
 await withServer(async request=>{
  const r=await request('GET','/healthz');
  assert.equal(r.status,200);assert.equal(r.body.billingEnabled,false);
  assert.equal(r.body.realEntitlement,false);
  assert.equal(r.headers['cache-control'],'no-store');
 });
});
test('five day-plans are visible with no checkout available',async()=>{
 await withServer(async request=>{
  const r=await request('GET','/api/v1/plans');
  assert.equal(r.status,200);assert.deepEqual(r.body.planDays,[30,60,90,180,365]);
  assert.equal(r.body.checkoutEnabled,false);
  assert.equal(r.body.verificationEnabled,false);
 });
});
test('syntactically valid purchase claims never activate billing',async()=>{
 await withServer(async request=>{
  const r=await request('POST','/api/v1/billing/verify',originalClaim,
   {authorization:'synthetic-session-token'});
  assert.equal(r.status,503);
  assert.equal(r.body.providerVerified,false);
  assert.equal(r.body.realEntitlement,false);
  assert.equal(r.body.reason,'SESSION_VERIFICATION_FAILED');
 });
});
test('even injected synthetic authentication never verifies provider receipt',async()=>{
 await withServer(async request=>{
  const r=await request('POST','/api/v1/billing/verify',originalClaim,
   {authorization:'synthetic-session-token'});
  assert.equal(r.status,503);assert.equal(r.body.reason,'PROVIDER_ADAPTER_DISABLED');
  assert.equal(r.body.realEntitlement,false);
 },{buildChannel:'WEB_DIRECT',verifySession:async()=>({authenticated:true,subject:'testonly'})});
});
test('untrusted account and verification flags are rejected',async()=>{
 await withServer(async request=>{
  const r=await request('POST','/api/v1/billing/verify',
   {...originalClaim,accountId:'hijacked',providerVerified:true},
   {authorization:'synthetic-session-token'});
  assert.equal(r.status,503);assert.equal(r.body.reason,'CLIENT_TRUST_ASSERTION_FORBIDDEN');
  assert.equal(JSON.stringify(r.body).includes(originalClaim.purchaseToken),false);
 },{verifySession:async()=>({authenticated:true,subject:'testonly'})});
});
test('reject invalid JSON and wrong content-type',async()=>{
 await withServer(async request=>{
  assert.equal((await request('POST','/api/v1/billing/verify','{')).status,400);
  assert.equal((await request('POST','/api/v1/billing/verify','hi',
   {'content-type':'text/plain'})).status,415);
 });
});
test('reject oversized body before it can invoke verification',async()=>{
 let calls=0;
 await withServer(async request=>{
  const r=await request('POST','/api/v1/billing/verify','x'.repeat(8200));
  assert.equal(r.status,413);assert.equal(calls,0);
 },{verifySession:async()=>{calls++;return {authenticated:true,subject:'testonly'};}});
});
test('unknown routes and unsupported methods expose no payment entrypoints',async()=>{
 await withServer(async request=>{
  assert.equal((await request('POST','/api/v1/checkout',originalClaim)).status,404);
  assert.equal((await request('GET','/api/v1/billing/verify')).status,404);
  assert.equal((await request('GET','/api/v1/refund')).status,404);
 });
});
