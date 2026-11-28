'use strict';

const cryptoApi=globalThis.crypto;
if(!cryptoApi?.subtle)throw new Error('Web Crypto API is required');
const encoder=new TextEncoder();
const PASSWORD_ITERATIONS=310000;
const PASSWORD_BYTES=32;
const SESSION_TTL_SECONDS=30*24*60*60;
const WINDOW_SECONDS=15*60;
const USERNAME_LIMIT=8;
const IP_LIMIT=30;

function randomHex(bytes){
 return Array.from(cryptoApi.getRandomValues(new Uint8Array(bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}
function hex(bytes){return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
function fromHex(value){if(typeof value!=='string'||!/^(?:[a-f0-9]{2})+$/.test(value))return null;return Uint8Array.from(value.match(/../g),x=>parseInt(x,16));}
function asciiDigits(value){
 return value.replace(/[\u06f0-\u06f9]/g,c=>String(c.charCodeAt(0)-0x06f0))
  .replace(/[\u0660-\u0669]/g,c=>String(c.charCodeAt(0)-0x0660));
}
function normalizeUsername(value){
 if(typeof value!=='string'||value.length>40)return null;
 let s=asciiDigits(value.normalize('NFKC')).replace(/[\s()-]/g,'');
 if(/^09[0-9]{9}$/.test(s))s='+98'+s.slice(1);
 else if(/^989[0-9]{9}$/.test(s))s='+'+s;
 else if(/^00989[0-9]{9}$/.test(s))s='+'+s.slice(2);
 if(!/^\+989[0-9]{9}$/.test(s))return null;
 return s;
}
function validPassword(value){
 return typeof value==='string'&&value.length>=12&&value.length<=128&&
  encoder.encode(value).length<=256&&!/[\u0000-\u001f\u007f]/.test(value);
}
async function derivePassword(password,salt,iterations=PASSWORD_ITERATIONS){
 const key=await cryptoApi.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await cryptoApi.subtle.deriveBits({name:'PBKDF2',salt,iterations,hash:'SHA-256'},key,PASSWORD_BYTES*8);
 return new Uint8Array(bits);
}
async function hashPassword(password){
 if(!validPassword(password))throw new TypeError('Password must be 12-128 characters');
 const salt=cryptoApi.getRandomValues(new Uint8Array(16));
 const digest=await derivePassword(password,salt);
 return {salt:hex(salt),hash:hex(digest),iterations:PASSWORD_ITERATIONS};
}
async function hmacHex(secret,value){
 const key=await cryptoApi.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(await cryptoApi.subtle.sign('HMAC',key,encoder.encode(value)));
}
async function sha256Hex(value){return hex(await cryptoApi.subtle.digest('SHA-256',encoder.encode(value)));}
function constantTimeEqual(a,b){
 if(!(a instanceof Uint8Array)||!(b instanceof Uint8Array)||a.length!==b.length)return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
function createPasswordAuth(db,{clock=()=>Date.now(),sessionTtlSeconds=SESSION_TTL_SECONDS}={}){
 if(!db||typeof db.prepare!=='function'||typeof db.batch!=='function')throw new TypeError('D1 binding required');
 if(!Number.isSafeInteger(sessionTtlSeconds)||sessionTtlSeconds<300||sessionTtlSeconds>90*24*60*60)throw new TypeError('Invalid session TTL');
 const iso=ms=>new Date(ms).toISOString();
 async function reserveLoginAttempt({usernameKey,ipKey,secret,now}){
  if(typeof secret!=='string'||encoder.encode(secret).length<32||typeof ipKey!=='string'||ipKey.length<8)return false;
  const [userBucket,ipBucket]=await Promise.all([hmacHex(secret,'username:'+usernameKey),hmacHex(secret,'ip:'+ipKey)]);
  const epoch=Math.floor(now/1000),windowStart=epoch-WINDOW_SECONDS,stamp=iso(now);
  const upsert=(key,limit)=>db.prepare(`INSERT INTO sahmino_auth_rate_limits(bucket_key,window_started_epoch,attempts,updated_at)
   VALUES(?,?,1,?)
   ON CONFLICT(bucket_key) DO UPDATE SET
    window_started_epoch=CASE WHEN sahmino_auth_rate_limits.window_started_epoch<=? THEN excluded.window_started_epoch ELSE sahmino_auth_rate_limits.window_started_epoch END,
    attempts=CASE WHEN sahmino_auth_rate_limits.window_started_epoch<=? THEN 1 ELSE sahmino_auth_rate_limits.attempts+1 END,
    updated_at=excluded.updated_at
   WHERE sahmino_auth_rate_limits.window_started_epoch<=? OR sahmino_auth_rate_limits.attempts<?`)
   .bind(key,epoch,stamp,windowStart,windowStart,windowStart,limit);
  const results=await db.batch([upsert(userBucket,USERNAME_LIMIT),upsert(ipBucket,IP_LIMIT),
   db.prepare('DELETE FROM sahmino_auth_rate_limits WHERE updated_at<?').bind(iso(now-7*24*60*60*1000))]);
  return results?.length===3&&results[0]?.meta?.changes===1&&results[1]?.meta?.changes===1;
 }
 async function createSession(userId,authenticatedAt){
  const bearer=randomHex(32),tokenHash=await sha256Hex(bearer),sessionId='ses_'+randomHex(16);
  const expiresAt=iso(Date.parse(authenticatedAt)+sessionTtlSeconds*1000);
  const result=await db.prepare(`INSERT INTO sahmino_shared_sessions(id,user_id,token_hash,created_at,expires_at,last_seen_at)
   SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sahamban_users WHERE id=? AND status='ACTIVE'
    AND username_normalized IS NOT NULL AND password_hash IS NOT NULL)`)
   .bind(sessionId,userId,tokenHash,authenticatedAt,expiresAt,authenticatedAt,userId).run();
  if(result.meta?.changes!==1)return null;
  return {cookie:'sahmino_session='+bearer+'; Path=/; HttpOnly; Secure; SameSite=None; Max-Age='+sessionTtlSeconds};
 }
 async function login({username,password,ipKey,rateLimitSecret,now=clock()}){
  const normalized=normalizeUsername(username);
  if(!normalized||!validPassword(password))return {ok:false,status:400,error:'INVALID_CREDENTIALS'};
  if(typeof rateLimitSecret!=='string'||encoder.encode(rateLimitSecret).length<32||typeof ipKey!=='string'||ipKey.length<8)
   return {ok:false,status:503,error:'AUTH_UNAVAILABLE'};
  const allowed=await reserveLoginAttempt({usernameKey:normalized,ipKey,secret:rateLimitSecret,now});
  if(!allowed)return {ok:false,status:429,error:'LOGIN_RATE_LIMITED'};
  const row=await db.prepare(`SELECT id,status,password_salt AS salt,password_hash AS hash,
   password_iterations AS iterations FROM sahamban_users WHERE username_normalized=? LIMIT 1`).bind(normalized).first();
  const salt=row?fromHex(row.salt):null,expected=row?fromHex(row.hash):null;
  const validRecord=!!row&&row.status==='ACTIVE'&&salt?.length===16&&expected?.length===PASSWORD_BYTES&&
   Number.isSafeInteger(row.iterations)&&row.iterations>=200000&&row.iterations<=600000;
  // Always perform the same PBKDF2 work for unknown/malformed accounts to reduce enumeration.
  const actual=await derivePassword(password,validRecord?salt:new Uint8Array(16),validRecord?row.iterations:PASSWORD_ITERATIONS);
  const matches=constantTimeEqual(actual,validRecord?expected:new Uint8Array(PASSWORD_BYTES));
  if(!validRecord||!matches)return {ok:false,status:401,error:'INVALID_CREDENTIALS'};
  const authenticatedAt=iso(now),session=await createSession(row.id,authenticatedAt);
  if(!session)return {ok:false,status:503,error:'SESSION_UNAVAILABLE'};
  return {ok:true,status:200,userId:row.id,sessionCookie:session.cookie};
 }
 async function recoverPassword({username,recoveryCode,newPassword,ipKey,rateLimitSecret,now=clock()}){
  const normalized=normalizeUsername(username);
  if(!normalized||typeof recoveryCode!=='string'||!validPassword(newPassword))
   return {ok:false,status:400,error:'INVALID_RECOVERY'};
  const code=recoveryCode.toUpperCase().replace(/[ -]/g,'');
  if(!/^[A-F0-9]{24}$/.test(code))
   return {ok:false,status:400,error:'INVALID_RECOVERY'};
  if(typeof rateLimitSecret!=='string'||encoder.encode(rateLimitSecret).length<32||
     typeof ipKey!=='string'||ipKey.length<8)
   return {ok:false,status:503,error:'AUTH_UNAVAILABLE'};
  const allowed=await reserveLoginAttempt({usernameKey:normalized,ipKey,secret:rateLimitSecret,now});
  if(!allowed)return {ok:false,status:429,error:'LOGIN_RATE_LIMITED'};
  const digest=await sha256Hex(code);
  const credentials=await hashPassword(newPassword);
  const resetId='rst_'+randomHex(16),stamp=iso(now);
  // Update the account only when the supplied one-time code exists and is unused.
  // Consume that exact code only if the password update changed one active account row.
  const results=await db.batch([
   db.prepare(`UPDATE sahamban_users SET password_salt=?,password_hash=?,password_iterations=?
    WHERE id=(SELECT rc.user_id FROM sahmino_recovery_codes rc
     JOIN sahamban_users u ON u.id=rc.user_id
     WHERE u.username_normalized=? AND u.status='ACTIVE'
      AND rc.code_hash=? AND rc.used_at IS NULL LIMIT 1) AND status='ACTIVE'`)
    .bind(credentials.salt,credentials.hash,credentials.iterations,normalized,digest),
   db.prepare(`UPDATE sahmino_recovery_codes SET used_at=?,reset_id=?
    WHERE user_id=(SELECT id FROM sahamban_users WHERE username_normalized=? AND status='ACTIVE')
     AND code_hash=? AND used_at IS NULL AND changes()=1`).bind(stamp,resetId,normalized,digest),
   db.prepare(`UPDATE sahmino_shared_sessions SET revoked_at=?
    WHERE user_id=(SELECT user_id FROM sahmino_recovery_codes WHERE reset_id=?)
     AND revoked_at IS NULL AND changes()=1`).bind(stamp,resetId)
  ]);
  if(results?.length!==3||results[0]?.meta?.changes!==1||results[1]?.meta?.changes!==1)
   return {ok:false,status:400,error:'INVALID_RECOVERY'};
  return {ok:true,status:200};
 }
 async function findActiveSession(bearer,now=clock()){
  if(typeof bearer!=='string'||!/^[a-f0-9]{64}$/.test(bearer))return null;
  const tokenHash=await sha256Hex(bearer);
  return (await db.prepare(`SELECT s.id AS sessionId,s.user_id AS userId,s.expires_at AS expiresAt
   FROM sahmino_shared_sessions s JOIN sahamban_users u ON u.id=s.user_id
   WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.status='ACTIVE'
    AND u.username_normalized IS NOT NULL AND u.password_hash IS NOT NULL LIMIT 1`)
   .bind(tokenHash,iso(now)).first())||null;
 }
 async function revokeSession(bearer,revokedAt=iso(clock())){
  if(typeof bearer!=='string'||!/^[a-f0-9]{64}$/.test(bearer))return false;
  const tokenHash=await sha256Hex(bearer);
  const result=await db.prepare(`UPDATE sahmino_shared_sessions SET revoked_at=?
   WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?`).bind(revokedAt,tokenHash,revokedAt).run();
  return result.meta?.changes===1;
 }
 function clearSessionCookie(){return 'sahmino_session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0';}
 return Object.freeze({login,recoverPassword,findActiveSession,revokeSession,clearSessionCookie});
}
function createRecoveryCodes(count=10){
 if(!Number.isSafeInteger(count)||count<1||count>20)throw new TypeError('Invalid recovery-code count');
 return Array.from({length:count},()=>randomHex(12).toUpperCase().match(/.{1,6}/g).join('-'));
}
module.exports={createPasswordAuth,normalizeUsername,validPassword,hashPassword,createRecoveryCodes,PASSWORD_ITERATIONS};
