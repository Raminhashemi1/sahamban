'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {networkFailureCode}=require('./live-market-network-failure.cjs');
test('transport errors are unverified whether nested or at request level',()=>{
 for(const code of ['UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT',
  'ECONNRESET','ETIMEDOUT','EAI_AGAIN','ENOTFOUND','ECONNREFUSED']){
  assert.equal(networkFailureCode({code}),code);
  assert.equal(networkFailureCode(new Error('fetch failed',{cause:{code}})),code);
 }
 assert.equal(networkFailureCode({name:'AbortError'}),'AbortError');
 assert.equal(networkFailureCode(new Error('fetch aborted',{cause:{name:'AbortError'}})),'AbortError');
});
test('schema, HTTP, JSON and assertion failures are never misclassified as network skips',()=>{
 assert.equal(networkFailureCode(new SyntaxError('invalid JSON')),null);
 assert.equal(networkFailureCode(new Error('TSETMC HTTP 500')),null);
 assert.equal(networkFailureCode({code:'ERR_ASSERTION'}),null);
 assert.equal(networkFailureCode(null),null);
});
