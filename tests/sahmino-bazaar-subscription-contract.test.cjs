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

test('Purchase evidence is raw only and never grants Pro locally',()=>{
 const evidence=read('android-pilot/app/src/bazaar/java/ir/sahamban/pilot/SahminoPurchaseEvidence.java');
 assert.match(evidence,/getPurchaseToken/);
 assert.match(evidence,/getOriginalJson/);
 assert.match(evidence,/getDataSignature/);
 assert.match(evidence,/purchaseState = 0/);
 assert.match(evidence,/PurchaseState\.PURCHASED/);
 assert.match(evidence,/if \(!valid\(signature, 8192\)\) return null;/);
 assert.doesNotMatch(evidence,/proEnabled|grantPro|paidUntil|consumeProduct/);
 const activity=read('android-pilot/app/src/bazaar/java/ir/sahamban/pilot/SubscriptionPreviewActivity.java');
 assert.match(activity,/extends ComponentActivity/);
 assert.match(activity,/orders\.verifyPurchase\(evidence/);
 assert.match(activity,/دسترسی Pro فعال نشد/);
});

test('Android dependencies and build contain Bazaar only',()=>{
 const gradle=read('android-pilot/app/build.gradle');
 const main=read('android-pilot/app/src/main/java/ir/sahamban/pilot/MainActivity.java');
 const sessionRepo=read('server/d1-sms-otp-repository.cjs');
 assert.match(gradle,/poolakey:2\.2\.0/);
 assert.match(gradle,/poolakey-rx:2\.2\.0/);
 assert.doesNotMatch(gradle,/myket|MYKET|com\.android\.vending/i);
});

test('Worker fails closed while Bazaar automatic renewal is not reconciled with manual-default consent',()=>{
 const worker=read('server/worker-api.mjs');
 assert.match(worker,/BAZAAR_SUBSCRIPTIONS_ENABLED!=='true'/);
 assert.match(worker,/autoRenewing!==false/);
 assert.match(worker,/AUTO_RENEW_POLICY_UNRESOLVED/);
});

test('native order handoff and receipt verification use authenticated Worker endpoints',()=>{
 const client=read('android-pilot/app/src/bazaar/java/ir/sahamban/pilot/SahminoPrepaidOrderClient.java');
 const activity=read('android-pilot/app/src/bazaar/java/ir/sahamban/pilot/SubscriptionPreviewActivity.java');
 const gradle=read('android-pilot/app/build.gradle');
 const main=read('android-pilot/app/src/main/java/ir/sahamban/pilot/MainActivity.java');
 const sessionRepo=read('server/d1-sms-otp-repository.cjs');
 for(const marker of ['getCookie(baseUrl)','sahmino_session=','X-Sahmino-CSRF',
     'setInstanceFollowRedirects(false)','/api/v1/me/prepaid-orders',
     'PENDING_ORDER_CREATED','amountRial','^ord_[a-f0-9]{32}$']) assert.ok(client.includes(marker),marker);
 assert.match(main,/setAcceptThirdPartyCookies\(webView, true\)/);
 assert.match(main,/SameSite=None/);
 assert.match(sessionRepo,/HttpOnly; Secure; SameSite=None/);
 for(const marker of ['/api/v1/me/prepaid-orders/verify','serverOrderId','purchaseToken',
     'originalJson','dataSignature','purchaseState','status','SETTLED',
     'proEnabled','AUTO_RENEW','onVerified','/api/v1/me/prepaid-overview','refreshEntitlement','NO_ACTIVE_ENTITLEMENT']) assert.ok(client.includes(marker),marker);
 for(const marker of ['grantPro','consumeProduct','readNBytes','proEnabled = true']) assert.ok(!client.includes(marker),marker);
 for(const marker of ['orders.prepare(selectedPlanId','billing.subscribe(selectedPlanId, serverOrderId)',
     'orders.verifyPurchase(evidence','orders.refreshEntitlement','plan.setEnabled(BuildConfig.SAHMINO_BAZAAR_PURCHASES_ENABLED && orders.isConfigured())',
     '!BuildConfig.SAHMINO_BAZAAR_PURCHASES_ENABLED','اشتراک Pro توسط سرور تأیید و فعال شد']) assert.ok(activity.includes(marker),marker);
 assert.ok(gradle.includes("SAHMINO_WORKER_BASE_URL', '\"\"'"));
 assert.ok(gradle.includes("SAHMINO_BAZAAR_PURCHASES_ENABLED', 'false'"));
});

test('restoration is derived from the authenticated server entitlement, not Bazaar inventory alone',()=>{
 const client=read('android-pilot/app/src/bazaar/java/ir/sahamban/pilot/SahminoPrepaidOrderClient.java');
 const activity=read('android-pilot/app/src/bazaar/java/ir/sahamban/pilot/SubscriptionPreviewActivity.java');
 const overview=read('server/prepaid-account-overview.cjs');
 assert.match(client,/GET/);
 assert.match(client,/api\\/v1\\/me\\/prepaid-overview/);
 assert.match(client,/response\\.optBoolean\\("proEnabled", false\\)/);
 assert.match(activity,/onRestoredEvidence/);
 assert.match(activity,/orders\\.refreshEntitlement/);
 assert.match(overview,/proEnabled:active/);
 assert.match(overview,/authenticatedUserId/);
 assert.doesNotMatch(activity,/onRestoredEvidence[\\s\\S]{0,500}status\\.setText\\(".*دسترسی فعال نشد"\\);/);
});
