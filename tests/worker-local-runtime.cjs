'use strict';
/*
 * Cloudflare Worker + local D1 integration acceptance, with NO cloud account,
 * NO real secrets, NO network payments and NO customer data.
 * Runs after pinned wrangler installation and local D1 schema initialization.
 */
const {spawn,spawnSync}=require('node:child_process');
const assert=require('node:assert/strict');
const {issuePilotToken}=require('../server/mint-pilot-token.cjs');

const ORIGIN='https://raminhashemi1.github.io';
const SECRET='test_only_local_runtime_secret_minimum_32_bytes_2026_dont_use_in_prod';
const CONFIG='server/wrangler.local.toml';
const PORT=18879;
const BASE='http://127.0.0.1:'+PORT;
const NOW=Date.now();
const ID='pilot|local-runtime-check';
const stamp=new Date(NOW).toISOString();
const enableOrders=process.env.LOCAL_TEST_ENABLE_ORDERS==='1';
const enablePrepaid=process.env.LOCAL_TEST_ENABLE_PREPAID==='1';
const timeout=75000;
const nap=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function cli(...args){
 const result=spawnSync('npx',['--no-install','wrangler','d1','execute','SAHAMBAN_DB','--local','--config',CONFIG,'--yes',...args],{
  cwd:process.cwd(),env:{...process.env,WRANGLER_SEND_METRICS:'false'},encoding:'utf8',timeout:25000
 });
 if(result.error||result.status!==0)
  throw Error('Local D1 setup failed ('+(result.error?.code||result.status)+')');
}
async function json(path,{token,method='GET',origin=ORIGIN,body,headers:extraHeaders={}}={}){
 const headers={'Origin':origin,...extraHeaders};
 if(token)headers.Authorization='Bearer '+token;
 const response=await fetch(BASE+path,{method,headers,body,signal:AbortSignal.timeout(5000)});
 let data;try{data=await response.json();}catch{data=null;}
 return {status:response.status,data,headers:response.headers};
}
async function main(){
 cli('--command',"INSERT OR IGNORE INTO sahamban_users(id,auth_subject,created_at,status) VALUES ('local-runtime-u1','"+ID+"','"+stamp+"','ACTIVE')");
 cli('--command',"INSERT OR REPLACE INTO subscription_entitlements(user_id,paid_until,suspended,auto_renew_cancelled,updated_at) VALUES ('local-runtime-u1','2099-12-01T00:00:00.000Z',0,0,'"+stamp+"')");
 cli('--file','server/d1-prepaid-migration.sql');
 cli('--command',"INSERT OR REPLACE INTO prepaid_subscription_entitlements(user_id,paid_until,updated_at) VALUES ('local-runtime-u1','2100-01-01T00:00:00.000Z','"+stamp+"')");
 const tok=issuePilotToken({subject:ID,secret:SECRET,nowMs:NOW});
 // Command-line var is a PUBLIC TEST VALUE, NOT an actual key or credential.
 const app=spawn('npx',['--no-install','wrangler','dev','--local','--config',CONFIG,'--ip','127.0.0.1','--port',String(PORT),'--var','AUTH_HMAC_SECRET:'+SECRET,
  ...(enableOrders?['--var','PILOT_ORDERS_ENABLED:true','--var','PILOT_ANNUAL_PRICE_RIAL:2500000']:[]),
  ...(enablePrepaid?['--var','PREPAID_ORDERS_ENABLED:true']:[])],{
  cwd:process.cwd(),env:{...process.env,WRANGLER_SEND_METRICS:'false',NO_COLOR:'1'},
  stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'
 });
 let errors='',stopped=false;
 const record=data=>{errors=(errors+data.toString()).slice(-3500);};
 app.stdout.on('data',record);app.stderr.on('data',record);
 app.on('exit',()=>{stopped=true;});
 try{
  let ready=false;
  for(let i=0;i<75;i++){
   if(stopped)throw Error('Local Worker stopped before becoming ready: '+errors.replaceAll(SECRET,'[REDACTED]').slice(-1200));
   try{const result=await json('/api/v1/health');if(result.status===200){ready=true;break;}}catch(_){}
   await nap(700);
  }
  if(!ready)throw Error('Local Worker not ready before timeout');
  const health=await json('/api/v1/health');
  assert.deepEqual(health.data,{status:'prototype',paymentsEnabled:false,checkoutEnabled:false});
  const noToken=await json('/api/v1/me/entitlement');
  assert.equal(noToken.status,401);
  const valid=await json('/api/v1/me/entitlement',{token:tok});
  assert.equal(valid.status,200);
  assert.equal(valid.data.proEnabled,true);
  assert.match(valid.headers.get('cache-control'),/no-store/);
  const hostile=await json('/api/v1/me/entitlement',{token:tok,origin:'https://attacker.example'});
  assert.equal(hostile.status,403);
  const forgedIdentity=await json('/api/v1/me/entitlement?user=other',{token:tok});
  assert.equal(forgedIdentity.status,400);
  if(!enableOrders){
   const noOrderPrice=await json('/api/v1/me/orders',{token:tok,method:'POST'});
   assert.equal(noOrderPrice.status,503);
   assert.equal(noOrderPrice.data.reason,'PILOT_ORDERS_DISABLED');
  }else{
   const first=await json('/api/v1/me/orders',{token:tok,method:'POST'});
   assert.equal(first.status,201);
   assert.equal(first.data.amountRial,2500000);
   assert.equal(first.data.proEnabled,false);
   assert.equal(first.data.paymentsEnabled,false);
   assert.match(first.data.orderId,/^ord_[a-f0-9]{32}$/);
   const open=await json('/api/v1/me/orders',{token:tok});
   assert.equal(open.status,200);
   assert.equal(open.data.pending,true);
   assert.equal(open.data.orderId,first.data.orderId);
   const duplicate=await json('/api/v1/me/orders',{token:tok,method:'POST'});
   assert.equal(duplicate.status,503);
   assert.equal(duplicate.data.reason,'ORDER_UNAVAILABLE');
   const fakeBody=await json('/api/v1/me/orders',{token:tok,method:'POST',body:JSON.stringify({userId:'victim',amountRial:1,success:true})});
   assert.equal(fakeBody.status,400);
   const after=await json('/api/v1/me/orders',{token:tok});
   assert.equal(after.data.orderId,first.data.orderId);
  }
  if(enablePrepaid){
   const create=await json('/api/v1/me/prepaid-orders',{token:tok,method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({planId:'SAHAMBAN_PRO_6M'})});
   assert.equal(create.status,201);
   assert.equal(create.data.order.planId,'SAHAMBAN_PRO_6M');
   assert.equal(create.data.order.amountRial,8550000);
   assert.equal(create.data.checkoutEnabled,false);
   assert.equal(create.data.proEnabled,false);
   assert.match(create.data.order.id,/^ord_[a-f0-9]{32}$/);
   const pending=await json('/api/v1/me/prepaid-orders',{token:tok});
   assert.equal(pending.status,200);
   assert.equal(pending.data.pending,true);
   assert.equal(pending.data.order.id,create.data.order.id);
   const duplicate=await json('/api/v1/me/prepaid-orders',{token:tok,method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({planId:'SAHAMBAN_PRO_3M'})});
   assert.equal(duplicate.status,503);
   const tampered=await json('/api/v1/me/prepaid-orders',{token:tok,method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({planId:'SAHAMBAN_PRO_3M',amountRial:1})});
   assert.equal(tampered.status,400);
   const access=await json('/api/v1/me/entitlement',{token:tok});
   assert.equal(access.status,200);
   assert.equal(access.data.proEnabled,true);
   assert.equal(access.data.paidUntil,'2100-01-01T00:00:00.000Z');
  }
  const checkout=await json('/api/v1/checkout',{method:'POST'});
  assert.equal(checkout.status,404);
  const preflight=await fetch(BASE+'/api/v1/me/entitlement',{
   method:'OPTIONS',headers:{Origin:ORIGIN},signal:AbortSignal.timeout(5000)
  });
  assert.equal(preflight.status,204);
  process.stdout.write('PASS: offline Worker+D1 HTTP '+(enableOrders?'synthetic order issuance/idempotency':'disabled order')+' checks; identity, origin and checkout boundaries preserved.\n');
 }catch(err){
  // Do not print server command line: it includes a synthetic test key.
  process.stderr.write('FAIL local Worker+D1 acceptance: '+String(err.message).slice(0,500)+'\n');
  process.exitCode=1;
 }finally{
  try{
   if(process.platform!=='win32')process.kill(-app.pid,'SIGTERM');
   else app.kill('SIGTERM');
  }catch(_){app.kill();}
  await nap(500);
 }
}
const watchdog=setTimeout(()=>{process.stderr.write('FAIL: local Worker acceptance timed out.\n');process.exit(1);},timeout);
watchdog.unref();
main().catch(err=>{process.stderr.write('FAIL local Worker setup: '+String(err.message).slice(0,500)+'\n');process.exitCode=1;});
