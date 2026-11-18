'use strict';
// CafeBazaar Developer API v2 subscription cancellation.
// The purchase token is supplied by the caller only after authenticated D1 lookup
// and AES-GCM decryption. Never log credentials, access tokens or purchase tokens.
const {SKU_BY_PLAN}=require('./bazaar-subscription-verifier.cjs');
const PACKAGE=/^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+$/;
async function cancelBazaarSubscription({packageName,planId,purchaseToken,clientId,clientSecret,refreshToken,fetchImpl=fetch}={}){
 if(typeof packageName!=='string'||!PACKAGE.test(packageName)||
  typeof planId!=='string'||!SKU_BY_PLAN[planId]||
  typeof purchaseToken!=='string'||purchaseToken.length<16||purchaseToken.length>4096||/\s/.test(purchaseToken)||
  typeof clientId!=='string'||!clientId||typeof clientSecret!=='string'||!clientSecret||
  typeof refreshToken!=='string'||!refreshToken||typeof fetchImpl!=='function')
  return {ok:false,reason:'BAZAAR_CANCELLATION_NOT_CONFIGURED'};
 try{
  const form=new URLSearchParams({grant_type:'refresh_token',client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken});
  const auth=await fetchImpl('https://pardakht.cafebazaar.ir/devapi/v2/auth/token/',{
   method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form.toString()
  });
  if(!auth?.ok)return {ok:false,reason:'BAZAAR_OAUTH_FAILED'};
  const credentials=await auth.json();
  if(!credentials||typeof credentials.access_token!=='string'||!credentials.access_token||
   !Number.isSafeInteger(credentials.expires_in)||credentials.expires_in<=0)
   return {ok:false,reason:'BAZAAR_OAUTH_INVALID'};
  const url='https://pardakht.cafebazaar.ir/devapi/v2/api/applications/'+encodeURIComponent(packageName)+
   '/subscriptions/'+encodeURIComponent(SKU_BY_PLAN[planId])+'/purchases/'+encodeURIComponent(purchaseToken)+
   '/cancel/?access_token='+encodeURIComponent(credentials.access_token);
  const response=await fetchImpl(url,{method:'GET',headers:{'Accept':'application/json'}});
  if(!response?.ok)return {ok:false,reason:'BAZAAR_CANCELLATION_FAILED'};
  // Bazaar's Developer API wrapper models a successful cancellation response
  // as an empty success object; provider errors are returned as error fields.
  let body=null;
  if(typeof response.text==='function'){
   const raw=await response.text();
   if(raw.length>16384)return {ok:false,reason:'BAZAAR_CANCELLATION_INVALID_RESPONSE'};
   if(raw){try{body=JSON.parse(raw);}catch(_){return {ok:false,reason:'BAZAAR_CANCELLATION_INVALID_RESPONSE'};}}
  }else if(typeof response.json==='function'){
   try{body=await response.json();}catch(_){return {ok:false,reason:'BAZAAR_CANCELLATION_INVALID_RESPONSE'};}
  }
  if(body&&typeof body==='object'&&(typeof body.error==='string'&&body.error||
    typeof body.error_description==='string'&&body.error_description))
   return {ok:false,reason:'BAZAAR_CANCELLATION_REJECTED'};
  // A successful cancel request is not sufficient evidence by itself.
  // Re-read the subscription from Bazaar and require autoRenewing=false.
  const verifyUrl='https://pardakht.cafebazaar.ir/devapi/v2/api/applications/'+encodeURIComponent(packageName)+
   '/subscriptions/'+encodeURIComponent(SKU_BY_PLAN[planId])+'/purchases/'+encodeURIComponent(purchaseToken)+
   '/?access_token='+encodeURIComponent(credentials.access_token);
  const verification=await fetchImpl(verifyUrl,{method:'GET',headers:{'Accept':'application/json'}});
  if(!verification?.ok)return {ok:false,reason:'BAZAAR_CANCELLATION_CONFIRMATION_UNAVAILABLE'};
  const state=await verification.json();
  if(!state||typeof state.autoRenewing!=='boolean')
   return {ok:false,reason:'BAZAAR_CANCELLATION_CONFIRMATION_INVALID'};
  if(state.autoRenewing!==false)
   return {ok:false,reason:'BAZAAR_CANCELLATION_NOT_CONFIRMED'};
  return {ok:true,reason:'CANCELLED'};
 }catch(_){return {ok:false,reason:'BAZAAR_CANCELLATION_UNAVAILABLE'};}
}
module.exports=Object.freeze({cancelBazaarSubscription});
