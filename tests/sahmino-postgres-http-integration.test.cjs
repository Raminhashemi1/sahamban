'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const http=require('node:http');
const {createDisposablePostgresQuery}=require('../server/sahmino-disposable-postgres.cjs');
const {createStagingServer}=require('../server/sahmino-staging-server.cjs');
const {STAGING_READ_SQL}=require('../server/sahmino-staging-snapshot-reader.cjs');
const id='00000000-0000-4000-8000-000000000077';
const env={PGHOST:'127.0.0.1',PGDATABASE:'sahmino_synthetic_ci',PGPORT:'5432',
 PGUSER:'sahmino_ci',PGPASSWORD:'ephemeral_ci_only'};
const token='synthetic-test-session';
function mockPool(){
 let instances=0,closed=0,calls=[];
 class Pool{
  constructor(settings){instances++;assert.equal(settings.host,'127.0.0.1');}
  async query(sql,values){calls.push({sql,values});return {rows:[]};}
  async end(){closed++;}
 }
 return {Pool,get counters(){return {instances,closed,calls};}};
}
test('adapter rejects any non-disposable DB, port, host, or missing password',()=>{
 const f=mockPool();
 for(const [k,v] of [['PGHOST','localhost'],['PGHOST','0.0.0.0'],
  ['PGDATABASE','production'],['PGPORT','5433'],['PGUSER','postgres'],
  ['PGPASSWORD','short']]){
  assert.throws(()=>createDisposablePostgresQuery({Pool:f.Pool,env:{...env,[k]:v}}),
   /REFUSE_NON_DISPOSABLE_POSTGRES/);
 }
 assert.equal(f.counters.instances,0);
});
test('adapter sends only fixed parameterized SELECT and rejects other SQL',async()=>{
 const f=mockPool(),adapter=createDisposablePostgresQuery({Pool:f.Pool,env});
 try{
  assert.deepEqual((await adapter.query(STAGING_READ_SQL,[id])).rows,[]);
  assert.deepEqual(f.counters.calls[0].values,[id]);
  for(const [sql,params] of [['SELECT 1',[id]],['DELETE FROM purchase',[id]],
   [STAGING_READ_SQL,[id,id]],[STAGING_READ_SQL,["' OR 1=1 --"]]]){
   await assert.rejects(adapter.query(sql,params),/STAGING_SELECT_ONLY/);
  }
  assert.equal(f.counters.calls.length,1);
 }finally{await adapter.close();await adapter.close();}
 assert.equal(f.counters.closed,1);
 await assert.rejects(adapter.query(STAGING_READ_SQL,[id]),/STAGING_POOL_CLOSED/);
});
function get(server,route,authorization=token){
 return new Promise((resolve,reject)=>{
  const req=http.get({hostname:'127.0.0.1',port:server.address().port,path:route,
   headers:{authorization}},res=>{
    const chunks=[];res.on('data',c=>chunks.push(c));
    res.on('end',()=>{try{resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks).toString())});}catch(e){reject(e);}});
   });req.on('error',reject);
 });
}
test('real disposable PostgreSQL read reaches HTTP endpoint but never grants real access',async t=>{
 if(process.env.SAHMINO_RUN_PG_INTEGRATION!=='1'){t.skip('only disposable PostgreSQL GitHub Actions job');return;}
 const {Pool}=require('pg');
 const adapter=createDisposablePostgresQuery({Pool,env:process.env});
 const server=createStagingServer({databaseQuery:adapter.query,
  verifySession:async key=>key===token?{authenticated:true,accountId:id,subject:'synthetic-user'}:null});
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const r=await get(server,'/api/v1/me/staging-entitlement?accountId=00000000-0000-4000-8000-000000000001');
  assert.equal(r.status,200);
  assert.equal(r.body.reason,'STAGING_READ_ONLY');
  assert.equal(r.body.revision,1);
  assert.equal(r.body.expiresAtUtc,'2026-12-15T00:00:00.000Z');
  assert.equal(r.body.realEntitlement,false);
  const bad=await get(server,'/api/v1/me/staging-entitlement','wrong-token');
  assert.equal(bad.status,401);
  assert.equal(bad.body.realEntitlement,false);
 }finally{
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  await adapter.close();
 }
});
