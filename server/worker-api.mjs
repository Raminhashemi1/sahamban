import {createPilotPendingOrder,findPilotPendingOrder} from './pilot-orders-api.mjs';
import {createPrepaidOrder,findPrepaidPendingOrder} from './prepaid-orders-api.mjs';
import {prepaidAccountOverview} from './prepaid-account-overview.mjs';
import zarinpalModule from './zarinpal-gateway.cjs';
import settlementModule from './prepaid-settlement.cjs';
const {requestPayment,verifyPayment}=zarinpalModule;
const {settleVerifiedPrepaidPayment}=settlementModule;
import otpServiceModule from './sms-otp-service.cjs';
import otpRepositoryModule from './d1-sms-otp-repository.cjs';
const {createSmsOtpService}=otpServiceModule;
const {createD1SmsOtpRepository}=otpRepositoryModule;

function parseCookie(request,name){
 const raw=request.headers.get('Cookie')||'';
 for(const part of raw.split(';')){
  const i=part.indexOf('=');
  if(i<0||part.slice(0,i).trim()!==name)continue;
  const value=part.slice(i+1).trim();
  return /^[a-f0-9]{64}$/.test(value)?value:null;
 }
 return null;
}
function otpJson(request,body,status,origin,extraHeaders={}){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff','Vary':'Origin',...extraHeaders};
 if(origin){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Credentials']='true';}
 return new Response(JSON.stringify(body),{status,headers});
}
async function readSmallJson(request,maxBytes=1024){
 const declared=request.headers.get('Content-Length');
 if(declared!==null&&(!/^[0-9]+$/.test(declared)||Number(declared)>maxBytes))return {error:'BODY_TOO_LARGE',status:413};
 if(!request.body)return {error:'INVALID_JSON',status:400};
 const reader=request.body.getReader(),chunks=[];let size=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;
   if(size>maxBytes){await reader.cancel();return {error:'BODY_TOO_LARGE',status:413};}
   chunks.push(value);
  }
 }catch(_){return {error:'INVALID_JSON',status:400};}
 const bytes=new Uint8Array(size);let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return {body:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))};}
 catch(_){return {error:'INVALID_JSON',status:400};}
}
function requestOriginAllowed(request,env){
 const origin=request.headers.get('Origin');
 return typeof env?.PWA_ORIGIN==='string'&&origin===env.PWA_ORIGIN&&/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/i.test(env.PWA_ORIGIN);
}
async function keyedIpPseudonym(request,secret){
 const ip=request.headers.get('CF-Connecting-IP');
 if(typeof ip!=='string'||!ip||typeof secret!=='string'||encoder.encode(secret).length<32)return null;
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=await crypto.subtle.sign('HMAC',key,encoder.encode(ip));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
function createSmsBindingAdapter(binding){
 if(!binding||typeof binding.fetch!=='function')return null;
 return {async sendOtp(payload){
  const response=await binding.fetch('https://sms-provider.internal/send',{
   method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':payload.idempotencyKey},
   body:JSON.stringify(payload)
  });
  if(!response.ok)return {accepted:false};
  let result;try{result=await response.json();}catch(_){return {accepted:false};}
  return {accepted:result?.accepted===true,providerMessageId:typeof result?.messageId==='string'?result.messageId:null};
 }};
}
async function handleOtpRoutes(request,env,url,nowMs){
 const route=url.pathname,origin=request.headers.get('Origin');
 const routes=['/api/v1/auth/otp/request','/api/v1/auth/otp/verify','/api/v1/auth/session','/api/v1/auth/logout'];
 if(!routes.includes(route))return null;
 if(env?.SAHMINO_OTP_ENABLED!=='true')return otpJson(request,{error:'FEATURE_DISABLED'},404,null);
 if(!requestOriginAllowed(request,env))return otpJson(request,{error:'ORIGIN_NOT_ALLOWED'},403,null);
 if(url.search)return otpJson(request,{error:'QUERY_NOT_ALLOWED'},400,origin);
 if(!env?.SAHAMBAN_DB||!env?.SAHMINO_OTP_VERIFIER_SECRET||!env?.SAHMINO_OTP_RATE_LIMIT_SECRET)
  return otpJson(request,{error:'AUTH_UNAVAILABLE'},503,origin);
 const cookie=parseCookie(request,'sahmino_session');
 if(route==='/api/v1/auth/otp/request'){
  if(request.method!=='POST')return otpJson(request,{error:'METHOD_NOT_ALLOWED'},405,origin);
  if(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()!=='application/json')return otpJson(request,{error:'JSON_REQUIRED'},415,origin);
  const parsed=await readSmallJson(request,256);
  if(parsed.error)return otpJson(request,{error:parsed.error},parsed.status,origin);
  const body=parsed.body;
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==1||typeof body.phone!=='string')return otpJson(request,{error:'INVALID_REQUEST'},400,origin);
  const repo=createD1SmsOtpRepository(env.SAHAMBAN_DB);
  const adapter=createSmsBindingAdapter(env.SAHMINO_SMS_PROVIDER);
  if(!adapter)return otpJson(request,{error:'SMS_PROVIDER_UNAVAILABLE'},503,origin);
  const ipKey=await keyedIpPseudonym(request,env.SAHMINO_OTP_RATE_LIMIT_SECRET);
  if(!ipKey)return otpJson(request,{error:'AUTH_UNAVAILABLE'},503,origin);
  const service=createSmsOtpService({repository:repo,adapter,verifierSecret:env.SAHMINO_OTP_VERIFIER_SECRET});
  const result=await service.requestCode({phone:body.phone,ipKey});
  return otpJson(request,result.ok?{challengeId:result.challengeId,expiresInSeconds:result.expiresInSeconds,resendAfterSeconds:result.resendAfterSeconds}:{error:result.error,retryAfterSeconds:result.retryAfterSeconds},result.status,origin);
 }
 if(route==='/api/v1/auth/otp/verify'){
  if(request.method!=='POST')return otpJson(request,{error:'METHOD_NOT_ALLOWED'},405,origin);
  if(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()!=='application/json')return otpJson(request,{error:'JSON_REQUIRED'},415,origin);
  const parsed=await readSmallJson(request,256);
  if(parsed.error)return otpJson(request,{error:parsed.error},parsed.status,origin);
  const body=parsed.body;
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==2||typeof body.challengeId!=='string'||typeof body.code!=='string')return otpJson(request,{error:'INVALID_REQUEST'},400,origin);
  const repo=createD1SmsOtpRepository(env.SAHAMBAN_DB);
  const adapter={async sendOtp(){return {accepted:false};}};
  const service=createSmsOtpService({repository:repo,adapter,verifierSecret:env.SAHMINO_OTP_VERIFIER_SECRET});
  const result=await service.verifyCode({challengeId:body.challengeId,code:body.code});
  if(!result.ok)return otpJson(request,{error:result.error},result.status,origin);
  return otpJson(request,{authenticated:true},200,origin,{'Set-Cookie':result.sessionCookie});
 }
 if(route==='/api/v1/auth/session'){
  const repo=createD1SmsOtpRepository(env.SAHAMBAN_DB);
  const clearCookie=repo.clearSessionCookie();
  if(request.method!=='GET')return otpJson(request,{error:'METHOD_NOT_ALLOWED'},405,origin);
  if(!cookie)return otpJson(request,{authenticated:false},401,origin);
  const active=await repo.findActiveSession(cookie,nowMs);
  return active?otpJson(request,{authenticated:true,expiresAt:active.expiresAt},200,origin):otpJson(request,{authenticated:false},401,origin,{'Set-Cookie':clearCookie});
 }
 if(route==='/api/v1/auth/logout'){
  const repo=createD1SmsOtpRepository(env.SAHAMBAN_DB);
  const clearCookie=repo.clearSessionCookie();
  if(request.method!=='POST')return otpJson(request,{error:'METHOD_NOT_ALLOWED'},405,origin);
  if(request.headers.get('X-Sahmino-CSRF')!=='1')return otpJson(request,{error:'CSRF_REJECTED'},403,origin,{'Set-Cookie':clearCookie});
  if(cookie)await repo.revokeSession(cookie,new Date(nowMs).toISOString());
  return otpJson(request,{authenticated:false},200,origin,{'Set-Cookie':clearCookie});
 }
 return otpJson(request,{error:'NOT_FOUND'},404,origin);
}

