'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
globalThis.crypto ||= webcrypto;
const SECRET='this_is_a_private_random_64_character_test_secret_in_ci_only_2026';
const subject='pilot|account:alpha',origin='https://raminhashemi1.github.io';
const activeRow={user_id:'u1',account_status:'ACTIVE',paid_until:'2099-11-05T07:00:00.000Z',auto_renewing:0};
function db(value=activeRow,{changes=1}={}){
 const calls=[];
 return {calls,prepare(sql){calls.push({sql,values:null});return {bind(...values){calls.at(-1).values=values;return {
  async first(){if(value instanceof Error)throw value;return value;},
  async run(){return {success:true,meta:{changes}}}
 };}};}};
}
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
async function worker(){return (await import('../server/worker-api.mjs')).default;}
function request(token,path='/api/v1/me/entitlement',{method='GET',requestOrigin=origin,body,contentType='application/json'}={}){
 return new Request('https://worker.example'+path,{method,headers:{
  ...(requestOrigin===null?{}:{Origin:requestOrigin}),...(token?{Authorization:'Bearer '+token}:{}),
  ...(body===undefined?{}:{'Content-Type':contentType})
 },...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
}
function env(DB=db(),extra={}){return {PWA_ORIGIN:origin,AUTH_HMAC_SECRET:SECRET,SAHAMBAN_DB:DB,...extra};}

test('authenticated entitlement lookup is account-bound and reports manual renewal only',async()=>{
 const app=await worker(),storage=db();
 const response=await app.fetch(request(await signedToken()),env(storage));
 assert.equal(response.status,200);
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
 assert.match(response.headers.get('Cache-Control'),/no-store/);
 assert.deepEqual(await response.json(),{proEnabled:true,reason:'ACTIVE',paidUntil:activeRow.paid_until,renewalMode:'MANUAL'});
 assert.deepEqual(storage.calls[0].values,[subject]);
 assert.match(storage.calls[0].sql,/LEFT JOIN billing_access/);
 assert.match(storage.calls[0].sql,/WHERE u.auth_subject=\?/);
});

test('missing, forged, expired, wrong issuer/audience/algorithm and oversized tokens fail closed',async()=>{
 const app=await worker(),good=await signedToken();
 const invalid=[null,good.slice(0,-2)+'xx',await signedToken({exp:Math.floor(Date.now()/1000)-1}),
  await signedToken({aud:'other'}),await signedToken({iss:'other'}),
  await signedToken({exp:Math.floor(Date.now()/1000)+7200}),await signedToken({sub:'bad space'}),
  await signedToken({}, {alg:'none'}),'x'.repeat(6000)];
 for(const token of invalid){
  const storage=db(),response=await app.fetch(request(token),env(storage));
  assert.equal(response.status,401);assert.equal(storage.calls.length,0);
 }
});

test('cross-origin requests, query spoofing and unsupported methods are rejected before D1 lookup',async()=>{
 const app=await worker(),token=await signedToken();
 for(const req of [
  request(token,'/api/v1/me/entitlement',{requestOrigin:'https://evil.example'}),
  request(token,'/api/v1/me/entitlement?user=other')
 ]){
  const storage=db(),response=await app.fetch(req,env(storage));
  assert.ok([400,403].includes(response.status));assert.equal(storage.calls.length,0);
 }
 const preflight=await app.fetch(new Request('https://worker.example/api/v1/me/entitlement',{
  method:'OPTIONS',headers:{Origin:origin}}),env());
 assert.equal(preflight.status,204);
 assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
 assert.equal((await app.fetch(request(token,'/api/v1/me/entitlement',{method:'POST'}),env())).status,405);
});

test('missing DB, closed account, expired/malformed access and legacy auto-renewal fail closed',async()=>{
 const app=await worker(),token=await signedToken();
 const cases=[[undefined,503],[null,403],[{...activeRow,account_status:'CLOSED'},403],
  [{...activeRow,paid_until:'2020-01-01T00:00:00.000Z'},403],
  [{...activeRow,paid_until:'2026-02-30T00:00:00.000Z'},503],
  [{...activeRow,auto_renewing:1},503],[new Error('database down'),503]];
 for(const [value,status] of cases){
  const storage=value===undefined?undefined:db(value),e=env(storage);
  if(value===undefined)e.SAHAMBAN_DB=undefined;
  const response=await app.fetch(request(token),e);
  assert.equal(response.status,status);
  assert.equal((await response.json()).proEnabled,false);
 }
});

test('health endpoint advertises disabled payments and unknown checkout routes stay unavailable',async()=>{
 const app=await worker();
 assert.deepEqual(await (await app.fetch(request(null,'/api/v1/health'),env())).json(),
  {status:'prototype',paymentsEnabled:false,checkoutEnabled:false});
 assert.equal((await app.fetch(request(null,'/api/v1/checkout'),env())).status,404);
});

test('manual billing order and verification endpoints remain disabled by default',async()=>{
 const app=await worker(),token=await signedToken();
 const order=await app.fetch(request(token,'/api/v2/billing/orders',{
  method:'POST',body:{planId:'SAHAMBAN_PRO_30D'}}),env());
 assert.equal(order.status,404);assert.deepEqual(await order.json(),{error:'FEATURE_DISABLED'});
 const verify=await app.fetch(request(token,'/api/v2/billing/verify',{
  method:'POST',body:{orderId:'ord_'+'a'.repeat(32),sku:'sku',token:'purchase-token',
   originalJson:'{}',dataSignature:'AAAAAAAAAAAAAAAA'}}),env());
 assert.equal(verify.status,404);assert.deepEqual(await verify.json(),{error:'FEATURE_DISABLED'});
});

test('manual order creation accepts only a plan ID and derives order identity and duration server-side',async()=>{
 const app=await worker(),token=await signedToken(),storage=db(null);
 const response=await app.fetch(request(token,'/api/v2/billing/orders',{
  method:'POST',body:{planId:'SAHAMBAN_PRO_90D'}}),env(storage,{BILLING_V2_ENABLED:'true'}));
 assert.equal(response.status,201);
 const body=await response.json();
 assert.deepEqual(body,{status:201,order:{id:body.order.id,planId:'SAHAMBAN_PRO_90D',days:90}});
 assert.match(body.order.id,/^ord_[a-f0-9]{32}$/);
 assert.deepEqual(storage.calls[0].values,[body.order.id,'SAHAMBAN_PRO_90D',storage.calls[0].values[2],subject]);
 assert.match(storage.calls[0].sql,/INSERT INTO billing_orders/);
 assert.match(storage.calls[0].sql,/status='ACTIVE'/);
});

test('manual order creation rejects client prices, unknown plans, malformed JSON and non-JSON content',async()=>{
 const app=await worker(),token=await signedToken();
 for(const [body,contentType,status] of [
  [{planId:'SAHAMBAN_PRO_30D',price:1},'application/json',400],
  [{planId:'UNKNOWN'},'application/json',400],
  ['not-json','application/json',400],
  [{planId:'SAHAMBAN_PRO_30D'},'text/plain',415]
 ]){
  const storage=db(null),response=await app.fetch(request(token,'/api/v2/billing/orders',{
   method:'POST',body,contentType}),env(storage,{BILLING_V2_ENABLED:'true'}));
  assert.equal(response.status,status);assert.equal(storage.calls.length,0);
 }
});

test('order creation denies accounts that are not active and propagates database failure safely',async()=>{
 const app=await worker(),token=await signedToken();
 const denied=await app.fetch(request(token,'/api/v2/billing/orders',{
  method:'POST',body:{planId:'SAHAMBAN_PRO_30D'}}),env(db(null,{changes:0}),{BILLING_V2_ENABLED:'true'}));
 assert.equal(denied.status,403);assert.deepEqual(await denied.json(),{status:403,error:'ACCOUNT_NOT_ELIGIBLE'});
 const broken={prepare(){throw Error('database down');}};
 const unavailable=await app.fetch(request(token,'/api/v2/billing/orders',{
  method:'POST',body:{planId:'SAHAMBAN_PRO_30D'}}),env(broken,{BILLING_V2_ENABLED:'true'}));
 assert.equal(unavailable.status,503);
});

test('receipt verification requires JSON and configured exact SKU mapping before contacting Bazaar',async()=>{
 const app=await worker(),token=await signedToken(),storage=db(null);
 const body={orderId:'ord_'+'a'.repeat(32),sku:'sku',token:'purchase-token',
  originalJson:'{}',dataSignature:'AAAAAAAAAAAAAAAA'};
 const badType=await app.fetch(request(token,'/api/v2/billing/verify',{
  method:'POST',body,contentType:'text/plain'}),env(storage,{BILLING_V2_ENABLED:'true'}));
 assert.equal(badType.status,415);assert.equal(storage.calls.length,0);
 const unconfigured=await app.fetch(request(token,'/api/v2/billing/verify',{
  method:'POST',body}),env(storage,{BILLING_V2_ENABLED:'true'}));
 assert.equal(unconfigured.status,503);
 assert.deepEqual(await unconfigured.json(),{error:'BAZAAR_SKU_MAP_NOT_CONFIGURED'});
});
