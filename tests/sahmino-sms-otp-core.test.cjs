'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
globalThis.crypto ||= webcrypto;
const otp=require('../server/sms-otp-core.cjs');
const SECRET='test_only_otp_verifier_secret_minimum_32_bytes_2026';

test('Iranian mobile normalization accepts local and international forms including Persian digits',()=>{
  for(const input of ['09123456789','+989123456789','00989123456789','989123456789',
    '۰۹۱۲۳۴۵۶۷۸۹','٠٩١٢٣٤٥٦٧٨٩','+98 912 345 6789']){
    assert.equal(otp.normalizeIranianMobile(input),'+989123456789',input);
  }
});
test('Iranian mobile normalization rejects non-Iranian, malformed and ambiguous numbers',()=>{
  for(const input of [null,123,'','0912345678','091234567890','+12025550123',
    '0097123456789','9123456789','+98912345678x','+98-021-12345678','۰۲۱۱۲۳۴۵۶۷۸']){
    assert.equal(otp.normalizeIranianMobile(input),null,String(input));
  }
});
test('OTP and challenge identifiers are cryptographically random and constrained',()=>{
  const codes=new Set(),ids=new Set();
  for(let i=0;i<100;i++){
    const code=otp.randomNumericOtp(),id=otp.randomChallengeId();
    assert.match(code,/^[0-9]{6}$/);
    assert.match(id,/^[a-f0-9]{48}$/);
    codes.add(code);ids.add(id);
  }
  assert.ok(codes.size>1);
  assert.equal(ids.size,100);
  assert.equal(otp.OTP_TTL_SECONDS,120);
  assert.equal(otp.OTP_MAX_ATTEMPTS,5);
});
test('OTP verifier is keyed, phone/challenge-bound and never accepts another code',async()=>{
  const challengeId='a'.repeat(48),phoneE164='+989123456789',code='042619';
  const verifier=await otp.otpVerifier({phoneE164,challengeId,code,secret:SECRET});
  assert.match(verifier,/^[a-f0-9]{64}$/);
  assert.equal(await otp.verifyOtpVerifier({phoneE164,challengeId,code,verifier,secret:SECRET}),true);
  assert.equal(await otp.verifyOtpVerifier({phoneE164,challengeId,code:'042620',verifier,secret:SECRET}),false);
  assert.equal(await otp.verifyOtpVerifier({phoneE164:'+989123456780',challengeId,code,verifier,secret:SECRET}),false);
  assert.equal(await otp.verifyOtpVerifier({phoneE164,challengeId:'b'.repeat(48),code,verifier,secret:SECRET}),false);
  assert.equal(await otp.verifyOtpVerifier({phoneE164,challengeId,code,verifier:'x',secret:SECRET}),false);
});
test('OTP verifier refuses weak secret and malformed code',async()=>{
  await assert.rejects(()=>otp.otpVerifier({phoneE164:'+989123456789',challengeId:'a'.repeat(48),code:'123456',secret:'weak'}),/32 bytes/);
  await assert.rejects(()=>otp.otpVerifier({phoneE164:'+989123456789',challengeId:'a'.repeat(48),code:'12x456',secret:SECRET}),/Invalid/);
});
