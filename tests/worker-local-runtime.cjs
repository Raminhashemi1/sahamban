'use strict';
/*
 * Cloudflare Worker + local D1 Billing V2 acceptance.
 * No cloud account, real secrets, network payments or customer data.
 */
const {spawn,spawnSync}=require('node:child_process');
const assert=require('node:assert/strict');
const {issuePilotToken}=require('../server/mint-pilot-token.cjs');

const ORIGIN='https://raminhashemi1.github.io';
const SECRET='test_only_local_runtime_secret_minimum_32_bytes_2026_dont_use_in_prod';
const CONFIG='server/wrangler.local.toml';
const PORT=18879,BASE='http://127.0.0.1:'+PORT;
const NOW=Date.now(),ID='pilot|billing-v2-local-runtime',stamp=new Date(NOW).toISOString();
const enableBillingV2=process.env.LOCAL_TEST_ENABLE_BILLING_V2==='1';
const timeout=75000,nap=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function cli(...args){
 const result=spawnSync('npx',['--no-install','wrangler','d1','execute','SAHAMBAN_DB','--local','--config',CONFIG,'--yes',...args],{
  cwd:process.cwd(),env:{...process.env,WRANGLER_SEND_METRICS:'false'},encoding:'utf8',timeout:25000
 });
 if(result.error||result.status!==0)
  throw Error('Local D1 setup failed ('+(result.error?.code||result.status)+'): '+String(result.stderr||result.stdout||'').slice(-700));
}
async function json(path,{token,method='GET',origin=ORIGIN,body}={}){
 const headers={'Origin':origin,...(body===undefined?{}:{'Content-Type':'application/json'})};
 if(token)headers.Authorization='Bearer '+token;
 const response=await fetch(BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
 let data;try{data=await response.json();}catch{data=null;}
 return {status:response.status,data,headers:response.headers};
}
async function main(){
 cli('--command',"INSERT OR IGNORE INTO sahamban_users(id,auth_subject,created_at,status) VALUES ('local-runtime-u1','"+ID+"','"+stamp+"','ACTIVE')");
 cli('--command',"INSERT OR REPLACE INTO billing_access(user_id,expires_at,auto_renewing,updated_at) VALUES ('local-runtime-u1','2099-12-01T00:00:00.000Z',0,'"+stamp+"')");
 const token=issuePilotToken({subject:ID,secret:SECRET,nowMs:NOW});
 const app=spawn('npx',['--no-install','wrangler','dev','--local','--config',CONFIG,'--ip','127.0.0.1','--port',String(PORT),
  '--var','AUTH_HMAC_SECRET:'+SECRET,
  ...(enableBillingV2?['--var','BILLING_V2_ENABLED:true']:[])],{
  cwd:process.cwd(),env:{...process.env,WRANGLER_SEND_METRICS:'false',NO_COLOR:'1'},
  stdio:['ignore','pipe','pipe'],detached:process.platform!=='win32'
 });
 let errors='',stopped=false;
 const record=data=>{errors=(errors+data.toString()).slice(-3500);};
 app.stdout.on('data',record);app.stderr.on('data',record);app.on('exit',()=>{stopped=true;});
 try{
  let ready=false;
  for(let i=0;i<75;i++){
   if(stopped)throw Error('Local Worker stopped before ready: '+errors.replaceAll(SECRET,'[REDACTED]').slice(-1200));
   try{if((await json('/api/v1/health')).status===200){ready=true;break;}}catch(_){}
   await nap(700);
  }
  if(!ready)throw Error('Local Worker not ready before timeout');
  assert.deepEqual((await json('/api/v1/health')).data,{status:'prototype',paymentsEnabled:false,checkoutEnabled:false});
  assert.equal((await json('/api/v1/me/entitlement')).status,401);
  const entitlement=await json('/api/v1/me/entitlement',{token});
  assert.equal(entitlement.status,200);
  assert.equal(entitlement.data.proEnabled,true);
  assert.equal(entitlement.data.renewalMode,'MANUAL');
  assert.match(entitlement.headers.get('cache-control'),/no-store/);
  assert.equal((await json('/api/v1/me/entitlement',{token,origin:'https://attacker.example'})).status,403);
  assert.equal((await json('/api/v1/me/entitlement?user=other',{token})).status,400);

  const disabled=await json('/api/v2/billing/orders',{token,method:'POST',body:{planId:'SAHAMBAN_PRO_30D'}});
  if(!enableBillingV2){
   assert.equal(disabled.status,404);
   assert.deepEqual(disabled.data,{error:'FEATURE_DISABLED'});
  }else{
   assert.equal(disabled.status,201);
   assert.match(disabled.data.order.id,/^ord_[a-f0-9]{32}$/);
   assert.equal(disabled.data.order.planId,'SAHAMBAN_PRO_30D');
   assert.equal(disabled.data.order.days,30);
   const forged=await json('/api/v2/billing/orders',{token,method:'POST',body:{planId:'SAHAMBAN_PRO_30D',amountRial:1,userId:'victim'}});
   assert.equal(forged.status,400);
   const noSku=await json('/api/v2/billing/verify',{token,method:'POST',body:{
    orderId:disabled.data.order.id,sku:'unknown',token:'synthetic-purchase-token',
    originalJson:'{}',dataSignature:'AAAAAAAAAAAAAAAA'
   }});
   assert.equal(noSku.status,503);
   assert.deepEqual(noSku.data,{error:'BAZAAR_SKU_MAP_NOT_CONFIGURED'});
  }
  assert.equal((await json('/api/v1/checkout',{method:'POST'})).status,404);
  const preflight=await fetch(BASE+'/api/v1/me/entitlement',{method:'OPTIONS',headers:{Origin:ORIGIN},signal:AbortSignal.timeout(5000)});
  assert.equal(preflight.status,204);
  process.stdout.write('PASS: local Worker+D1 Billing V2 '+(enableBillingV2?'synthetic order and verification gates':'disabled-by-default gate')+'; identity, origin and checkout boundaries preserved.\n');
 }catch(err){
  process.stderr.write('FAIL local Worker+D1 acceptance: '+String(err.message).slice(0,700)+'\n');
  process.exitCode=1;
 }finally{
  try{if(process.platform!=='win32')process.kill(-app.pid,'SIGTERM');else app.kill('SIGTERM');}
  catch(_){app.kill();}
  await nap(500);
 }
}
const watchdog=setTimeout(()=>{process.stderr.write('FAIL: local Worker acceptance timed out.\n');process.exit(1);},timeout);
watchdog.unref();
main().catch(err=>{process.stderr.write('FAIL local Worker setup: '+String(err.message).slice(0,700)+'\n');process.exitCode=1;});
