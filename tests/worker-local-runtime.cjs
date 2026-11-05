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
const timeout=75000;
const nap=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function cli(...args){
 const result=spawnSync('npx',['--no-install','wrangler','d1','execute','SAHAMBAN_DB','--local','--config',CONFIG,'--yes',...args],{
  cwd:process.cwd(),env:{...process.env,WRANGLER_SEND_METRICS:'false'},encoding:'utf8',timeout:25000
 });
 if(result.error||result.status!==0)
  throw Error('Local D1 setup failed ('+(result.error?.code||result.status)+')');
}
async function json(path,{token,method='GET',origin=ORIGIN,body}={}){
 const headers={'Origin':origin};
 if(token)headers.Authorization='Bearer '+token;
 const response=await fetch(BASE+path,{method,headers,body,signal:AbortSignal.timeout(5000)});
 let data;try{data=await response.json();}catch{data=null;}
 return {status:response.status,data,headers:response.headers};
}
async function main(){
 cli('--command',"INSERT OR IGNORE INTO sahamban_users(id,auth_subject,created_at,status) VALUES ('local-runtime-u1','"+ID+"','"+stamp+"','ACTIVE')");
 cli('--command',"INSERT OR REPLACE INTO subscription_entitlements(user_id,paid_until,suspended,auto_renew_cancelled,updated_at) VALUES ('local-runtime-u1','2099-12-01T00:00:00.000Z',0,0,'"+stamp+"')");
 const tok=issuePilotToken({subject:ID,secret:SECRET,nowMs:NOW});
 // Command-line var is a PUBLIC TEST VALUE, NOT an actual key or credential.
 const app=spawn('npx',['--no-install','wrangler','dev','--local','--config',CONFIG,'--ip','127.0.0.1','--port',String(PORT),'--var','AUTH_HMAC_SECRET:'+SECRET],{
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
  const noOrderPrice=await json('/api/v1/me/orders',{token:tok,method:'POST'});
  assert.equal(noOrderPrice.status,503);
  assert.equal(noOrderPrice.data.reason,'PILOT_ORDERS_DISABLED');
  const checkout=await json('/api/v1/checkout',{method:'POST'});
  assert.equal(checkout.status,404);
  const preflight=await fetch(BASE+'/api/v1/me/entitlement',{
   method:'OPTIONS',headers:{Origin:ORIGIN},signal:AbortSignal.timeout(5000)
  });
  assert.equal(preflight.status,204);
  process.stdout.write('PASS: local Worker served, private D1 verified, signed pilot access accepted; unauthenticated, cross-origin, forged-query and checkout blocked.\n');
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
