'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('native billing boundary uses one-time Cafe Bazaar Poolakey products',()=>{
 const manager=read('android-pilot/app/src/main/java/ir/sahamban/pilot/SahambanBazaarBillingManager.kt');
 const client=read('android-pilot/app/src/main/java/ir/sahamban/pilot/SahambanBazaarReceiptClient.kt');
 const gradle=read('android-pilot/app/build.gradle');
 const settings=read('android-pilot/settings.gradle');
 const manifest=read('android-pilot/app/src/main/AndroidManifest.xml');
 for(const marker of ['purchaseFixedTermPlan','PaymentConfiguration','SecurityCheck.Disable','payment.connect',
   'payment.purchaseProduct','PurchaseRequest','payment.getPurchasedProducts',
   'PurchaseState.PURCHASED','purchaseToken','originalJson','val serverOrderId = payload','purchaseCanceled','purchaseFailed','querySucceed'])
  assert.ok(manager.includes(marker),marker);
 assert.match(gradle,/com\.github\.cafebazaar\.Poolakey:poolakey:2\.3\.0/);
 assert.match(gradle,/org\.jetbrains\.kotlin\.android/);
 assert.match(settings,/jitpack\.io/);
 assert.match(manifest,/com\.farsitel\.bazaar/);
 assert.match(client,/prepaid-orders\/verify-bazaar/);
 assert.match(client,/Authorization/);
});

test('native billing evidence cannot grant access and live checkout stays disabled',()=>{
 const manager=read('android-pilot/app/src/main/java/ir/sahamban/pilot/SahambanBazaarBillingManager.kt');
 const gradle=read('android-pilot/app/build.gradle');
 assert.doesNotMatch(manager,/proEnabled\s*=\s*true|grantPro|paidUntil\s*=/);
 assert.match(gradle,/SAHAMBAN_BAZAAR_PURCHASES_ENABLED', 'false'/);
});

test('server exposes Bazaar receipt verification behind a disabled-by-default feature flag',()=>{
 const worker=read('server/worker-api.mjs');
 const verifier=read('server/bazaar-receipt-verification.mjs');
 assert.match(worker,/paymentsEnabled:false,checkoutEnabled:false/);
 assert.match(worker,/verify-bazaar/);
 assert.match(verifier,/BAZAAR_BILLING_ENABLED!=='true'/);
 assert.match(verifier,/receipt\.purchaseState!==0/);
 assert.match(verifier,/receipt\.developerPayload!==orderId/);
});