/*
 * Sahamban Pro — Cloudflare Workers API prototype, NO production deployment.
 * Read-only entitlement lookup and optional private-pilot pending-order
 * records. NO checkout, payment verification, enrollment, login or banking.
 * Environment: SAHAMBAN_DB (private D1 binding), AUTH_HMAC_SECRET (secret),
 * PWA_ORIGIN (exact origin, e.g. https://raminhashemi1.github.io).
 * The short-lived HMAC token is for a controlled private pilot, not a
 * substitute for a full user login/identity service for commercial launch.
 */
const TOKEN_ISSUER='sahamban-pilot',TOKEN_AUDIENCE='sahamban-api';
const SUBJECT=/^[A-Za-z0-9][A-Za-z0-9._:@|/-]{0,255}$/;
const TOKEN_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const QUERY=`SELECT u.id AS user_id, u.status AS account_status,
 CASE WHEN pe.paid_until IS NOT NULL AND (le.paid_until IS NULL OR pe.paid_until>le.paid_until) THEN pe.paid_until ELSE le.paid_until END AS paid_until,
 COALESCE(le.suspended,0) AS suspended,COALESCE(le.auto_renew_cancelled,0) AS auto_renew_cancelled
 FROM sahamban_users u
 LEFT JOIN subscription_entitlements le ON le.user_id=u.id
 LEFT JOIN prepaid_subscription_entitlements pe ON pe.user_id=u.id
 WHERE u.auth_subject=? LIMIT 1`;
