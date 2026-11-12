import {createPilotPendingOrder,findPilotPendingOrder} from './pilot-orders-api.mjs';
import {createPrepaidOrder,findPrepaidPendingOrder} from './prepaid-orders-api.mjs';
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
   return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':cors,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization','Access-Control-Max-Age':'300','Cache-Control':'no-store','Vary':'Origin'}});
  }
  if(request.method!=='GET'&&request.method!=='POST')return send({error:'METHOD_NOT_ALLOWED'},405,cors);
  if(url.pathname==='/api/v1/health'&&request.method==='GET')return send({status:'prototype',paymentsEnabled:false,checkoutEnabled:false},200,cors);
  const isEntitlement=url.pathname==='/api/v1/me/entitlement';
  const isOrders=url.pathname==='/api/v1/me/orders';
  const isPrepaidOrders=url.pathname==='/api/v1/me/prepaid-orders';
  if(!isEntitlement&&!isOrders&&!isPrepaidOrders)return send({error:'NOT_FOUND'},404,cors);
  if(isEntitlement&&request.method!=='GET')return send({error:'METHOD_NOT_ALLOWED'},405,cors);
  if(isOrders&&request.method!=='GET'&&request.method!=='POST')return send({error:'METHOD_NOT_ALLOWED'},405,cors);
  if(isPrepaidOrders&&request.method!=='GET'&&request.method!=='POST')return send({error:'METHOD_NOT_ALLOWED'},405,cors);
  if(origin&&!cors)return send({error:'ORIGIN_NOT_ALLOWED'},403);
  if(url.search)return send({error:'QUERY_NOT_ALLOWED'},400,cors);
  const subject=await verifyPilotToken(request.headers.get('Authorization'),env?.AUTH_HMAC_SECRET,nowMs);
  if(!subject)return send({proEnabled:false,reason:'NOT_AUTHENTICATED'},401,cors);
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
    if(length!==null&&(!/^\\d+$/.test(length)||Number(length)>1024))return send({error:'BODY_TOO_LARGE'},413,cors);
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
