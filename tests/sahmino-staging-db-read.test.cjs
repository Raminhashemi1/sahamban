'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {createStagingSnapshotReader,STAGING_READ_SQL}=require('../server/sahmino-staging-snapshot-reader.cjs');
const {createStagingServer}=require('../server/sahmino-staging-server.cjs');
const id='00000000-0000-4000-8000-000000000077';
const auth='synthetic-session-no-real-identity';
function request(server,route='/api/v1/me/staging-entitlement',headers={}){
 return new Promise((resolve,reject)=>{
  const req=http.get({hostname:'127.0.0.1',port:server.address().port,path:route,headers},res=>{
   const chunks=[];res.on('data',c=>chunks.push(c));
   res.on('end',()=>{try{resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks).toString())});}catch(e){reject(e);}});
  });req.on('error',reject);
 });
}
async function hosted(options,fn){
 const server=createStagingServer(options);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{return await fn(server);}finally{await new Promise(resolve=>server.close(resolve));}
}
test('snapshot SQL is fixed and account UUID is a bound parameter',async()=>{
 let sql,params;
 const reader=createStagingSnapshotReader({query:async(s,p)=>{sql=s;params=p;return {rows:[{expiry_at:'2026-12-15T00:00:00.000Z',revision:1}]};}});
 const r=await reader.read({authenticated:true,accountId:id});
 assert.equal(sql,STAGING_READ_SQL);
 assert.match(sql,/account_id=\$1::uuid/);
 assert.deepEqual(params,[id]);
 assert.equal(r.realEntitlement,false);
 assert.equal(r.expiresAtUtc,'2026-12-15T00:00:00.000Z');
});
test('no UUID and attempted SQL injection never reach database',async()=>{
 let queries=0;
 const reader=createStagingSnapshotReader({query:async()=>{queries++;return {rows:[]};}});
 for(const principal of [{authenticated:true,accountId:"' OR 1=1 --"},{authenticated:false,accountId:id},{authenticated:true,accountId:'alice'},null]){
  const r=await reader.read(principal);
  assert.equal(r.realEntitlement,false);
  assert.equal(r.reason,'AUTHENTICATED_ACCOUNT_REQUIRED');
 }
 assert.equal(queries,0);
});
test('database errors and malformed data fail closed without leaking connection info',async()=>{
 const db=createStagingSnapshotReader({query:async()=>{throw Error('password=secret');}});
 const r=await db.read({authenticated:true,accountId:id});
 assert.equal(r.reason,'STAGING_DATABASE_UNAVAILABLE');
 assert.equal(JSON.stringify(r).includes('secret'),false);
 for(const row of [{revision:-1,expiry_at:null},{revision:'bad',expiry_at:null},{revision:1,expiry_at:'bad-date'}]){
  const reader=createStagingSnapshotReader({query:async()=>({rows:[row]})});
  assert.equal((await reader.read({authenticated:true,accountId:id})).reason,'STAGING_DATABASE_INVALID_RESULT');
 }
});
test('no server-side authentication means endpoint fails before DB query',async()=>{
 let calls=0;
 await hosted({databaseQuery:async()=>{calls++;return {rows:[]};}},async server=>{
  const r=await request(server,'/api/v1/me/staging-entitlement',{authorization:auth});
  assert.equal(r.status,401);assert.equal(r.body.realEntitlement,false);
  assert.equal(calls,0);
 });
});
test('authenticated request with disabled database fails closed',async()=>{
 await hosted({verifySession:async()=>({authenticated:true,accountId:id})},async server=>{
  const r=await request(server,'/api/v1/me/staging-entitlement',{authorization:auth});
  assert.equal(r.status,503);assert.equal(r.body.reason,'STAGING_DATABASE_DISABLED');
 });
});
test('injected query is bound only to authenticated account, not URL parameters',async()=>{
 let params;
 await hosted({verifySession:async()=>({authenticated:true,accountId:id}),
  databaseQuery:async(_sql,p)=>{params=p;return {rows:[{expiry_at:null,revision:0}]};}},async server=>{
   const r=await request(server,'/api/v1/me/staging-entitlement?accountId=00000000-0000-4000-8000-000000000999',{authorization:auth});
   assert.equal(r.status,200);
   assert.equal(r.body.realEntitlement,false);
   assert.equal(r.body.simulationOnly,true);
   assert.deepEqual(params,[id]);
  });
});
test('injected database never authorizes paid access, including active synthetic snapshot',async()=>{
 await hosted({verifySession:async()=>({authenticated:true,accountId:id}),
  databaseQuery:async()=>({rows:[{expiry_at:'2099-01-01T00:00:00Z',revision:12}]})},async server=>{
   const r=await request(server,'/api/v1/me/staging-entitlement',{authorization:auth});
   assert.equal(r.status,200);
   assert.equal(r.body.syntheticActive,true);
   assert.equal(r.body.realEntitlement,false);
  });
});
