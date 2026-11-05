'use strict';
/*
 * OFFLINE CLI for a trusted operator provisioning controlled pilot access.
 * Not a customer login flow, not an account creator, not a payment trigger.
 * Use only with server-side AUTH_HMAC_SECRET, never in public PWA or CI logs.
 */
const {createHmac,randomBytes}=require('node:crypto');
const SUBJECT=/^[A-Za-z0-9][A-Za-z0-9._:@|/-]{0,255}$/;
function issuePilotToken({subject,secret,ttlSeconds=900,nowMs=Date.now()}={}){
 if(typeof subject!=='string'||!SUBJECT.test(subject))throw new TypeError('شناسه هویت تأییدشده معتبر نیست.');
 if(typeof secret!=='string'||Buffer.byteLength(secret,'utf8')<32)throw new TypeError('کلید محرمانه حداقل ۳۲ بایت لازم دارد.');
 if(!Number.isSafeInteger(ttlSeconds)||ttlSeconds<60||ttlSeconds>3600)throw new RangeError('اعتبار توکن باید بین ۶۰ تا ۳۶۰۰ ثانیه باشد.');
 if(!Number.isSafeInteger(nowMs)||nowMs<0)throw new TypeError('زمان سرور نامعتبر است.');
 const iat=Math.floor(nowMs/1000);
 const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
 const payload=Buffer.from(JSON.stringify({iss:'sahamban-pilot',aud:'sahamban-api',sub:subject,
  jti:randomBytes(16).toString('hex'),iat,nbf:iat,exp:iat+ttlSeconds})).toString('base64url');
 const signature=createHmac('sha256',secret).update(header+'.'+payload,'utf8').digest('base64url');
 return header+'.'+payload+'.'+signature;
}
if(require.main===module){
 const subject=process.argv[2],secret=process.env.AUTH_HMAC_SECRET;
 try{
  if(process.argv.length!==3)throw new Error('کاربرد: AUTH_HMAC_SECRET=... node server/mint-pilot-token.cjs VERIFIED_AUTH_SUBJECT');
  process.stdout.write(issuePilotToken({subject,secret})+'\n');
 }catch(_){process.stderr.write('صدور توکن آزمایشی ناموفق: شناسه/کلید/آرگومان نامعتبر.\n');process.exitCode=1;}
}
module.exports=Object.freeze({issuePilotToken});
