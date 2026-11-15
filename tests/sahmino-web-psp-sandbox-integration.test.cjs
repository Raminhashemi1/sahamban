'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createWebPspIntegration}=require('../billing/staging/sahmino-web-psp-sandbox-integration.cjs');
const principal={authenticated:true,subject:'account_1'};
const order={channel:'WEB_DIRECT',accountId:'account_1',pspId:'psp_sandbox',
 planDays:30,orderId:'order_123',sku:'sahmino_30',priceMinor:450000,currency:'IRR'};
const ref='reference_123';
const hosts=['sandbox.example-pay.test'];
const session={reference:ref,redirectUrl:'https://sandbox.example-pay.test/pay/session1'};
const evidence={status:'SETTLED',pspReference:ref,orderId:order.orderId,
 priceMinor:order.priceMinor,currency:order.currency,pspId:'psp_sandbox'};
function create({checkout=session,verify=evidence,begin,check}={}){
 let creates=0,verifies=0;
 const psp=createWebPspIntegration({pspId:'psp_sandbox',authorizedCheckoutHosts:hosts,
  createSandboxCheckout:async x=>{creates++;return begin?begin(x):checkout;},
  verifySandboxPayment:async x=>{verifies++;return check?check(x):verify;}});
 return {psp,get counts(){return {creates,verifies};}};
}
test('valid sandbox checkout is explicitly non-authoritative',async()=>{
 const t=create();const result=await t.psp.beginSandbox({principal,serverOrder:order});
 assert.equal(result.reason,'SANDBOX_REDIRECT_ONLY');
 assert.equal(result.sandboxRedirectUrl,session.redirectUrl);
 assert.equal(result.pspReference,ref);
 assert.equal(result.realEntitlement,false);
 assert.equal(result.checkoutEnabled,false);
 assert.deepEqual(t.counts,{creates:1,verifies:0});
});
test('callback success cannot bypass server-side verification',async()=>{
 let expected;
 const t=create({check:async x=>{expected=x;return evidence;}});
 const result=await t.psp.reconcileSandbox({principal,serverOrder:order,pspReference:ref,
  browserStatus:'SUCCESS'});
 assert.equal(result.reason,'SANDBOX_VERIFIED_RESPONSE_REQUIRES_LEDGER');
 assert.equal(result.sandboxEvidenceMatched,true);
 assert.equal(result.providerVerified,false);
 assert.equal(result.entitlementGranted,false);
 assert.equal(result.realEntitlement,false);
 assert.equal(expected.orderId,order.orderId);
 assert.equal(expected.priceMinor,order.priceMinor);
 assert.equal(expected.mode,'SANDBOX');
 assert.equal(Object.hasOwn(expected,'browserStatus'),false);
});
test('all five durations require server-priced order and authenticated account',async()=>{
 const t=create();
 for(const days of [30,60,90,180,365]){
  const r=await t.psp.beginSandbox({principal,serverOrder:{...order,planDays:days}});
  assert.equal(r.reason,'SANDBOX_REDIRECT_ONLY');
 }
 for(const changed of [{planDays:270},{priceMinor:0},{currency:'BAD!'},
  {orderId:''},{pspId:'elsewhere'},{accountId:'other'},{channel:'CAFEBAZAAR'}]){
  assert.equal((await t.psp.beginSandbox({principal,serverOrder:{...order,...changed}}))
   .reason,'INVALID_SERVER_ORDER');
 }
 assert.equal((await t.psp.beginSandbox({principal:{authenticated:false,subject:'account_1'},
  serverOrder:order})).reason,'INVALID_SERVER_ORDER');
 assert.equal(t.counts.creates,5);
});
test('redirect must remain HTTPS on explicitly allowed merchant checkout host',async()=>{
 for(const redirectUrl of ['https://evil.example/pay','http://sandbox.example-pay.test/pay',
  'https://sandbox.example-pay.test.evil.example/pay',
  'https://user:pass@sandbox.example-pay.test/pay',
  'https://sandbox.example-pay.test:444/pay','https://sandbox.example-pay.test/pay#fragment',
  'javascript:alert(1)']){
  const t=create({checkout:{...session,redirectUrl}});
  const r=await t.psp.beginSandbox({principal,serverOrder:order});
  assert.equal(r.reason,'UNTRUSTED_PSP_REDIRECT',redirectUrl);
 }
});
test('mismatched amount, currency, order or state fails closed independent of callback',async()=>{
 for(const change of [{status:'PENDING'},{orderId:'wrong'},{currency:'USD'},
  {priceMinor:1},{pspId:'elsewhere'},{pspReference:'wrong'},
  {refunded:true},{reversed:1},{chargeback:'false'},{pending:null}]){
  const t=create({verify:{...evidence,...change}});
  const r=await t.psp.reconcileSandbox({principal,serverOrder:order,
   pspReference:ref,browserStatus:'SUCCESS'});
  assert.equal(r.reason,'PSP_SERVER_MISMATCH');
  assert.equal(r.realEntitlement,false);
 }
});
test('network errors, forged references and invalid configurations deny',async()=>{
 assert.throws(()=>createWebPspIntegration({pspId:'invalid',authorizedCheckoutHosts:[]}),
  /WEB_PSP_SANDBOX_DRIVERS_REQUIRED/);
 const bad=create({begin:async()=>{throw Error('secret');},
  check:async()=>{throw Error('secret');}});
 assert.equal((await bad.psp.beginSandbox({principal,serverOrder:order})).reason,
  'PSP_CREATE_FAILED');
 assert.equal((await bad.psp.reconcileSandbox({principal,serverOrder:order,
  pspReference:ref})).reason,'PSP_VERIFY_FAILED');
 assert.equal((await bad.psp.reconcileSandbox({principal,serverOrder:order,
  pspReference:'bad'})).reason,'PSP_VERIFY_FAILED');
 assert.equal((await bad.psp.reconcileSandbox({principal,serverOrder:order,
  pspReference:null})).reason,'INVALID_PSP_REFERENCE');
});