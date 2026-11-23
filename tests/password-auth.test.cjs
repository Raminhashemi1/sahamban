'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
globalThis.crypto ||= webcrypto;
const {createPasswordAuth,normalizeUsername,hashPassword,createRecoveryCodes}=require('../server/password-auth.cjs');

function mockD1({user=null,session=null,changes=1,rateChanges=[1,1,0]}={}){
 const calls=[];
 const db={
  calls,
  prepare(sql){return {sql,values:[],bind(...values){this.values=values;return {
   first:async()=>{calls.push({kind:'first',sql,values});return sql.includes('FROM sahmino_shared_sessions')?session:user;},
   run:async()=>{calls.push({kind:'run',sql,values});return {meta:{changes}};}
  };}}},
  async batch(items){calls.push({kind:'batch',items});return rateChanges.map(n=>({meta:{changes:n}}));}
 };
 return db;
}
const RATE_SECRET='a'.repeat(48),IP='203.0.113.10';

test('normalizes Iranian mobile usernames including Persian and Arabic digits',()=>{
 assert.equal(normalizeUsername('09123456789'),'+989123456789');
 assert.equal(normalizeUsername('+989123456789'),'+989123456789');
 assert.equal(normalizeUsername('۰۰۹۸۹۱۲۳۴۵۶۷۸۹'),'+989123456789');
 assert.equal(normalizeUsername('123456'),null);
 assert.equal(normalizeUsername('0912345678'),null);
});

test('password login uses PBKDF2, returns hardened session cookie and stores only session digest',async()=>{
 const password='Correct Horse Battery 2026!';
 const encoded=await hashPassword(password);
 const db=mockD1({user:{id:'usr_'+'a'.repeat(32),status:'ACTIVE',salt:encoded.salt,hash:encoded.hash,iterations:encoded.iterations}});
 const auth=createPasswordAuth(db,{clock:()=>Date.parse('2026-11-20T12:00:00.000Z')});
 const result=await auth.login({username:'۰۹۱۲۳۴۵۶۷۸۹',password,ipKey:IP,rateLimitSecret:RATE_SECRET});
 assert.equal(result.ok,true);
 assert.match(result.sessionCookie,/^sahmino_session=[a-f0-9]{64}; Path=\/; HttpOnly; Secure; SameSite=None; Max-Age=2592000$/);
 assert.equal(db.calls[0].kind,'batch');
 assert.equal(db.calls[0].items.length,3);
 const session=db.calls.find(x=>x.kind==='run');
 assert.match(session.sql,/INSERT INTO sahmino_shared_sessions/);
 assert.match(session.values[2],/^[a-f0-9]{64}$/);
 assert.notEqual(session.values[2],result.sessionCookie.split('=')[1].split(';')[0]);
});

test('unknown, suspended and wrong-password accounts return the same generic error',async()=>{
 const encoded=await hashPassword('Correct Horse Battery 2026!');
 for(const user of [
  null,
  {id:'usr_'+'b'.repeat(32),status:'SUSPENDED',salt:encoded.salt,hash:encoded.hash,iterations:encoded.iterations},
  {id:'usr_'+'c'.repeat(32),status:'ACTIVE',salt:encoded.salt,hash:encoded.hash,iterations:encoded.iterations}
 ]){
  const db=mockD1({user});
  const auth=createPasswordAuth(db);
  const result=await auth.login({username:'09123456789',password:'Wrong Password 2026!',ipKey:IP,rateLimitSecret:RATE_SECRET});
  assert.deepEqual({status:result.status,error:result.error},{status:401,error:'INVALID_CREDENTIALS'});
  assert.equal(db.calls.some(x=>x.kind==='run'),false);
 }
});

test('rate limiting is atomic and fails closed when the D1 reservation is denied',async()=>{
 const encoded=await hashPassword('Correct Horse Battery 2026!');
 const db=mockD1({user:{id:'usr_'+'d'.repeat(32),status:'ACTIVE',salt:encoded.salt,hash:encoded.hash,iterations:encoded.iterations},rateChanges:[0,1,0]});
 const auth=createPasswordAuth(db);
 const result=await auth.login({username:'09123456789',password:'Correct Horse Battery 2026!',ipKey:IP,rateLimitSecret:RATE_SECRET});
 assert.deepEqual({status:result.status,error:result.error},{status:429,error:'LOGIN_RATE_LIMITED'});
 assert.equal(db.calls.some(x=>x.kind==='first'),false);
});

