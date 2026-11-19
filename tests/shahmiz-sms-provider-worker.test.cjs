'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const worker=require('../server/sms-providers/shahmiz-worker.mjs').default;
const TOKEN='test_shahmiz_api_token_never_use_in_production';

function request(body,{method='POST',path='/send',contentType='application/json'}={}) {
  return new Request('https://internal-sms-provider'+path,{
    method,headers:{'Content-Type':contentType},
    ...((body===undefined||method==='GET'||method==='HEAD')?{}:{body:typeof body==='string'?body:JSON.stringify(body)})
  });
}
const payload={destination:'+989123456789',message:'کد ورود سهمینو: 123456',idempotencyKey:'a'.repeat(48)};

test('maps internal OTP request to Shahmiz documented API and accepts only success:true',async()=>{
  const originalFetch=globalThis.fetch;let call;
  globalThis.fetch=async(url,init)=>{
    call={url,init};
    return new Response(JSON.stringify({success:true,deducted_amount:200,remaining_balance:29800}),{status:200});
  };
  try{
    const response=await worker.fetch(request(payload),{SHAHMIZ_API_TOKEN:TOKEN});
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{accepted:true});
    assert.equal(call.url,'https://shahmiz.ir/api/send-otp.php');
    assert.equal(call.init.method,'POST');
    assert.equal(call.init.headers.Authorization,'Bearer '+TOKEN);
    assert.deepEqual(JSON.parse(call.init.body),{mobile:'09123456789',code:'123456'});
  }finally{globalThis.fetch=originalFetch;}
});

test('provider errors and transport failures fail closed without exposing provider response',async()=>{
  const originalFetch=globalThis.fetch;
  try{
    globalThis.fetch=async()=>new Response(JSON.stringify({success:false,error:'private provider detail'}),{status:200});
    let response=await worker.fetch(request(payload),{SHAHMIZ_API_TOKEN:TOKEN});
    assert.equal(response.status,502);
    assert.deepEqual(await response.json(),{accepted:false,error:'PROVIDER_REJECTED'});
    globalThis.fetch=async()=>{throw Error('network detail');};
    response=await worker.fetch(request(payload),{SHAHMIZ_API_TOKEN:TOKEN});
    assert.equal(response.status,503);
    assert.doesNotMatch(await response.text(),/network detail/);
  }finally{globalThis.fetch=originalFetch;}
});

test('rejects missing secret, malformed destination, code, body, method and route',async()=>{
  assert.equal((await worker.fetch(request(payload),{})).status,503);
  assert.equal((await worker.fetch(request({...payload,destination:'+12025550123'}),{SHAHMIZ_API_TOKEN:TOKEN})).status,400);
  assert.equal((await worker.fetch(request({...payload,message:'hello'}),{SHAHMIZ_API_TOKEN:TOKEN})).status,400);
  assert.equal((await worker.fetch(request(payload,{contentType:'text/plain'}),{SHAHMIZ_API_TOKEN:TOKEN})).status,415);
  assert.equal((await worker.fetch(request(payload,{method:'GET'}),{SHAHMIZ_API_TOKEN:TOKEN})).status,404);
  assert.equal((await worker.fetch(request(payload,{path:'/other'}),{SHAHMIZ_API_TOKEN:TOKEN})).status,404);
});
