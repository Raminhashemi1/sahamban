'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
globalThis.crypto ||= webcrypto;
const {createD1SmsOtpRepository}=require('../server/d1-sms-otp-repository.cjs');

function mockD1({firstRow=null,changes=1}={}) {
  const calls=[];
  const db={
    prepare(sql){return {
      bind(...args){return {sql,args,first:async()=>{calls.push({kind:'first',sql,args});return firstRow;},run:async()=>{calls.push({kind:'run',sql,args});return {meta:{changes}};}};}
    };},
    async batch(items){calls.push({kind:'batch',items:items.map(x=>({sql:x.sql,args:x.args}))});return items.map(()=>({meta:{changes:1}}));}
  };
  return {db,calls};
}

test('D1 repository stores only a SHA-256 session digest and returns hardened cookie',async()=>{
 const {db,calls}=mockD1();
 const repo=createD1SmsOtpRepository(db,{clock:()=>Date.parse('2026-11-17T12:00:00Z')});
 const session=await repo.createSharedSession({userId:'usr_'+'a'.repeat(32),authenticatedAt:'2026-11-17T12:00:00.000Z'});
 assert.match(session.cookie,/^sahmino_session=[a-f0-9]{64}; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000$/);
 const call=calls.find(x=>x.kind==='run');
 assert.match(call.sql,/INSERT INTO sahmino_shared_sessions/);
 assert.match(call.args[2],/^[a-f0-9]{64}$/);
 assert.notEqual(call.args[2],session.cookie.split('=')[1].split(';')[0]);
});

test('session lookup hashes bearer and rejects malformed token before database access',async()=>{
 const {db,calls}=mockD1({firstRow:{sessionId:'s1',userId:'u1'}});
 const repo=createD1SmsOtpRepository(db);
 assert.equal(await repo.findActiveSession('bad'),null);
 assert.equal(calls.length,0);
 const found=await repo.findActiveSession('b'.repeat(64),Date.parse('2026-11-17T12:00:00Z'));
 assert.equal(found.sessionId,'s1');
 assert.match(calls[0].sql,/token_hash=\? AND s\.revoked_at IS NULL AND s\.expires_at>\?/);
 assert.equal(calls[0].args[0].length,64);
 assert.notEqual(calls[0].args[0],'b'.repeat(64));
});

test('logout revokes one session by digest and clears cookie safely',async()=>{
 const {db,calls}=mockD1();
 const repo=createD1SmsOtpRepository(db);
 assert.equal(await repo.revokeSession('c'.repeat(64),'2026-11-17T12:01:00.000Z'),true);
 assert.match(calls[0].sql,/UPDATE sahmino_shared_sessions SET revoked_at=/);
 assert.equal(calls[0].args[1].length,64);
 assert.match(repo.clearSessionCookie(),/HttpOnly; Secure; SameSite=Lax; Max-Age=0$/);
});

test('account-wide revocation requires internal user identifier and is conditional',async()=>{
 const {db,calls}=mockD1({changes:3});
 const repo=createD1SmsOtpRepository(db);
 assert.equal(await repo.revokeAllUserSessions('client-controlled-id'),0);
 assert.equal(calls.length,0);
 assert.equal(await repo.revokeAllUserSessions('usr_'+'d'.repeat(32),'2026-11-17T12:02:00.000Z'),3);
 assert.match(calls[0].sql,/WHERE user_id=\? AND revoked_at IS NULL AND expires_at>\?/);
});
