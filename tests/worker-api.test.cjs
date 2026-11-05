'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
globalThis.crypto ||= webcrypto;
const SECRET='this_is_a_private_random_64_character_test_secret_in_ci_only_2026';
const subject='pilot|account:alpha',origin='https://raminhashemi1.github.io';
const row={user_id:'u1',account_status:'ACTIVE',paid_until:'2099-11-05T07:00:00.000Z',suspended:0,auto_renew_cancelled:0};
function db(value=row){const calls=[];return {calls,prepare(q){calls.push(['sql',q]);return {bind(s){calls.push(['bound',s]);return {async first(){if(value instanceof Error)throw value;return value;}};}};}};}
function enc(x){return Buffer.from(JSON.stringify(x)).toString('base64url');}
async function signedToken(payloadPatch={},headerPatch={}){
 const now=Math.floor(Date.now()/1000);
 const header=enc({alg:'HS256',typ:'JWT',...headerPatch});
 const payload=enc({iss:'sahamban-pilot',aud:'sahamban-api',sub:subject,jti:'unique-pilot-token',iat:now-5,nbf:now-5,exp:now+300,...payloadPatch});
 const input=header+'.'+payload;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(input))).toString('base64url');
 return input+'.'+signature;
}
async function api(){return import('../server/worker-api.mjs');}
function req(token,path='/api/v1/me/entitlement',requestOrigin=origin,method='GET'){
 return new Request('https://worker.example'+path,{method,headers:{...(requestOrigin===null?{}:{Origin:requestOrigin}),...(token?{Authorization:'Bearer '+token}:{})}});
}
function env(DB=db()){return {PWA_ORIGIN:origin,AUTH_HMAC_SECRET:SECRET,SAHAMBAN_DB:DB};}
test('verified pilot JWT reads only account-bound entitlement via prepared D1 query',async()=>{
 const worker=(await api()).default,storage=db();
 const reply=await worker.fetch(req(await signedToken()),env(storage));
 assert.equal(reply.status,200);
 assert.equal(reply.headers.get('Access-Control-Allow-Origin'),origin);
 assert.match(reply.headers.get('Cache-Control'),/no-store/);
 assert.equal((await reply.json()).proEnabled,true);
 assert.deepEqual(storage.calls[1],['bound',subject]);
 assert.match(storage.calls[0][1],/WHERE u.auth_subject=\?/);
});
test('missing/forged/expired/wrong issuer/wrong algorithm/long tokens all fail closed',async()=>{
 const worker=(await api()).default;
 const good=await signedToken();
 const invalid=[null,good.slice(0,-2)+'xx',await signedToken({exp:Math.floor(Date.now()/1000)-1}),
  await signedToken({aud:'someone-else'}),await signedToken({iss:'fake'}),
  await signedToken({exp:Math.floor(Date.now()/1000)+7200}),await signedToken({sub:'bad space'}),
  await signedToken({}, {alg:'none'}),await signedToken({}, {crit:'b64'}),
  'invalid','x'.repeat(6000)];
 for(const token of invalid){const storage=db();const response=await worker.fetch(req(token),env(storage));assert.equal(response.status,401);assert.equal(storage.calls.length,0);}
});
test('cross-origin CORS and query spoofing blocked before entitlement lookup',async()=>{
 const worker=(await api()).default,token=await signedToken();
 for(const request of [req(token,'/api/v1/me/entitlement','https://evil.example'),req(token,'/api/v1/me/entitlement?user=u2')]){
  const storage=db(),result=await worker.fetch(request,env(storage));assert.ok([400,403].includes(result.status));assert.equal(storage.calls.length,0);
 }
 const preflight=await worker.fetch(new Request('https://worker.example/api/v1/me/entitlement',{method:'OPTIONS',headers:{Origin:origin}}),env());
 assert.equal(preflight.status,204);
 assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
});
test('no DB, suspended, expired, bad status, invalid expiration or DB failures deny paid access',async()=>{
 const worker=(await api()).default,token=await signedToken();
 const cases=[[undefined,503], [null,403],[{...row,suspended:1},403],[{...row,paid_until:'2020-01-01T00:00:00.000Z'},403],
  [{...row,account_status:'CLOSED'},403],[{...row,paid_until:'2026-02-30T00:00:00.000Z'},503],
  [{...row,auto_renew_cancelled:'0'},503],[new Error('down'),503]];
 for(const [data,status] of cases){
  const storage=data===undefined?undefined:db(data),e=env(storage);
  if(data===undefined)e.SAHAMBAN_DB=undefined;
  const reply=await worker.fetch(req(token),e);
  assert.equal(reply.status,status);
  assert.equal((await reply.json()).proEnabled,false);
 }
});
test('health only advertises disabled payments; unsupported methods and routes never accept checkout',async()=>{
 const worker=(await api()).default;
 const health=await worker.fetch(req(null,'/api/v1/health'),env());
 assert.deepEqual(await health.json(),{status:'prototype',paymentsEnabled:false,checkoutEnabled:false});
 assert.equal((await worker.fetch(req(null,'/api/v1/checkout'),env())).status,404);
 assert.equal((await worker.fetch(req(null,'/api/v1/me/entitlement',origin,'POST'),env())).status,405);
});
