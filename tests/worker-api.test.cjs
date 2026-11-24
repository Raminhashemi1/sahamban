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
 assert.match(storage.calls[0][1],/LEFT JOIN prepaid_subscription_entitlements pe/);
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


test('prepaid order route is disabled by default and requires pilot-authenticated identity',async()=>{
 const worker=(await api()).default,token=await signedToken();
 const disabled=await worker.fetch(new Request('https://worker.example/api/v1/me/prepaid-orders',{
  method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({planId:'SAHAMBAN_PRO_3M'})
 }),env());
 assert.equal(disabled.status,404);
 assert.deepEqual(await disabled.json(),{error:'FEATURE_DISABLED'});
 const unauth=await worker.fetch(new Request('https://worker.example/api/v1/me/prepaid-orders',{
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({planId:'SAHAMBAN_PRO_3M'})
 }),{...env(),PREPAID_ORDERS_ENABLED:'true'});
 assert.equal(unauth.status,401);
});

test('prepaid order route accepts only a plan ID and takes price and order ID from server',async()=>{
 const worker=(await api()).default,token=await signedToken(),calls=[];
 const storage={prepare(sql){calls.push({sql,values:null});return {bind(...values){calls.at(-1).values=values;return {
  async run(){return {success:true,meta:{changes:1}}},
  async first(){return null;}
 };}};}};
 const response=await worker.fetch(new Request('https://worker.example/api/v1/me/prepaid-orders',{
  method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({planId:'SAHAMBAN_PRO_6M'})
 }),{...env(storage),PREPAID_ORDERS_ENABLED:'true'});
 assert.equal(response.status,201);
 const body=await response.json();
 assert.equal(body.order.amountRial,8550000);
 assert.equal(body.checkoutEnabled,false);
 assert.equal(body.proEnabled,false);
 assert.match(body.order.id,/^ord_[a-f0-9]{32}$/);
 assert.deepEqual(calls[0].values.slice(1,3),['SAHAMBAN_PRO_6M',8550000]);
 assert.match(calls[0].values[3],/^\d{4}-\d{2}-\d{2}T/);
 assert.equal(calls[0].values[4],subject);
 assert.match(calls[0].sql,/u\.auth_subject=\?/);
});

test('prepaid order route rejects unknown fields, client prices and unsupported media types',async()=>{
 const worker=(await api()).default,token=await signedToken();
 for(const [body,type,status] of [
  [JSON.stringify({planId:'SAHAMBAN_PRO_3M',amountRial:1}),'application/json',400],
  [JSON.stringify({planId:'SAHAMBAN_PRO_3M'}),'text/plain',415],
  ['not-json','application/json',400]
 ]){
  const response=await worker.fetch(new Request('https://worker.example/api/v1/me/prepaid-orders',{
   method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token,'Content-Type':type},
   body
  }),{...env({prepare(){throw Error('must not query DB');}}),PREPAID_ORDERS_ENABLED:'true'});
  assert.equal(response.status,status);
 }
});


test('prepaid overview route is disabled by default, private and read only',async()=>{
 const worker=(await api()).default,token=await signedToken();
 const disabled=await worker.fetch(req(token,'/api/v1/me/prepaid-overview'),env());
 assert.equal(disabled.status,404);
 const blocked=await worker.fetch(req(null,'/api/v1/me/prepaid-overview'),{...env(),PREPAID_ORDERS_ENABLED:'true'});
 assert.equal(blocked.status,401);
 const method=await worker.fetch(req(token,'/api/v1/me/prepaid-overview',origin,'POST'),{...env(),PREPAID_ORDERS_ENABLED:'true'});
 assert.equal(method.status,405);
 const accountDB={prepare(sql){return {bind(value){return {
  async first(){return {user_id:'u1',account_status:'ACTIVE',payment_suspended:0,paid_until:'2099-01-12T10:00:00.000Z'};},
  async all(){return {success:true,results:[{id:'order1',plan_id:'SAHAMBAN_PRO_3M',
   amount_rial:4500000,currency:'IRR',state:'SETTLED',created_at:'2026-11-12T10:00:00.000Z',
   settled_at:'2026-11-12T10:05:00.000Z'}]};}
 };}};}};
 const active=await worker.fetch(req(token,'/api/v1/me/prepaid-overview'),{...env(accountDB),PREPAID_ORDERS_ENABLED:'true'});
 assert.equal(active.status,200);
 const info=await active.json();
 assert.equal(info.proEnabled,true);
 assert.equal(info.checkoutEnabled,false);
 assert.equal(info.autoRenew,false);
 assert.equal(info.orders.length,1);
 assert.equal(info.orders[0].amountRial,4500000);
});

