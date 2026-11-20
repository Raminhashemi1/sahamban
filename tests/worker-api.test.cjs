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
function request(token,path='/api/v1/me/entitlement',{method='GET',requestOrigin=origin,body,contentType='application/json',cookie,csrf}={}){
 return new Request('https://worker.example'+path,{method,headers:{
  ...(requestOrigin===null?{}:{Origin:requestOrigin}),...(token?{Authorization:'Bearer '+token}:{}),
  ...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-Sahmino-CSRF':csrf}:{}),
  ...(body===undefined?{}:{'Content-Type':contentType})
 },...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
}
const DEFAULT_BAZAAR_SKU_MAP=JSON.stringify({
 SAHAMBAN_PRO_30D:'bazaar30',SAHAMBAN_PRO_60D:'bazaar60',
 SAHAMBAN_PRO_90D:'bazaar90',SAHAMBAN_PRO_180D:'bazaar180',
 SAHAMBAN_PRO_365D:'bazaar365'
});
function env(DB=db(),extra={}){return {PWA_ORIGIN:origin,AUTH_HMAC_SECRET:SECRET,PILOT_AUTH_ENABLED:'true',
 SAHAMBAN_DB:DB,BAZAAR_SKU_MAP:DEFAULT_BAZAAR_SKU_MAP,...extra};}

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
 assert.deepEqual(body,{status:201,order:{id:body.order.id,planId:'SAHAMBAN_PRO_90D',days:90,priceRial:4050000,store:'BAZAAR'}});
 assert.match(body.order.id,/^ord_[a-f0-9]{32}$/);
 assert.deepEqual(storage.calls[0].values,[body.order.id,'SAHAMBAN_PRO_90D','bazaar90',4050000,storage.calls[0].values[4],subject]);
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
  method:'POST',body}),env(storage,{BILLING_V2_ENABLED:'true',BAZAAR_SKU_MAP:null}));
 assert.equal(unconfigured.status,503);
 assert.deepEqual(await unconfigured.json(),{error:'BAZAAR_SKU_MAP_NOT_CONFIGURED'});
});


test('Myket deployment chooses its provider from Worker configuration and stores the Myket SKU on the order',async()=>{
 const app=await worker(),token=await signedToken(),storage=db(null);
 const map=JSON.stringify({
  SAHAMBAN_PRO_30D:'myket30',SAHAMBAN_PRO_60D:'myket60',
  SAHAMBAN_PRO_90D:'myket90',SAHAMBAN_PRO_180D:'myket180',
  SAHAMBAN_PRO_365D:'myket365'
 });
 const response=await app.fetch(request(token,'/api/v2/billing/orders',{
  method:'POST',body:{planId:'SAHAMBAN_PRO_30D'}
 }),env(storage,{BILLING_V2_ENABLED:'true',BILLING_STORE:'MYKET',MYKET_SKU_MAP:map}));
 assert.equal(response.status,201);
 const result=await response.json();
 assert.equal(result.order.store,'MYKET');
 assert.deepEqual(storage.calls[0].values,[result.order.id,'SAHAMBAN_PRO_30D','myket30',1500000,
  storage.calls[0].values[4],subject]);
 assert.match(storage.calls[0].sql,/store_product_id/);
});

test('client cannot select the store and Myket verify route is selected only by server configuration',async()=>{
 const app=await worker(),token=await signedToken();
 const malformed=await app.fetch(request(token,'/api/v2/billing/orders',{
  method:'POST',body:{planId:'SAHAMBAN_PRO_30D',store:'BAZAAR'}
 }),env(db(null),{BILLING_V2_ENABLED:'true',BILLING_STORE:'MYKET',
  MYKET_SKU_MAP:JSON.stringify({SAHAMBAN_PRO_30D:'a',SAHAMBAN_PRO_60D:'b',
   SAHAMBAN_PRO_90D:'c',SAHAMBAN_PRO_180D:'d',SAHAMBAN_PRO_365D:'e'})}));
 assert.equal(malformed.status,400);
 const verify=await app.fetch(request(token,'/api/v2/billing/verify',{
  method:'POST',body:{orderId:'ord_'+'a'.repeat(32),originalJson:'{}',signature:'A'.repeat(32)}
 }),env(db(null),{BILLING_V2_ENABLED:'true',BILLING_STORE:'MYKET'}));
 assert.equal(verify.status,404);
 assert.deepEqual(await verify.json(),{error:'ORDER_NOT_FOUND'});
});


function passwordSessionDb({session={userId:'usr_'+'a'.repeat(32),sessionId:'ses_test'},entitlement=activeRow,user=null,changes=1,rateChanges=[1,1,0]}={}) {
 const calls=[];
 return {
  calls,
  prepare(sql){return {sql,values:null,bind(...values){this.values=values;return {
   async first(){
    calls.push({kind:'first',sql,values});
    if(sql.includes('FROM sahmino_shared_sessions'))return session?{sessionId:session.sessionId,userId:session.userId,expiresAt:'2099-12-31T00:00:00.000Z'}:null;
    if(sql.includes('LEFT JOIN billing_access'))return entitlement;
    return user;
   },
   async run(){calls.push({kind:'run',sql,values});return {success:true,meta:{changes}};}
  };}}},
  async batch(items){calls.push({kind:'batch',items});return rateChanges.map(n=>({meta:{changes:n}}));}
 };
}

