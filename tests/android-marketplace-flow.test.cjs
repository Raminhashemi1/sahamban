'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('both Android flavors are configured for separate publisher SKU IDs and HTTPS API origin',()=>{
 const gradle=read('android-pilot/app/build.gradle');
 for(const key of ['BAZAAR_SKU_30D','BAZAAR_SKU_365D','MYKET_SKU_30D','MYKET_SKU_365D','SAHMINO_API_BASE_URL'])
  assert.ok(gradle.includes(key),key);
 assert.match(gradle,/bazaarImplementation .*Poolakey/);
 assert.match(gradle,/myketImplementation .*ir\.myket:billing/);
});

test('native receipt API requires HTTPS and the authenticated HttpOnly session cookie',()=>{
 const client=read('android-pilot/app/src/main/java/ir/sahamban/pilot/SahminoReceiptApiClient.java');
 assert.match(client,/https:\/\//);
 assert.match(client,/CookieManager\.getInstance\(\)\.getCookie\(base\)/);
 assert.match(client,/sahmino_session=/);
 assert.match(client,/X-Sahmino-CSRF/);
 assert.match(client,/\/api\/v1\/me\/prepaid-orders/);
 assert.match(client,/\/api\/v1\/me\/prepaid-receipts/);
 assert.doesNotMatch(client,/amountRial/);
});

test('Myket payload binds the store purchase to a server-generated order and consumes after settlement',()=>{
 const manager=read('android-pilot/app/src/myket/java/ir/sahamban/pilot/SahminoStoreBillingManager.java');
 const activity=read('android-pilot/app/src/myket/java/ir/sahamban/pilot/SubscriptionPreviewActivity.java');
 assert.match(manager,/purchase\(String planId, String serverOrderId\)/);
 assert.match(manager,/String payload = serverOrderId/);
 assert.match(manager,/consumeAfterServerSettlement/);
 assert.match(activity,/SahminoReceiptApiClient\.createOrder/);
 assert.match(activity,/submitMyketReceipt/);
 assert.match(activity,/billing\.consumeAfterServerSettlement\(purchase\)/);
});

test('CafeBazaar uses Poolakey one-time products, server payload, REST receipt submission and post-settlement consume',()=>{
 const manager=read('android-pilot/app/src/bazaar/java/ir/sahamban/pilot/BazaarBillingManager.java');
 const activity=read('android-pilot/app/src/bazaar/java/ir/sahamban/pilot/SubscriptionPreviewActivity.java');
 assert.match(manager,/SecurityCheck\.Disable\.INSTANCE/);
 assert.match(manager,/payment\.purchaseProduct/);
 assert.match(manager,/new PurchaseRequest\(plan\.productId, serverOrderId, null\)/);
 assert.match(manager,/getPurchasedProducts/);
 assert.match(manager,/payment\.consumeProduct/);
 assert.match(activity,/SahminoReceiptApiClient\.createOrder/);
 assert.match(activity,/submitBazaarReceipt/);
 assert.match(activity,/billing\.consumeAfterServerSettlement\(purchase\)/);
});

test('Worker receipt route is cookie-authenticated and fail-closed behind feature flags',()=>{
 const worker=read('server/worker-api.mjs');
 const verifier=read('server/marketplace-receipt-verifier.mjs');
 assert.match(worker,/isPrepaidReceipts/);
 assert.match(worker,/NOT_AUTHENTICATED/);
 assert.match(worker,/SAHMINO_OTP_ENABLED/);
 assert.match(worker,/PREPAID_ORDERS_ENABLED/);
 assert.match(worker,/verifyMarketplaceReceipt/);
 assert.match(worker,/settleVerifiedPrepaidPayment/);
 assert.match(verifier,/MYKET_SIGNATURE_INVALID/);
 assert.match(verifier,/BAZAAR_PURCHASE_MISMATCH/);
 assert.match(verifier,/replace-with-real|PLACEHOLDER|TODO/);
});
