'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {fetchWithRetry,retryableNetworkError}=require('./pwa-asset-retry-v125.cjs');

const response=(status)=>({status,ok:status>=200&&status<300});

test('retries one transient HTTP 503 and succeeds on second attempt',async()=>{
 let calls=0,waits=0;
 const result=await fetchWithRetry(async()=>++calls===1?response(503):response(200),'https://example.test/a.js',{},{
  delayMs:1,wait:async()=>{waits++;}
 });
 assert.equal(result.response.status,200);
 assert.equal(result.attempts,2);
 assert.equal(calls,2);
 assert.equal(waits,1);
});

test('does not retry permanent HTTP 404',async()=>{
 let calls=0;
 await assert.rejects(fetchWithRetry(async()=>{calls++;return response(404);},'https://example.test/missing.js',{},{
  wait:async()=>{throw Error('must not wait');}
 }),/HTTP 404/);
 assert.equal(calls,1);
});

test('retries transient network error once',async()=>{
 let calls=0;
 const result=await fetchWithRetry(async()=>{
  calls++;
  if(calls===1)throw Object.assign(new TypeError('temporary network failure'),{cause:{code:'UND_ERR_CONNECT_TIMEOUT'}});
  return response(200);
 },'https://example.test/a.css',{}, {wait:async()=>{}});
 assert.equal(result.response.status,200);
 assert.equal(result.attempts,2);
});

test('does not classify arbitrary application errors as transient',()=>{
 assert.equal(retryableNetworkError(new Error('invalid content type')),false);
 assert.equal(retryableNetworkError(Object.assign(new Error('not found'),{code:'ENOENT'})),false);
});