test('password HttpOnly session authenticates entitlement by internal user ID, not auth_subject',async()=>{
 const app=await worker(),storage=passwordSessionDb(),cookie='sahmino_session='+'b'.repeat(64);
 const response=await app.fetch(request(null,'/api/v1/me/entitlement',{cookie}),env(storage,{SAHMINO_PASSWORD_AUTH_ENABLED:'true'}));
 assert.equal(response.status,200);
 assert.equal(response.headers.get('Access-Control-Allow-Credentials'),'true');
 assert.deepEqual(await response.json(),{proEnabled:true,reason:'ACTIVE',paidUntil:activeRow.paid_until,renewalMode:'MANUAL'});
 const expectedHash=await require('node:crypto').webcrypto.subtle.digest('SHA-256',new TextEncoder().encode('b'.repeat(64))).then(x=>Buffer.from(x).toString('hex'));
 assert.equal(storage.calls[0].values[0],expectedHash);
 assert.ok(Number.isFinite(Date.parse(storage.calls[0].values[1])));
 assert.match(storage.calls[1].sql,/WHERE u.id=\?/);
 assert.doesNotMatch(storage.calls[1].sql,/u.auth_subject/);
});

test('password session creates orders only with CSRF and binds order to session user ID',async()=>{
 const app=await worker(),storage=passwordSessionDb(),cookie='sahmino_session='+'c'.repeat(64);
 const blocked=await app.fetch(request(null,'/api/v2/billing/orders',{method:'POST',cookie,body:{planId:'SAHAMBAN_PRO_30D'}}),
  env(storage,{SAHMINO_PASSWORD_AUTH_ENABLED:'true',BILLING_V2_ENABLED:'true'}));
 assert.equal(blocked.status,403);
 assert.equal(storage.calls.length,0);
 const allowed=await app.fetch(request(null,'/api/v2/billing/orders',{method:'POST',cookie,csrf:'1',body:{planId:'SAHAMBAN_PRO_30D'}}),
  env(storage,{SAHMINO_PASSWORD_AUTH_ENABLED:'true',BILLING_V2_ENABLED:'true'}));
 assert.equal(allowed.status,201);
 assert.match(storage.calls[1].sql,/WHERE id=\?/);
 assert.equal(storage.calls[1].values[5],'usr_'+'a'.repeat(32));
});

test('invalid or disabled password session cookies fail closed and never fall back to a pilot token',async()=>{
 const app=await worker(),token=await signedToken();
 for(const extra of [
  {cookie:'sahmino_session='+'d'.repeat(64),enabled:'false'},
  {cookie:'sahmino_session='+'e'.repeat(64),enabled:'true',session:null},
  {cookie:'sahmino_session='+'f'.repeat(64)+'; sahmino_session='+'a'.repeat(64),enabled:'true'}
 ]){
  const storage=passwordSessionDb({session:extra.session??null});
  const response=await app.fetch(request(token,'/api/v1/me/entitlement',{cookie:extra.cookie}),
   env(storage,{SAHMINO_PASSWORD_AUTH_ENABLED:extra.enabled}));
  assert.equal(response.status,401);
 }
});

test('password login route validates origin, body and configuration; OTP endpoints are retired',async()=>{
 const app=await worker();
 const hostile=await app.fetch(new Request('https://worker.example/api/v1/auth/login',{
  method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json','CF-Connecting-IP':'203.0.113.10'},
  body:JSON.stringify({username:'09123456789',password:'Correct Horse Battery 2026!'})
 }),env(undefined,{SAHMINO_PASSWORD_AUTH_ENABLED:'true'}));
 assert.equal(hostile.status,403);
 const retired=await app.fetch(request(null,'/api/v1/auth/otp/request',{method:'POST',body:{phone:'09123456789'}}),env());
 assert.equal(retired.status,404);
 const missingSecret=await app.fetch(new Request('https://worker.example/api/v1/auth/login',{
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.10'},
  body:JSON.stringify({username:'09123456789',password:'Correct Horse Battery 2026!'})
 }),env(passwordSessionDb(),{SAHMINO_PASSWORD_AUTH_ENABLED:'true'}));
 assert.equal(missingSecret.status,503);
});

test('password auth preflight permits configured origin and CSRF header',async()=>{
 const app=await worker();
 const response=await app.fetch(new Request('https://worker.example/api/v1/auth/logout',{
  method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Headers':'content-type,x-sahmino-csrf'}
 }),env());
 assert.equal(response.status,204);
 assert.match(response.headers.get('Access-Control-Allow-Headers'),/X-Sahmino-CSRF/);
 assert.equal(response.headers.get('Access-Control-Allow-Credentials'),'true');
});

test('password login creates session cookie and password never reaches logs or response',async()=>{
 const {hashPassword}=require('../server/password-auth.cjs');
 const encoded=await hashPassword('Correct Horse Battery 2026!');
 const user={id:'usr_'+'9'.repeat(32),status:'ACTIVE',salt:encoded.salt,hash:encoded.hash,iterations:encoded.iterations};
 const storage=passwordSessionDb({user});
 const app=await worker();
 const response=await app.fetch(new Request('https://worker.example/api/v1/auth/login',{
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'203.0.113.10'},
  body:JSON.stringify({username:'۰۹۱۲۳۴۵۶۷۸۹',password:'Correct Horse Battery 2026!'})
 }),env(storage,{SAHMINO_PASSWORD_AUTH_ENABLED:'true',AUTH_RATE_LIMIT_SECRET:'r'.repeat(48)}));
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{authenticated:true});
 assert.match(response.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=None/);
 assert.equal(storage.calls.some(x=>JSON.stringify(x).includes('Correct Horse Battery')),false);
});

