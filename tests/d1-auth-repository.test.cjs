'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
globalThis.crypto ||= webcrypto;
const {createD1AuthRepository}=require('../server/d1-auth-repository.cjs');

function mockD1({firstRow=null,changes=1}={}) {
 const calls=[];
 const db={
  calls,
  prepare(sql){return {sql,bind(...args){return {
   first:async()=>{calls.push({kind:'first',sql,args});return firstRow;},
   run:async()=>{calls.push({kind:'run',sql,args});return {meta:{changes}};}
  };}}},
  async batch(items){calls.push({kind:'batch',items:items.map(x=>({sql:x.sql,args:x.args}))});return items.map(()=>({meta:{changes}}));}
 };
 return {db,calls};
}

test('credential lookup binds normalized username and excludes disabled credentials',async()=>{
 const {db,calls}=mockD1({firstRow:{userId:'usr_a',username:'+989123456789',passwordHash:'pbkdf2-sha256$600000$'+'a'.repeat(32)+'$'+'b'.repeat(64),accountStatus:'ACTIVE'}});
 const repo=createD1AuthRepository(db);
 const found=await repo.findCredentialByUsername('+989123456789');
 assert.equal(found.userId,'usr_a');
 assert.deepEqual(calls[0].args,['+989123456789']);
 assert.match(calls[0].sql,/c\.disabled_at IS NULL/);
 assert.match(calls[0].sql,/JOIN sahamban_users/);
});

test('login rate limit reserves pseudonymous IP and username keys atomically and prunes old rows',async()=>{
 const {db,calls}=mockD1();
 const repo=createD1AuthRepository(db);
 assert.equal(await repo.reserveLoginAttempt({ipKey:'a'.repeat(64),usernameKey:'b'.repeat(64),now:Date.parse('2026-11-20T12:00:00Z')}),true);
 assert.equal(calls[0].kind,'batch');
 assert.equal(calls[0].items.length,2);
 assert.match(calls[0].items[0].sql,/INSERT INTO sahmino_auth_login_attempts/);
 assert.match(calls[0].items[0].sql,/COUNT\(\*\).*ip_key_hmac/s);
 assert.match(calls[0].items[0].sql,/COUNT\(\*\).*username_key_hmac/s);
 assert.match(calls[0].items[1].sql,/DELETE FROM sahmino_auth_login_attempts/);
 assert.equal(calls[0].items[0].args[1],'a'.repeat(64));
 assert.equal(calls[0].items[0].args[2],'b'.repeat(64));
});

test('session issuance stores only a digest and returns Secure HttpOnly cookie',async()=>{
 const {db,calls}=mockD1();
 const repo=createD1AuthRepository(db);
 const result=await repo.createSharedSession({userId:'usr_'+'a'.repeat(32),authenticatedAt:'2026-11-20T12:00:00.000Z'});
 assert.match(result.cookie,/^sahmino_session=[a-f0-9]{64}; Path=\/; HttpOnly; Secure; SameSite=None; Max-Age=2592000$/);
 const call=calls.find(x=>x.kind==='run');
 assert.match(call.sql,/INSERT INTO sahmino_shared_sessions/);
 assert.match(call.args[2],/^[a-f0-9]{64}$/);
 assert.notEqual(call.args[2],result.cookie.split('=')[1].split(';')[0]);
});

test('session lookup hashes bearer and revocation is conditional',async()=>{
 const {db,calls}=mockD1({firstRow:{sessionId:'ses_1',userId:'usr_1'}});
 const repo=createD1AuthRepository(db);
 assert.equal(await repo.findActiveSession('invalid'),null);
 assert.equal(calls.length,0);
 const found=await repo.findActiveSession('c'.repeat(64),Date.parse('2026-11-20T12:00:00Z'));
 assert.equal(found.sessionId,'ses_1');
 assert.match(calls[0].args[0],/^[a-f0-9]{64}$/);
 assert.notEqual(calls[0].args[0],'c'.repeat(64));
 assert.equal(await repo.revokeSession('c'.repeat(64),'2026-11-20T12:01:00.000Z'),true);
 assert.match(calls[1].sql,/UPDATE sahmino_shared_sessions SET revoked_at/);
 assert.equal(calls[1].args[1].length,64);
});

test('session lifetime is bounded and malformed repository configuration is rejected',()=>{
 const {db}=mockD1();
 assert.throws(()=>createD1AuthRepository(db,{sessionTtlSeconds:60}),/between 5 minutes and 90 days/);
 assert.throws(()=>createD1AuthRepository(null),/D1 binding/);
});
