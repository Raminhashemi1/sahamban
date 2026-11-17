'use strict';
// ZarinPal REST adapter (v4). Server-only: never expose merchant ID to clients.
// This module does not create orders or grant entitlements; callers must bind
// authority to a server-owned pending order and settle only after verify=100.
const PROVIDER='ZARINPAL';
const PRODUCTION_API='https://api.zarinpal.com/pg/v4/payment';
const PRODUCTION_PAY='https://www.zarinpal.com/pg/StartPay/';
const SANDBOX_API='https://sandbox.zarinpal.com/pg/v4/payment';
const SANDBOX_PAY='https://sandbox.zarinpal.com/pg/StartPay/';
function endpoints(env){return env?.ZARINPAL_SANDBOX==='true'?{api:SANDBOX_API,pay:SANDBOX_PAY}:{api:PRODUCTION_API,pay:PRODUCTION_PAY};}
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
function config(env){
 const merchant=env?.ZARINPAL_MERCHANT_ID;
 if(typeof merchant!=='string'||!/^[a-f0-9-]{36}$/i.test(merchant))
  throw new Error('ZARINPAL_NOT_CONFIGURED');
 return merchant;
}
async function post(fetchImpl,url,body){
 const response=await fetchImpl(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body)});
 if(!response||!response.ok)throw new Error('ZARINPAL_UNAVAILABLE');
 let data;try{data=await response.json();}catch(_){throw new Error('ZARINPAL_INVALID_RESPONSE');}
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('ZARINPAL_INVALID_RESPONSE');
 return data;
}
async function requestPayment({env,order,callbackUrl,description,fetchImpl=fetch}={}){
 const merchant=config(env);
 const urls=endpoints(env);
 if(!order||typeof order.id!=='string'||!ID.test(order.id)||!Number.isSafeInteger(order.amountRial)||order.amountRial<1000||order.currency!=='IRR')
  throw new Error('INVALID_ORDER');
 let callback;try{callback=new URL(callbackUrl);}catch(_){throw new Error('INVALID_CALLBACK_URL');}
 if(callback.protocol!=='https:'||callback.username||callback.password)throw new Error('INVALID_CALLBACK_URL');
 const data=await post(fetchImpl,urls.api+'/request.json',{
  merchant_id:merchant,amount:order.amountRial,currency:'IRR',description:String(description||('Sahmino order '+order.id)).slice(0,255),
  callback_url:callback.toString(),metadata:{order_id:order.id}
 });
 const result=data.data;
 if(data.errors&&Object.keys(data.errors).length)throw new Error('ZARINPAL_REQUEST_REJECTED');
 if(!result||result.code!==100||typeof result.authority!=='string'||!/^[A-Za-z0-9]{20,64}$/.test(result.authority))
  throw new Error('ZARINPAL_REQUEST_REJECTED');
 return Object.freeze({provider:PROVIDER,authority:result.authority,paymentUrl:urls.pay+encodeURIComponent(result.authority)});
}
async function verifyPayment({env,authority,amountRial,fetchImpl=fetch}={}){
 const merchant=config(env);
 const urls=endpoints(env);
 if(typeof authority!=='string'||!/^[A-Za-z0-9]{20,64}$/.test(authority)||!Number.isSafeInteger(amountRial)||amountRial<1000)
  throw new Error('INVALID_VERIFICATION_INPUT');
 const data=await post(fetchImpl,urls.api+'/verify.json',{merchant_id:merchant,amount:amountRial,authority});
 const result=data.data;
 // Only code 100 is a fresh verified payment. Code 101 means already verified;
 // never treat it as a new settlement event or grant entitlement again.
 if(data.errors&&Object.keys(data.errors).length)throw new Error('ZARINPAL_VERIFY_REJECTED');
 if(!result||result.code!==100||result.amount!==amountRial||!Number.isSafeInteger(result.ref_id))
  throw new Error(result?.code===101?'ZARINPAL_ALREADY_VERIFIED':'ZARINPAL_PAYMENT_NOT_VERIFIED');
 return Object.freeze({verified:true,providerName:PROVIDER,providerEventId:'zarinpal:'+authority,
  providerPaymentId:String(result.ref_id),authority,amountRial,currency:'IRR'});
}
module.exports=Object.freeze({PROVIDER,requestPayment,verifyPayment});
