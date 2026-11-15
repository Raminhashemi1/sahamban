'use strict';
// Web PSP two-step connector; server owns the order and PSP driver contract.
// Does not create real charges without an explicitly configured sandbox driver.
// Browser redirects/callbacks are hints only; no entitlement authority here.
const {PLAN_DAYS}=require('./sahmino-channel-policy-v1.cjs');
const ID=/^[A-Za-z0-9._-]{3,128}$/;
const ACCOUNT=/^[A-Za-z0-9:_-]{1,128}$/;
const deny=(reason)=>Object.freeze({channel:'WEB_DIRECT',status:'DENIED',reason,
 checkoutEnabled:false,providerVerified:false,entitlementGranted:false,realEntitlement:false});
function createWebPspIntegration({pspId,authorizedCheckoutHosts=[],createSandboxCheckout,
 verifySandboxPayment}={}){
 if(typeof pspId!=='string'||!ID.test(pspId))throw new TypeError('WEB_PSP_ID_REQUIRED');
 if(!Array.isArray(authorizedCheckoutHosts)||authorizedCheckoutHosts.some(host=>
  typeof host!=='string'||host.length>253||!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(host)))
  throw new TypeError('INVALID_WEB_PSP_HOSTS');
 if(typeof createSandboxCheckout!=='function'||typeof verifySandboxPayment!=='function')
  throw new TypeError('WEB_PSP_SANDBOX_DRIVERS_REQUIRED');
 const allowed=new Set(authorizedCheckoutHosts.map(host=>host.toLowerCase()));
 const validOrder=(principal,order)=>principal&&principal.authenticated===true&&
  typeof principal.subject==='string'&&ACCOUNT.test(principal.subject)&&
  !['__proto__','constructor','prototype'].includes(principal.subject)&&
  order&&typeof order==='object'&&!Array.isArray(order)&&order.channel==='WEB_DIRECT'&&
  order.accountId===principal.subject&&ID.test(order.orderId||'')&&
  order.pspId===pspId&&PLAN_DAYS.includes(order.planDays)&&
  ID.test(order.sku||'')&&Number.isSafeInteger(order.priceMinor)&&
  order.priceMinor>0&&typeof order.currency==='string'&&
  /^[A-Z]{3}$/.test(order.currency);
 return Object.freeze({
  async beginSandbox({principal,serverOrder}={}){
   if(!validOrder(principal,serverOrder))return deny('INVALID_SERVER_ORDER');
   let session;
   try{session=await createSandboxCheckout(Object.freeze({
    orderId:serverOrder.orderId,priceMinor:serverOrder.priceMinor,
    currency:serverOrder.currency,sku:serverOrder.sku,accountId:principal.subject,
    mode:'SANDBOX'}));}
   catch{return deny('PSP_CREATE_FAILED');}
   if(!session||typeof session!=='object'||Array.isArray(session)||
      typeof session.reference!=='string'||!ID.test(session.reference)||
      typeof session.redirectUrl!=='string')
    return deny('INVALID_PSP_CHECKOUT');
   let url;
   try{url=new URL(session.redirectUrl);}catch{return deny('INVALID_PSP_CHECKOUT');}
   if(url.protocol!=='https:'||!allowed.has(url.hostname.toLowerCase())||
      url.username||url.password||url.port||url.hash)
    return deny('UNTRUSTED_PSP_REDIRECT');
   // Redirect URL only after explicit SANDBOX creation by injected trusted driver.
   // No payment status or user entitlement is asserted here.
   return Object.freeze({...deny('SANDBOX_REDIRECT_ONLY'),sandboxRedirectUrl:url.href,
    pspReference:session.reference});
  },
  async reconcileSandbox({principal,serverOrder,pspReference,browserStatus}={}){
   if(!validOrder(principal,serverOrder))return deny('INVALID_SERVER_ORDER');
   if(typeof pspReference!=='string'||!ID.test(pspReference))
    return deny('INVALID_PSP_REFERENCE');
   // browserStatus is deliberately ignored; callback is untrusted.
   void browserStatus;
   let evidence;
   try{evidence=await verifySandboxPayment(Object.freeze({
    orderId:serverOrder.orderId,pspReference,priceMinor:serverOrder.priceMinor,
    currency:serverOrder.currency,accountId:principal.subject,mode:'SANDBOX'}));}
   catch{return deny('PSP_VERIFY_FAILED');}
   if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))
    return deny('INVALID_PSP_VERIFICATION');
   if(evidence.status!=='SETTLED'||evidence.pspReference!==pspReference||
      evidence.orderId!==serverOrder.orderId||
      evidence.priceMinor!==serverOrder.priceMinor||
      evidence.currency!==serverOrder.currency||
      evidence.pspId!==pspId||
      ['refunded','reversed','pending','chargeback'].some(flag=>
        Object.hasOwn(evidence,flag)&&evidence[flag]!==false))
    return deny('PSP_SERVER_MISMATCH');
   // Actual grant still requires durable verified receipt, replay/refund checks.
   return Object.freeze({...deny('SANDBOX_VERIFIED_RESPONSE_REQUIRES_LEDGER'),
    sandboxEvidenceMatched:true});
  }
 });
}
module.exports=Object.freeze({createWebPspIntegration});