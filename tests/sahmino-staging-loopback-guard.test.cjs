'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createStagingServer}=require('../server/sahmino-staging-server.cjs');
test('staging HTTP server refuses all public or implicit listening interfaces',()=>{
 const server=createStagingServer();
 assert.throws(()=>server.listen(0,'0.0.0.0'),/STAGING_LOOPBACK_ONLY/);
 assert.throws(()=>server.listen(0,'::'),/STAGING_LOOPBACK_ONLY/);
 assert.throws(()=>server.listen(0),/STAGING_LOOPBACK_ONLY/);
 assert.throws(()=>server.listen({port:0,host:'0.0.0.0'}),/STAGING_LOOPBACK_ONLY/);
 assert.throws(()=>server.listen({port:0}),/STAGING_LOOPBACK_ONLY/);
 assert.throws(()=>server.listen('/tmp/sahmino-synthetic.sock'),/STAGING_LOOPBACK_ONLY/);
 assert.equal(server.listening,false);
});
test('explicit local binding remains usable',async()=>{
 const server=createStagingServer();
 try {
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  assert.equal(server.listening,true);
  assert.equal(server.address().address,'127.0.0.1');
 } finally{
  if(server.listening)await new Promise(resolve=>server.close(resolve));
 }
});
