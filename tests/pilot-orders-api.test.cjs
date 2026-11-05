'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
globalThis.crypto ||= webcrypto;
const {issuePilotToken}=require('../server/mint-pilot-token.cjs');
const SECRET='private_test_only_secret_at_least_32_bytes_abcdef123456';
const origin='https://raminhashemi1.github.io';
async function mod(){return import('../server/pilot-orders-api.mjs');}
function mockDB({changes=1,row=null,error=null}={}){
 const calls=[];
 return {calls,prepare(sql){
  calls.push(['prepare',sql]);
  return {bind(...args){calls.push(['bind',...args]);return {
   async run(){calls.push(['run']);if(error)throw error;return {success:true,meta:{changes}};},
   async first(){calls.push(['first']);if(error)throw error;return row;}
  };}};
 }};
}
test('pending orders accept only server price and verified account subject in bound SQL',async()=>{
 const {createPilotPendingOrder,SQL_INSERT}=await mod();
 const storage=mockDB(),now='2026-11-05T09:00:00.000Z';
 const out=await createPilotPendingOrder(storage,{
  enabled:true,authenticatedSubject:'pilot|subject-1',now,configuredPriceRial:'2500000',
  makeOrderId:()=>('ord_'+'a'.repeat(32))
 });
 assert.equal(out.status,201);
 assert.equal(out.amountRial,2500000);
 assert.equal(out.proEnabled,false);
 assert.equal(out.paymentsEnabled,false);
 assert.deepEqual(storage.calls[1],['bind','ord_'+'a'.repeat(32),2500000,now,'pilot|subject-1']);
 assert.match(SQL_INSERT,/WHERE u.auth_subject=\? AND u.status='ACTIVE'/);
 assert.doesNotMatch(SQL_INSERT,/2500000/);
});
test('disabled orders, invalid price, missing account and SQL failures deny issuance',async()=>{
 const {createPilotPendingOrder}=await mod();
 const base={authenticatedSubject:'pilot:subject',enabled:true,now:'2026-11-05T09:00:00.000Z',configuredPriceRial:'2500000',makeOrderId:()=>('ord_'+'b'.repeat(32))};
 for(const patch of [
  {enabled:false},{configuredPriceRial:'0'},{configuredPriceRial:'2.5'},
  {configuredPriceRial:'99999999999999999999999'},{configuredPriceRial:undefined},
  {authenticatedSubject:''},{now:'2026-02-30T00:00:00.000Z'},
  {makeOrderId:()=> 'bad'}
 ]){
  const db=mockDB(),out=await createPilotPendingOrder(db,{...base,...patch});
  assert.notEqual(out.status,201);assert.equal(db.calls.length,0);
 }
 const missing=await createPilotPendingOrder(mockDB({changes:0}),base);
 assert.equal(missing.status,403);
 const db=mockDB({error:new Error('unique pending order or database unavailable')});
 assert.equal((await createPilotPendingOrder(db,base)).status,503);
 assert.equal((await createPilotPendingOrder(null,base)).status,503);
});
test('pending lookup only returns own account-scoped open order and no payment state',async()=>{
 const {findPilotPendingOrder,SQL_PENDING}=await mod();
 const noOrder=await findPilotPendingOrder(mockDB(),'pilot:subject');
 assert.equal(noOrder.pending,false);
 assert.match(SQL_PENDING,/u.auth_subject=\?/);
 const found=await findPilotPendingOrder(mockDB({row:{id:'ord_'+'f'.repeat(32),amount_rial:10000,currency:'IRR',created_at:'2026-11-05T09:00:00.000Z'}}),'pilot:subject');
 assert.equal(found.pending,true);assert.equal(found.paymentsEnabled,false);
 assert.equal(found.proEnabled,false);
 const malformed=await findPilotPendingOrder(mockDB({row:{id:'bad',amount_rial:1,currency:'IRR',created_at:'x'}}),'pilot:subject');
 assert.equal(malformed.status,503);
});
test('HTTP worker disallows unauthenticated or unauthorised pilot orders, never accepts payment',async()=>{
 const {default:worker}=await import('../server/worker-api.mjs');
 const now=Date.now(),token=issuePilotToken({subject:'pilot:subject',secret:SECRET,nowMs:now});
 const storage=mockDB();
 const env={SAHAMBAN_DB:storage,AUTH_HMAC_SECRET:SECRET,PWA_ORIGIN:origin,
  PILOT_ORDERS_ENABLED:'true',PILOT_ANNUAL_PRICE_RIAL:'1500000'};
 function request(method,auth=null,reqOrigin=origin){
  return new Request('https://worker.example/api/v1/me/orders',{method,
   headers:{Origin:reqOrigin,...(auth?{Authorization:'Bearer '+auth}:{})}});
 }
 const unauthed=await worker.fetch(request('POST'),env);
 assert.equal(unauthed.status,401);
 const invalidOrigin=await worker.fetch(request('POST',token,'https://attacker.example'),env);
 assert.equal(invalidOrigin.status,403);
 const accepted=await worker.fetch(request('POST',token),env);
 assert.equal(accepted.status,201);const receipt=await accepted.json();
 assert.equal(receipt.proEnabled,false);assert.equal(receipt.paymentsEnabled,false);
 assert.match(receipt.orderId,/^ord_[a-f0-9]{32}$/);
 assert.equal(storage.calls[1][2],1500000);
 const blocked=await worker.fetch(request('POST',token),{...env,PILOT_ORDERS_ENABLED:'false'});
 assert.equal(blocked.status,503);
 const checkout=await worker.fetch(new Request('https://worker.example/api/v1/checkout',{method:'POST'}),env);
 assert.equal(checkout.status,404);
});