test('CODAL proxy route rejects foreign origins, duplicate query and non-GET methods',async()=>{
 const worker=(await api()).default;
 const blocked=await worker.fetch(new Request('https://worker.example/api/v1/public/codal-search?symbol=x',{headers:{Origin:'https://evil.example'}}),env());assert.equal(blocked.status,403);
 const duplicate=await worker.fetch(new Request('https://worker.example/api/v1/public/codal-search?symbol=a&symbol=b',{headers:{Origin:origin}}),env());assert.equal(duplicate.status,400);
 const method=await worker.fetch(new Request('https://worker.example/api/v1/public/codal-search?symbol=a',{method:'POST',headers:{Origin:origin}}),env());assert.equal(method.status,405);
});
test('CODAL proxy helper validates symbol and classifies upstream responses',async()=>{
 const {proxyCodalSearch}=await api();let called=0;
 const invalid=await proxyCodalSearch('bad symbol',async()=>{called++;throw Error('must not call');});assert.equal(invalid.status,400);assert.equal(called,0);
 const good=await proxyCodalSearch('ونوین',async(url,options)=>{called++;assert.ok(url.includes('search.codal.ir/api/search/v2/q'));assert.equal(options.method,'GET');return new Response(JSON.stringify({Letters:[],Total:0,Page:1}),{status:200,headers:{'Content-Type':'application/json'}});});
 assert.equal(good.status,200);assert.match(good.body.raw,/Letters/);
 const limited=await proxyCodalSearch('ونوین',async()=>new Response('',{status:429}));assert.equal(limited.status,429);
 const failed=await proxyCodalSearch('ونوین',async()=>{throw Error('offline');});assert.equal(failed.status,502);assert.equal(failed.body.error,'UPSTREAM_NETWORK_ERROR');
});


test('TSETMC proxy allows only fixed public resources and validates symbols/IDs before network access',async()=>{
 const {proxyTsetmcRequest}=await api();let calls=0;
 for(const [resource,params] of [
  ['instrument-search',{symbol:'bad symbol'}],
  ['instrument-search',{symbol:'فولاد/../../secret'}],
  ['closing-price',{instrumentId:'123'}],
  ['daily-history',{instrumentId:'12345678?x=1'}],
  ['arbitrary-path',{symbol:'فولاد'}]
 ]){
  const result=await proxyTsetmcRequest(resource,params,async()=>{calls++;throw Error('must not fetch');});
  assert.equal(result.status,400);
  assert.equal(result.body.error,'INVALID_TSETMC_REQUEST');
 }
 assert.equal(calls,0);
});

test('TSETMC proxy maps each allowed resource to its fixed upstream URL and returns parsed JSON',async()=>{
 const {proxyTsetmcRequest}=await api();
 const cases=[
  ['instrument-search',{symbol:'فولاد'},'/Instrument/GetInstrumentSearch/فولاد',{instrumentSearch:[]}],
  ['closing-price',{instrumentId:'12345678901234567'},'/ClosingPrice/GetClosingPriceInfo/12345678901234567',{closingPriceInfo:{pClosing:123}}],
  ['daily-history',{instrumentId:'12345678901234567'},'/ClosingPrice/GetClosingPriceDailyList/12345678901234567/0',{closingPriceDaily:[]}]
 ];
 for(const [resource,params,path,body] of cases){
  const result=await proxyTsetmcRequest(resource,params,async(url,options)=>{
   const parsed=new URL(url);
   assert.equal(parsed.origin,'https://cdn.tsetmc.com');
   assert.equal(decodeURIComponent(parsed.pathname),'/api'+path);
   assert.equal(options.method,'GET');
   assert.equal(options.cache,'no-store');
   assert.equal(options.redirect,'error');
   assert.equal(options.headers.Accept,'application/json');
   return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json; charset=utf-8'}});
  });
  assert.equal(result.status,200);
  assert.deepEqual(result.body,body);
 }
});

