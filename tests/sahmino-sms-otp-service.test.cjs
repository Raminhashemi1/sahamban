'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
globalThis.crypto ||= webcrypto;
const {createSmsOtpService}=require('../server/sms-otp-service.cjs');
const SECRET='test_only_sms_otp_service_secret_minimum_32_bytes_2026';

function fakeRepository(){
  const challenges=new Map(),phoneUsers=new Map(),sessions=[];
  let nextUser=1, quotaUsed=0;
  return {
    challenges,sessions,
    async checkSendQuota(){return {allowed:quotaUsed<10,retryAfterSeconds:60};},
    async createChallengeAndReserveQuota(challenge){quotaUsed++;for(const old of challenges.values())if(old.phoneE164===challenge.phoneE164&&!old.consumedAt)old.supersededAt=challenge.createdAt;challenges.set(challenge.id,{...challenge});return true;},
    async markChallengeFailed(id,at){const c=challenges.get(id);c.sendState='FAILED';c.failedAt=at;},
    async markChallengeAccepted(id,meta){const c=challenges.get(id);c.sendState='ACCEPTED';c.providerMessageId=meta.providerMessageId;},
    async getChallenge(id){const c=challenges.get(id);return c?{...c}:null;},
    async recordFailedAttempt(id,{maxAttempts}){const c=challenges.get(id);if(c&&!c.consumedAt&&c.attempts<maxAttempts)c.attempts++;},
    async consumeChallengeOnce(id,{expectedVerifier,maxAttempts}){const c=challenges.get(id);if(!c||c.verifierHmac!==expectedVerifier||c.sendState!=='ACCEPTED'||c.consumedAt||c.supersededAt||c.attempts>=maxAttempts)return false;c.consumedAt=new Date(now).toISOString();return true;},
    async resolveOrCreateByVerifiedPhone(phone){if(!phoneUsers.has(phone))phoneUsers.set(phone,'user-'+nextUser++);return {userId:phoneUsers.get(phone)};},
    async createSharedSession({userId}){const cookie='session_'+userId+'_test';sessions.push({userId,cookie});return {cookie};}
  };
}
let now=Date.parse('2026-11-17T12:00:00Z');
function setup({accept=true,throwSend=false}={}){
  const repository=fakeRepository(),sent=[];
  const adapter={async sendOtp(message){sent.push(message);if(throwSend)throw Error('fake provider down');return {accepted:accept,providerMessageId:'fake-message-1'};}};
  const service=createSmsOtpService({repository,adapter,verifierSecret:SECRET,clock:()=>now});
  return {repository,sent,service};
}

test('request sends through adapter and returns opaque challenge only; OTP never returned',async()=>{
 const x=setup();
 const result=await x.service.requestCode({phone:'۰۹۱۲۳۴۵۶۷۸۹',ipKey:'a'.repeat(64)});
 assert.equal(result.status,202);assert.equal(result.expiresInSeconds,120);assert.equal(result.resendAfterSeconds,60);
 assert.match(result.challengeId,/^[a-f0-9]{48}$/);
 assert.equal(JSON.stringify(result).includes(x.sent[0].message.match(/[0-9]{6}/)[0]),false);
 assert.equal(x.sent.length,1);assert.equal(x.sent[0].destination,'+989123456789');
 assert.equal(x.repository.challenges.get(result.challengeId).verifierHmac.length,64);
 assert.equal(JSON.stringify(x.repository.challenges.get(result.challengeId)).includes(x.sent[0].message.match(/[0-9]{6}/)[0]),false);
});

test('request rejects non-Iranian numbers and malformed IP pseudonyms without sending',async()=>{
 const x=setup();
 assert.equal((await x.service.requestCode({phone:'+12025550123',ipKey:'a'.repeat(64)})).status,400);
 assert.equal((await x.service.requestCode({phone:'09123456789',ipKey:'raw-ip'})).status,400);
 assert.equal(x.sent.length,0);
});

test('provider rejection and timeout fail closed and never permit verification',async()=>{
 for(const options of [{accept:false},{throwSend:true}]){
  const x=setup(options),result=await x.service.requestCode({phone:'09123456789',ipKey:'b'.repeat(64)});
  assert.equal(result.status,503);
  const challenge=[...x.repository.challenges.values()][0];
  assert.equal(challenge.sendState,'FAILED');
  assert.equal((await x.service.verifyCode({challengeId:challenge.id,code:'123456'})).ok,false);
 }
});

test('correct OTP creates account and shared session only after verification',async()=>{
 const x=setup(),requested=await x.service.requestCode({phone:'09123456789',ipKey:'c'.repeat(64)});
 const message=x.sent[0].message,code=message.match(/[0-9]{6}/)[0];
 const result=await x.service.verifyCode({challengeId:requested.challengeId,code});
 assert.equal(result.status,200);assert.equal(result.userId,'user-1');assert.equal(result.sessionCookie,'session_user-1_test');
 assert.equal(x.repository.sessions.length,1);
 assert.ok(x.repository.challenges.get(requested.challengeId).consumedAt);
 assert.equal((await x.service.verifyCode({challengeId:requested.challengeId,code})).ok,false);
});

test('incorrect code increments attempts and fifth failure locks challenge',async()=>{
 const x=setup(),requested=await x.service.requestCode({phone:'09123456789',ipKey:'d'.repeat(64)});
 for(let i=0;i<5;i++)assert.equal((await x.service.verifyCode({challengeId:requested.challengeId,code:'000000'})).status,400);
 assert.equal(x.repository.challenges.get(requested.challengeId).attempts,5);
 assert.equal(x.repository.sessions.length,0);
});

test('challenge expires at 120 seconds and resend supersedes older challenge',async()=>{
 const x=setup(),first=await x.service.requestCode({phone:'09123456789',ipKey:'e'.repeat(64)});
 const second=await x.service.requestCode({phone:'09123456789',ipKey:'f'.repeat(64)});
 assert.ok(x.repository.challenges.get(first.challengeId).supersededAt);
 const code=x.sent[1].message.match(/[0-9]{6}/)[0];
 assert.equal((await x.service.verifyCode({challengeId:first.challengeId,code})).ok,false);
 now+=120001;
 assert.equal((await x.service.verifyCode({challengeId:second.challengeId,code})).ok,false);
 now-=120001;
});

test('simultaneous valid submissions result in only one account/session',async()=>{
 const x=setup(),requested=await x.service.requestCode({phone:'09123456789',ipKey:'9'.repeat(64)});
 const code=x.sent[0].message.match(/[0-9]{6}/)[0];
 const results=await Promise.all([
  x.service.verifyCode({challengeId:requested.challengeId,code}),
  x.service.verifyCode({challengeId:requested.challengeId,code})
 ]);
 assert.equal(results.filter(r=>r.ok).length,1);
 assert.equal(x.repository.sessions.length,1);
});
