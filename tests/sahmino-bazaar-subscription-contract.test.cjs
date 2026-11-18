'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('native billing boundary uses one-time Cafe Bazaar Poolakey products',()=>{
 const manager=read('android-pilot/app/src/main/java/ir/sahamban/pilot/SahambanBazaarBillingManager.kt');
 const gradle=read('android-pilot/app/build.gradle');
 const settings=read('android-pilot/settings.gradle');
 const manifest=read('android-pilot/app/src/main/AndroidManifest.xml');
 for(const marker of ['purchaseFixedTermPlan','PaymentConfiguration','SecurityCheck.Disable','payment.connect',
   'payment.purchaseProduct','PurchaseRequest','payment.getPurchasedProducts',
   'PurchaseState.PURCHASED','purchaseToken','originalJson','dataSignature',
   'serverOrderId','onReady']) assert.ok(manager.includes(marker),marker);
 assert.match(gradle,/com\.github\.cafebazaar\.Poolakey:poolakey:2\.2\.0/);
 assert.match(gradle,/org\.jetbrains\.kotlin\.android/);
 assert.match(settings,/jitpack\.io/);
 assert.match(manifest,/com\.farsitel\.bazaar/);
});

test('native billing evidence cannot grant access and live checkout stays disabled',()=>{
 const manager=read('android-pilot/app/src/main/java/ir/sahamban/pilot/SahambanBazaarBillingManager.kt');
 const gradle=read('android-pilot/app/build.gradle');
 assert.doesNotMatch(manager,/proEnabled\s*=\s*true|grantPro|paidUntil\s*=/);
 assert.match(gradle,/SAHAMBAN_BAZAAR_PURCHASES_ENABLED', 'false'/);
});

test('server currently exposes only pending orders and no Bazaar receipt verification endpoint',()=>{
 const worker=read('server/worker-api.mjs');
 assert.match(worker,/paymentsEnabled:false,checkoutEnabled:false/);
 assert.match(worker,/isPrepaidOrders/);
 assert.doesNotMatch(worker,/prepaid-orders\/verify/);
});