test('login refuses missing rate-limit secret and invalid password lengths',async()=>{
 const db=mockD1();
 const auth=createPasswordAuth(db);
 assert.equal((await auth.login({username:'09123456789',password:'Correct Horse Battery 2026!',ipKey:IP})).status,503);
 assert.equal((await auth.login({username:'09123456789',password:'short',ipKey:IP,rateLimitSecret:RATE_SECRET})).status,400);
});

test('session lookup hashes bearer and logout revokes only the digest',async()=>{
 const bearer='e'.repeat(64);
 const db=mockD1({session:{sessionId:'ses_test',userId:'usr_'+'f'.repeat(32),expiresAt:'2099-12-31T00:00:00.000Z'}});
 const auth=createPasswordAuth(db);
 const found=await auth.findActiveSession(bearer,Date.parse('2026-11-20T12:00:00Z'));
 assert.equal(found.userId,'usr_'+'f'.repeat(32));
 assert.match(db.calls[0].values[0],/^[a-f0-9]{64}$/);
 assert.match(db.calls[0].sql,/u\.username_normalized IS NOT NULL AND u\.password_hash IS NOT NULL/);
 assert.notEqual(db.calls[0].values[0],bearer);
 assert.equal(await auth.revokeSession(bearer,'2026-11-20T12:01:00.000Z'),true);
 assert.match(db.calls[1].sql,/UPDATE sahmino_shared_sessions SET revoked_at/);
 assert.match(auth.clearSessionCookie(),/HttpOnly; Secure; SameSite=None; Max-Age=0$/);
});

test('recovery codes are ten unique high-entropy single-use display values',()=>{
 const codes=createRecoveryCodes();
 assert.equal(codes.length,10);
 assert.equal(new Set(codes).size,10);
 for(const code of codes)assert.match(code,/^[A-F0-9]{6}(?:-[A-F0-9]{6}){3}$/);
});
test('password recovery consumes one code atomically, replaces password and revokes all sessions',async()=>{
 const calls=[];let batchCount=0;
 const db={
  prepare(sql){return {sql,bind(...values){return {sql,values};}}},
  async batch(items){calls.push(items);batchCount++;return (batchCount===1?[1,1,0]:[1,1,1]).map(n=>({meta:{changes:n}}));}
 };
 const auth=createPasswordAuth(db,{clock:()=>Date.parse('2026-11-22T12:00:00.000Z')});
 const result=await auth.recoverPassword({username:'09123456789',recoveryCode:'AABBCC-DDEEFF-001122-334455',
  newPassword:'A new secure password 2026!',ipKey:IP,rateLimitSecret:RATE_SECRET});
 assert.deepEqual({ok:result.ok,status:result.status},{ok:true,status:200});
 assert.equal(calls.length,2);
 assert.match(calls[1][0].sql,/UPDATE sahamban_users SET password_salt=\\?/);
 assert.match(calls[1][0].sql,/rc\\.code_hash=\\? AND rc\\.used_at IS NULL/);
 assert.match(calls[1][1].sql,/UPDATE sahmino_recovery_codes SET used_at=\\?,reset_id=\\?/);
 assert.match(calls[1][1].sql,/used_at IS NULL AND changes\\(\\)=1/);
 assert.match(calls[1][2].sql,/UPDATE sahmino_shared_sessions SET revoked_at=\\?/);
 assert.match(calls[1][2].sql,/changes\\(\\)=1/);
 const expectedDigest=require('node:crypto').createHash('sha256').update('AABBCCDDEEFF001122334455').digest('hex');
 assert.ok(calls[1][0].values.includes(expectedDigest));
 assert.ok(!calls[1][0].values.includes('AABBCCDDEEFF001122334455'));
});


test('password recovery does not consume a code when the active account update changes no row',async()=>{
 const batches=[];
 const db={
  prepare(sql){return {sql,bind(...values){return {sql,values};}}},
  async batch(items){batches.push(items);return [0,0,0].map(n=>({meta:{changes:n}}));}
 };
 const auth=createPasswordAuth(db,{clock:()=>Date.parse('2026-11-22T12:00:00.000Z')});
 const result=await auth.recoverPassword({username:'09123456789',recoveryCode:'AABBCC-DDEEFF-001122-334455',
  newPassword:'A new secure password 2026!',ipKey:IP,rateLimitSecret:RATE_SECRET});
 assert.deepEqual({ok:result.ok,status:result.status,error:result.error},
  {ok:false,status:400,error:'INVALID_RECOVERY'});
 assert.equal(batches.length,2);
 const reset=batches[1];
 assert.match(reset[0].sql,/UPDATE sahamban_users SET password_salt/);
 assert.match(reset[1].sql,/changes\\(\\)=1/);
});
