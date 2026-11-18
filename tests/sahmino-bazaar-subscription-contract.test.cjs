'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('Poolakey adapter uses CafeBazaar subscription APIs only',()=>{
 const manager=read('android-pilot/app/src/bazaar/java/ir/sahamban/pilot/SahminoStoreBillingManager.java');
 assert.match(manager,/PaymentRxKt\.getSubscriptionSkuDetails/);
 assert.match(manager,/PaymentRxKt\.subscribeProduct/);
 assert.match(manager,/PaymentRxKt\.getSubscribedProducts/);
 assert.match(manager,/new PurchaseRequest\(plan\.productId, serverOrderId, null\)/);
 assert.match(manager,/SecurityCheck\.Disable\.INSTANCE/);
 assert.doesNotMatch(manager,/consumeProduct|purchaseProduct|getInAppSkuDetails|getPurchasedProducts/);
 assert.match(manager,/serverOrderId\.matches\(ORDER_ID\)/);
});

test('Purchase evidence is raw only and never grants Pro in the Android client',()=>{
 const evidence=read('android-pilot/app/src/bazaar/java/ir/sahamban/pilot/SahminoPurchaseEvidence.java');
 assert.match(evidence,/getPurchaseToken/);
 assert.match(evidence,/getOriginalJson/);
 assert.match(evidence,/getDataSignature/);
 assert.match(evidence,/PurchaseState\.PURCHASED/);
 assert.doesNotMatch(evidence,/proEnabled|grantPro|paidUntil|consumeProduct/);
 const activity=read('android-pilot/app/src/bazaar/java/ir/sahamban/pilot/SubscriptionPreviewActivity.java');
 assert.match(activity,/extends ComponentActivity/);
 assert.match(activity,/plan\.setEnabled\(false\)/);
 assert.match(activity,/دسترسی Pro فعال نشد/);
});

test('Android dependencies and build contain Bazaar only',()=>{
 const gradle=read('android-pilot/app/build.gradle');
 assert.match(gradle,/poolakey:2\.2\.0/);
 assert.match(gradle,/poolakey-rx:2\.2\.0/);
 assert.doesNotMatch(gradle,/myket|MYKET|com\.android\.vending/i);
});