test('TSETMC proxy retries one network failure once, then returns an explicit upstream error',async()=>{
 const {proxyTsetmcRequest}=await api();let calls=0;
 const recovered=await proxyTsetmcRequest('instrument-search',{symbol:'فولاد'},async()=>{
  calls++;
  if(calls===1)throw new TypeError('Failed to fetch');
  return new Response(JSON.stringify({instrumentSearch:[]}),{status:200,headers:{'Content-Type':'application/json'}});
 });
 assert.equal(calls,2);
 assert.equal(recovered.status,200);
 calls=0;
 const failed=await proxyTsetmcRequest('instrument-search',{symbol:'فولاد'},async()=>{
  calls++;throw new TypeError('network unavailable');
 });
 assert.equal(calls,2);
 assert.equal(failed.status,502);
 assert.equal(failed.body.error,'UPSTREAM_NETWORK_ERROR');
 assert.equal(failed.body.attempts,2);
});

test('TSETMC proxy rejects rate limits, invalid content type, invalid JSON and oversized responses',async()=>{
 const {proxyTsetmcRequest}=await api();
 const limited=await proxyTsetmcRequest('instrument-search',{symbol:'فولاد'},async()=>new Response('',{status:429}));
 assert.equal(limited.status,429);
 assert.equal(limited.body.error,'UPSTREAM_RATE_LIMIT');
 const contentType=await proxyTsetmcRequest('instrument-search',{symbol:'فولاد'},async()=>new Response('{}',{status:200,headers:{'Content-Type':'text/html'}}));
 assert.equal(contentType.status,502);
 assert.equal(contentType.body.error,'UPSTREAM_CONTENT_TYPE_UNVERIFIED');
 const invalid=await proxyTsetmcRequest('instrument-search',{symbol:'فولاد'},async()=>new Response('{bad',{status:200,headers:{'Content-Type':'application/json'}}));
 assert.equal(invalid.status,502);
 assert.equal(invalid.body.error,'UPSTREAM_INVALID_JSON');
 const large=await proxyTsetmcRequest('instrument-search',{symbol:'فولاد'},async()=>new Response('x'.repeat(2097153),{status:200,headers:{'Content-Type':'application/json'}}));
 assert.equal(large.status,502);
 assert.equal(large.body.error,'UPSTREAM_RESPONSE_INVALID_SIZE');
});

test('TSETMC public route is GET-only, exact-origin, strict-query and read-only',async()=>{
 const worker=(await api()).default;
 const blocked=await worker.fetch(new Request('https://worker.example/api/v1/public/tsetmc?resource=instrument-search&symbol=فولاد',{
  headers:{Origin:'https://evil.example'}
 }),env());
 assert.equal(blocked.status,403);
 const missingOrigin=await worker.fetch(new Request('https://worker.example/api/v1/public/tsetmc?resource=instrument-search&symbol=فولاد'),env());
 assert.equal(missingOrigin.status,403);
 const duplicate=await worker.fetch(new Request('https://worker.example/api/v1/public/tsetmc?resource=instrument-search&symbol=فولاد&symbol=ذوب',{
  headers:{Origin:origin}
 }),env());
 assert.equal(duplicate.status,400);
 const extra=await worker.fetch(new Request('https://worker.example/api/v1/public/tsetmc?resource=instrument-search&symbol=فولاد&url=https://evil.example',{
  headers:{Origin:origin}
 }),env());
 assert.equal(extra.status,400);
 const method=await worker.fetch(new Request('https://worker.example/api/v1/public/tsetmc?resource=instrument-search&symbol=فولاد',{
  method:'POST',headers:{Origin:origin}
 }),env());
 assert.equal(method.status,405);
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response(JSON.stringify({instrumentSearch:[{insCode:'12345678'}]}),{
   status:200,headers:{'Content-Type':'application/json'}
  });
  const good=await worker.fetch(new Request('https://worker.example/api/v1/public/tsetmc?resource=instrument-search&symbol=فولاد',{
   headers:{Origin:origin}
  }),env());
  assert.equal(good.status,200);
  assert.equal(good.headers.get('Access-Control-Allow-Origin'),origin);
  assert.match(good.headers.get('Cache-Control'),/no-store/);
  assert.deepEqual(await good.json(),{instrumentSearch:[{insCode:'12345678'}]});
 }finally{globalThis.fetch=original;}
});