const encoder=new TextEncoder();
function send(body,status=200,origin=null){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(origin){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Credentials']='true';}
 return new Response(JSON.stringify(body),{status,headers});
}
function redirect(url){return new Response(null,{status:303,headers:{Location:url,'Cache-Control':'no-store'} });}
async function handleZarinpal(request,env,url,nowMs){
 const route=url.pathname;
 if(route==='/api/v1/payments/zarinpal/callback'){
  if(request.method!=='GET')return send({error:'METHOD_NOT_ALLOWED'},405);
  const authority=url.searchParams.get('Authority'),status=url.searchParams.get('Status');
  if(url.searchParams.size!==2||!authority||!status)return send({error:'INVALID_CALLBACK'},400);
  const intent=await env?.SAHAMBAN_DB?.prepare(`SELECT i.order_id,o.plan_id,o.amount_rial,o.currency
   FROM sahmino_payment_intents i JOIN sahmino_prepaid_subscription_orders o ON o.id=i.order_id
   WHERE i.authority=? AND i.provider_name='ZARINPAL' AND i.state='REQUESTED' AND o.state='PENDING' LIMIT 1`).bind(authority).first();
  const target=new URL('/?sahmino_payment=',env?.PWA_ORIGIN||'https://invalid.local');
  if(!intent||status!=='OK'){
   if(intent)await env.SAHAMBAN_DB.prepare("UPDATE sahmino_payment_intents SET state='FAILED' WHERE authority=? AND state='REQUESTED'").bind(authority).run();
   if(intent)await env.SAHAMBAN_DB.prepare("UPDATE sahmino_prepaid_subscription_orders SET state='CANCELLED' WHERE id=? AND state='PENDING'").bind(intent.order_id).run();
   target.searchParams.set('sahmino_payment','failed');return redirect(target.toString());
  }
  try{
   const verified=await verifyPayment({env,authority,amountRial:intent.amount_rial});
   const result=await settleVerifiedPrepaidPayment(env.SAHAMBAN_DB,{...verified,orderId:intent.order_id,planId:intent.plan_id},{now:new Date(nowMs).toISOString()});
   if(!result.ok)throw Error(result.reason);
   await env.SAHAMBAN_DB.prepare("UPDATE sahmino_payment_intents SET state='SETTLED',provider_payment_id=?,verified_at=? WHERE authority=? AND state='REQUESTED'").bind(verified.providerPaymentId,new Date(nowMs).toISOString(),authority).run();
   target.searchParams.set('sahmino_payment','success');
  }catch(_){target.searchParams.set('sahmino_payment','pending_review');}
  return redirect(target.toString());
 }
 if(route!=='/api/v1/me/prepaid-checkout')return null;
 if(request.method!=='POST')return send({error:'METHOD_NOT_ALLOWED'},405);
 if(env?.ZARINPAL_ENABLED!=='true'||env?.PREPAID_ORDERS_ENABLED!=='true'||env?.ZARINPAL_MERCHANT_ID==null)
  return send({error:'PAYMENT_UNAVAILABLE'},503);
 const origin=request.headers.get('Origin');
 if(!requestOriginAllowed(request,env))return send({error:'ORIGIN_NOT_ALLOWED'},403);
 if(request.headers.get('X-Sahmino-CSRF')!=='1'||request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()!=='application/json')
  return send({error:'CSRF_OR_CONTENT_TYPE_REJECTED'},403,origin);
 const cookie=parseCookie(request,'sahmino_session');if(!cookie)return send({error:'NOT_AUTHENTICATED'},401,origin);
 const session=await createD1SmsOtpRepository(env?.SAHAMBAN_DB).findActiveSession(cookie,nowMs);
 if(!session?.userId)return send({error:'NOT_AUTHENTICATED'},401,origin);
 const parsed=await readSmallJson(request,1024);if(parsed.error)return send({error:parsed.error},parsed.status,origin);
 const body=parsed.body;if(!body||Object.keys(body).length!==1||typeof body.planId!=='string')return send({error:'INVALID_REQUEST'},400,origin);
 const order=await createPrepaidOrder(env.SAHAMBAN_DB,{authenticatedUserId:session.userId,planId:body.planId,now:new Date(nowMs).toISOString(),makeOrderId:()=>('ord_'+Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''))});
 if(order.status!==201)return send(order,order.status||503,origin);
 try{
  const payment=await requestPayment({env,order:order.order,callbackUrl:env.ZARINPAL_CALLBACK_URL,description:'Sahmino subscription '+order.order.planId});
  const inserted=await env.SAHAMBAN_DB.prepare("INSERT INTO sahmino_payment_intents(authority,order_id,provider_name,created_at,state) VALUES(?,?,'ZARINPAL',?,'REQUESTED')").bind(payment.authority,order.order.id,new Date(nowMs).toISOString()).run();
  if(inserted?.meta?.changes!==1)throw Error('INTENT_NOT_STORED');
  return send({status:200,checkoutUrl:payment.paymentUrl,orderId:order.order.id},200,origin);
 }catch(_){
  await env.SAHAMBAN_DB.prepare("UPDATE sahmino_prepaid_subscription_orders SET state='CANCELLED' WHERE id=? AND state='PENDING'").bind(order.order.id).run().catch(()=>{});
  return send({error:'PAYMENT_REQUEST_FAILED',orderId:order.order.id},502,origin);
 }
}

 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(origin)headers['Access-Control-Allow-Origin']=origin;
 return new Response(JSON.stringify(body),{status,headers});
}
function fromBase64url(value){
 if(typeof value!=='string'||!value||!/^[A-Za-z0-9_-]+$/.test(value)||value.length>4096)throw Error('token encoding');
 const base=value.replace(/-/g,'+').replace(/_/g,'/');
 const raw=atob(base+'='.repeat((4-base.length%4)%4));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
async function verifyPilotToken(authHeader,secret,nowMs){
 if(typeof authHeader!=='string'||!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(authHeader)||authHeader.length>5000)return null;
 if(typeof secret!=='string'||encoder.encode(secret).length<32)return null;
 const token=authHeader.slice(7),parts=token.split('.');
 try{
  const head=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(fromBase64url(parts[0])));
  if(!head||head.alg!=='HS256'||head.typ!=='JWT'||Object.keys(head).sort().join(',')!=='alg,typ')return null;
  const signed=encoder.encode(parts[0]+'.'+parts[1]),tag=fromBase64url(parts[2]);
  if(tag.length!==32)return null;
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('HMAC',key,tag,signed))return null;
  const p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(fromBase64url(parts[1])));
  if(!p||p.iss!==TOKEN_ISSUER||p.aud!==TOKEN_AUDIENCE||
     typeof p.sub!=='string'||!SUBJECT.test(p.sub)||typeof p.jti!=='string'||!TOKEN_ID.test(p.jti))return null;
  for(const k of ['iat','nbf','exp'])if(!Number.isSafeInteger(p[k]))return null;
  const now=Math.floor(nowMs/1000);
  // Maximum one-hour lifetime. Some clock skew on nbf/iat, never on exp.
  if(p.exp<=now||p.nbf>now+30||p.iat>now+30||p.iat>p.nbf||
     p.exp<=p.iat||p.exp-p.iat>3600||p.exp-p.nbf>3600)return null;
  return p.sub;
 }catch(_){return null;}
}
function parsePaidUntil(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))return null;
 const n=Date.parse(value);
 return Number.isFinite(n)&&new Date(n).toISOString().slice(0,19)===value.slice(0,19)?n:null;
}
async function lookupEntitlement(db,subject,nowMs){
 if(!db||typeof db.prepare!=='function')return {state:'UNAVAILABLE',http:503};
 try{
  const row=await db.prepare(QUERY).bind(subject).first();
  if(!row||row.account_status!=='ACTIVE'||typeof row.user_id!=='string')return {state:'INACTIVE',http:403};
  if(row.paid_until===null)return {state:'NO_SUBSCRIPTION',http:403};
  if((row.suspended!==0&&row.suspended!==1)||(row.auto_renew_cancelled!==0&&row.auto_renew_cancelled!==1))return {state:'UNAVAILABLE',http:503};
  if(row.suspended===1)return {state:'PAYMENT_REVIEW_REQUIRED',http:403};
  const until=parsePaidUntil(row.paid_until);
  if(until===null)return {state:'UNAVAILABLE',http:503};
  if(until<=nowMs)return {state:'EXPIRED',http:403};
  return {state:'ACTIVE',http:200,paidUntil:row.paid_until,autoRenewCancelled:row.auto_renew_cancelled===1};
 }catch(_){return {state:'UNAVAILABLE',http:503};}
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),nowMs=Date.now(),origin=request.headers.get('Origin'),allowed=typeof env?.PWA_ORIGIN==='string'&&/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/i.test(env.PWA_ORIGIN)?env.PWA_ORIGIN:null;
  const cors=origin&&allowed&&origin===allowed?origin:null;
  if(request.method==='OPTIONS'){
   if(!cors)return send({error:'ORIGIN_NOT_ALLOWED'},403);
   return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':cors,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type, X-Sahmino-CSRF','Access-Control-Max-Age':'300','Cache-Control':'no-store','Vary':'Origin'}});
  }
  const otpResponse=await handleOtpRoutes(request,env,url,nowMs);
  if(otpResponse)return otpResponse;
  const paymentResponse=await handleZarinpal(request,env,url,nowMs);
  if(paymentResponse)return paymentResponse;
  if(request.method!=='GET'&&request.method!=='POST')return send({error:'METHOD_NOT_ALLOWED'},405,cors);
  if(url.pathname==='/api/v1/health'&&request.method==='GET')return send({status:'prototype',paymentsEnabled:false,checkoutEnabled:false},200,cors);
  const isEntitlement=url.pathname==='/api/v1/me/entitlement';
  const isOrders=url.pathname==='/api/v1/me/orders';
  const isPrepaidOrders=url.pathname==='/api/v1/me/prepaid-orders';
  const isPrepaidOverview=url.pathname==='/api/v1/me/prepaid-overview';
  if(!isEntitlement&&!isOrders&&!isPrepaidOrders&&!isPrepaidOverview)return send({error:'NOT_FOUND'},404,cors);
  if(isEntitlement&&request.method!=='GET')return send({error:'METHOD_NOT_ALLOWED'},405,cors);
  if(isOrders&&request.method!=='GET'&&request.method!=='POST')return send({error:'METHOD_NOT_ALLOWED'},405,cors);
  if(isPrepaidOrders&&request.method!=='GET'&&request.method!=='POST')return send({error:'METHOD_NOT_ALLOWED'},405,cors);
  if(isPrepaidOverview&&request.method!=='GET')return send({error:'METHOD_NOT_ALLOWED'},405,cors);
  if(origin&&!cors)return send({error:'ORIGIN_NOT_ALLOWED'},403);
  if(url.search)return send({error:'QUERY_NOT_ALLOWED'},400,cors);
  // Cookie-authenticated Sahmino account routes. The internal user ID is
  // derived only from a validated, unrevoked OTP session in D1; never from input.
  if(isPrepaidOrders||isPrepaidOverview){
   const sessionCookie=parseCookie(request,'sahmino_session');
   if(sessionCookie){
    if(env?.SAHMINO_OTP_ENABLED!=='true'||env?.PREPAID_ORDERS_ENABLED!=='true')
     return send({error:'FEATURE_DISABLED'},404,cors);
    if(!cors||origin!==allowed)return send({error:'ORIGIN_NOT_ALLOWED'},403);
    const sessionRepo=createD1SmsOtpRepository(env?.SAHAMBAN_DB);
    const activeSession=await sessionRepo.findActiveSession(sessionCookie,nowMs);
    if(!activeSession?.userId)return send({proEnabled:false,reason:'NOT_AUTHENTICATED'},401,cors);
    if(request.method==='POST'&&request.headers.get('X-Sahmino-CSRF')!=='1')
     return send({error:'CSRF_REJECTED'},403,cors);
    if(isPrepaidOverview){
     const result=await prepaidAccountOverview(env?.SAHAMBAN_DB,{
      authenticatedUserId:activeSession.userId,now:new Date(nowMs).toISOString()
     });
     return send(result,result.status||503,cors);
    }
    if(request.method==='GET'){
     const pending=await findPrepaidPendingOrder(env?.SAHAMBAN_DB,null,activeSession.userId);
     return send(pending,pending.status||200,cors);
    }
    if(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()!=='application/json')
     return send({error:'JSON_REQUIRED'},415,cors);
    const parsed=await readSmallJson(request,1024);
    if(parsed.error)return send({error:parsed.error},parsed.status,cors);
    const body=parsed.body;
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length!==1||typeof body.planId!=='string')
     return send({error:'INVALID_REQUEST'},400,cors);
    const order=await createPrepaidOrder(env?.SAHAMBAN_DB,{
     authenticatedUserId:activeSession.userId,planId:body.planId,now:new Date(nowMs).toISOString(),
     makeOrderId:()=>('ord_'+Array.from(crypto.getRandomValues(new Uint8Array(16)),
      b=>b.toString(16).padStart(2,'0')).join(''))
    });
    return send(order,order.status||503,cors);
   }
  }
  const subject=await verifyPilotToken(request.headers.get('Authorization'),env?.AUTH_HMAC_SECRET,nowMs);
  if(!subject)return send({proEnabled:false,reason:'NOT_AUTHENTICATED'},401,cors);
  if(isPrepaidOverview){
   if(env?.PREPAID_ORDERS_ENABLED!=='true')return send({error:'FEATURE_DISABLED'},404,cors);
   const result=await prepaidAccountOverview(env?.SAHAMBAN_DB,{
    authenticatedSubject:subject,now:new Date(nowMs).toISOString()
   });
   return send(result,result.status||503,cors);
  }
  if(isPrepaidOrders){
   // Controlled pilot only. Disabled by default; commercial identity and D1
   // migration are prerequisites before enabling. Never accepts client prices.
   if(env?.PREPAID_ORDERS_ENABLED!=='true')return send({error:'FEATURE_DISABLED'},404,cors);
   if(request.method==='GET'){
    const pending=await findPrepaidPendingOrder(env?.SAHAMBAN_DB,subject);
    return send(pending,pending.status||200,cors);
   }
   if(request.method==='POST'){
    if(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()!=='application/json')
     return send({error:'JSON_REQUIRED'},415,cors);
    const length=request.headers.get('Content-Length');
    if(length!==null&&(!/^[0-9]+$/.test(length)||Number(length)>1024))return send({error:'BODY_TOO_LARGE'},413,cors);
    let body;
    try{body=await request.json();}catch(_){return send({error:'INVALID_JSON'},400,cors);}
    if(!body||typeof body!=='object'||Array.isArray(body)||
      Object.keys(body).length!==1||typeof body.planId!=='string')
     return send({error:'INVALID_REQUEST'},400,cors);
    const order=await createPrepaidOrder(env?.SAHAMBAN_DB,{
     authenticatedSubject:subject,planId:body.planId,now:new Date(nowMs).toISOString(),
     makeOrderId:()=>('ord_'+Array.from(crypto.getRandomValues(new Uint8Array(16)),
      b=>b.toString(16).padStart(2,'0')).join(''))
    });
    return send(order,order.status||503,cors);
   }
  }
  if(isOrders){
   if(request.method==='POST'){
    // No body is necessary or accepted: identity and price are server-trusted.
    const length=request.headers.get('Content-Length');
    if(length!==null&&length!=='0')return send({error:'REQUEST_BODY_NOT_ALLOWED'},400,cors);
    // Workers may expose an empty POST body as a readable stream instead of null.
    // Reject the first actual byte without buffering an attacker-controlled body.
    if(request.body){
     const reader=request.body.getReader();
     let first;
     try{first=await reader.read();}catch(_){return send({error:'REQUEST_BODY_NOT_ALLOWED'},400,cors);}
     finally{reader.cancel().catch(()=>{});}
     if(!first.done)return send({error:'REQUEST_BODY_NOT_ALLOWED'},400,cors);
    }
    const order=await createPilotPendingOrder(env?.SAHAMBAN_DB,{
     authenticatedSubject:subject,now:new Date(nowMs).toISOString(),
     configuredPriceRial:env?.PILOT_ANNUAL_PRICE_RIAL,
     enabled:env?.PILOT_ORDERS_ENABLED==='true',
     makeOrderId:()=>('ord_'+Array.from(crypto.getRandomValues(new Uint8Array(16)),
       b=>b.toString(16).padStart(2,'0')).join(''))
    });
    return send(order,order.status,cors);
   }
   const pending=await findPilotPendingOrder(env?.SAHAMBAN_DB,subject);
   return send(pending,pending.status,cors);
  }
  const result=await lookupEntitlement(env?.SAHAMBAN_DB,subject,nowMs);
  if(result.http!==200)return send({proEnabled:false,reason:result.state},result.http,cors);
  return send({proEnabled:true,reason:'ACTIVE',paidUntil:result.paidUntil,autoRenewCancelled:result.autoRenewCancelled},200,cors);
 }
};
export {verifyPilotToken,lookupEntitlement};
