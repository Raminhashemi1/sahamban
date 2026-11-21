'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=(p)=>fs.readFileSync(p,'utf8');

test('Android pilot allows internet only; forbids local-file, HTTP and automatic backup',()=>{
 const m=read('android-pilot/app/src/main/AndroidManifest.xml');
 assert.match(m,/android\.permission\.INTERNET/);
 assert.doesNotMatch(m,/android\.permission\.(READ_|WRITE_|CAMERA|RECORD_AUDIO|ACCESS_FINE_LOCATION)/);
 assert.match(m,/android:usesCleartextTraffic="false"/);
 assert.match(m,/android:allowBackup="false"/);
 assert.equal((m.match(/android:exported="true"/g)||[]).length,1);
 const java=read('android-pilot/app/src/main/java/ir/sahamban/pilot/MainActivity.java');
 for(const guard of ['setAllowFileAccess(false)','setAllowContentAccess(false)',
  'setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW)',
  'setSafeBrowsingEnabled(true)','handler.cancel()','Intent.ACTION_OPEN_DOCUMENT'])
  assert.ok(java.includes(guard),guard);
 assert.ok(!java.includes('addJavascriptInterface'));
});

test('debug APK uses the owner-approved permanent identity, no production signing and no checkout',()=>{
 const build=read('android-pilot/app/build.gradle');
 assert.ok(build.includes("def appId = System.getenv('SAHAMBAN_APPLICATION_ID') ?: 'ir.sahmino.app'"));
 assert.match(build,/applicationId appId/);
 assert.match(build,/expectedPackage == appId/);
 assert.doesNotMatch(build,/signingConfigs|storePassword|keyPassword/);
 assert.match(build,/compileSdk 36/);
 assert.match(build,/bazaarImplementation.*Poolakey/);
 assert.match(build,/myketImplementation.*ir\.myket:billing:2\.2/);
 assert.match(build,/System\.getenv\('SAHAMBAN_BILLING_ENABLED'\) == 'true'/);
 assert.match(build,/allSkusPresent/);
 assert.match(build,/appId != 'ir\\.sahamban\\.pilot'|appId != 'ir\\.sahmino\\.app'/);
 assert.match(build,/workerUrl\.startsWith\('https:\/\/'\)/);
 const flow=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2PurchaseFlow.kt');
 assert.match(flow,/if \(!BuildConfig\.SAHAMBAN_BILLING_ENABLED\)/);
 const wf=read('.github/workflows/android-pilot-debug.yml');
 assert.match(wf,/assembleBazaarDebug/);
 assert.match(wf,/assembleMyketDebug/);
 assert.doesNotMatch(wf,/assembleRelease|bundleRelease|publishRelease|marketplace/);
 assert.match(wf,/upload-artifact/);
 assert.match(read('android-pilot/README.md'),/not.*signed production release/i);
});

test('Billing API client obtains fresh native OTP cookie headers and never uses bearer tokens',()=>{
 const api=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2ApiClient.kt');
 assert.match(api,/fun interface BillingV2AuthProvider/);
 assert.match(api,/private val authProvider: BillingV2AuthProvider/);
 assert.match(api,/authProvider\.getHeaders/);
 assert.match(api,/sahmino_session=\[a-f0-9\]\{64\}/);
 assert.match(api,/X-Sahmino-CSRF/);
 assert.match(api,/BuildConfig\.SAHAMBAN_PWA_ORIGIN/);
 assert.match(api,/NOT_AUTHENTICATED/);
 assert.doesNotMatch(api,/Authorization|Bearer|BillingV2TokenProvider/);
 const provider=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2CookieSessionProvider.kt');
 assert.match(provider,/CookieManager\.getInstance\(\)\.getCookie/);
 assert.match(provider,/singleOrNull/);
 assert.match(provider,/HttpOnly/);
 const build=read('android-pilot/app/build.gradle');
 assert.match(build,/SAHAMBAN_PWA_ORIGIN/);
 const activity=read('android-pilot/app/src/main/java/ir/sahamban/pilot/MainActivity.java');
 assert.doesNotMatch(activity,/addJavascriptInterface/);
});

test('native subscription selector uses exact marketplace prices and manual-renewal wording',()=>{
 const ui=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2SubscriptionView.kt');
 const flow=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2PurchaseFlow.kt');
 for(const plan of ['SAHAMBAN_PRO_30D','SAHAMBAN_PRO_60D','SAHAMBAN_PRO_90D',
  'SAHAMBAN_PRO_180D','SAHAMBAN_PRO_365D']) assert.ok(ui.includes(plan),plan);
 assert.match(ui,/قیمت فروشگاه/);
 assert.match(ui,/SAHAMBAN_BILLING_ENABLED/);
 assert.match(ui,/تمدید خودکار نداریم/);
 assert.match(ui,/بازیابی اشتراک/);
 assert.match(ui,/purchaseButtons\.forEach \{ it\.isEnabled = false \}/);
 assert.match(ui,/purchaseFlow\.purchase\(plan\.id\)/);
 assert.match(ui,/purchaseFlow\.restore/);
 assert.match(ui,/NOT_AUTHENTICATED/);
 assert.match(flow,/fun loadPlanDetails/);
 assert.match(flow,/displayPrice/);
 const restore=flow.slice(flow.indexOf('fun restore('));
 assert.ok(restore.indexOf('api.refreshEntitlement') >= 0);
 assert.ok(restore.indexOf('api.refreshEntitlement') < restore.indexOf('storeBilling.connect'),
  'durable account entitlement must be restored before marketplace availability is checked');
 assert.match(restore,/if \(!BuildConfig\.SAHAMBAN_BILLING_ENABLED\)/);
 assert.doesNotMatch(ui,/1_500_000L|2_850_000L|4_050_000L|7_650_000L|14_600_000L/);
});


test('native OTP client obtains session directly from Worker and stores HttpOnly cookie without JS exposure',()=>{
 const otp=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2NativeOtpClient.kt');
 assert.match(otp,/fun requestCode\(/);
 assert.match(otp,/fun verifyCode\(/);
 assert.match(otp,/fun logout\(/);
 assert.match(otp,/https/);
 assert.match(otp,/setCookie\(workerBaseUrl, cookie\)/);
 assert.match(otp,/CookieManager\.getInstance\(\)/);
 assert.match(otp,/HttpOnly/);
 assert.match(otp,/SameSite=None/);
 assert.match(otp,/X-Sahmino-CSRF/);
 assert.match(otp,/Origin", pwaOrigin/);
 assert.doesNotMatch(otp,/Log\.|println\(|addJavascriptInterface|evaluateJavascript/);
 assert.match(otp,/singleOrNull/);
 assert.match(otp,/SESSION_COOKIE_REJECTED/);
});


test('Android host gates PWA startup behind native OTP and revalidates persisted sessions',()=>{
 const activity=read('android-pilot/app/src/main/java/ir/sahamban/pilot/MainActivity.java');
 const otp=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2NativeOtpClient.kt');
 const login=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2OtpLoginView.kt');
 assert.match(activity,/new BillingV2NativeOtpClient/);
 assert.match(activity,/otpClient\.checkSession/);
 assert.match(activity,/showLogin\(\)/);
 assert.match(activity,/showWebApp\(\)/);
 assert.match(activity,/performLogout/);
 assert.match(activity,/TrustedNavigation\.isInternal/);
 assert.match(otp,/fun checkSession\(callback: SessionCallback\)/);
 assert.match(otp,/api\/v1\/auth\/session/);
 assert.match(otp,/api\/v1\/auth\/logout/);
 assert.match(login,/fun requestCode\(/);
 assert.match(login,/fun verifyCode\(/);
 assert.match(login,/asciiDigits/);
 assert.match(login,/AuthenticatedListener/);
 assert.doesNotMatch(activity,/addJavascriptInterface|evaluateJavascript/);
});


test('native subscription entry is reachable only after OTP and fails closed without owner SKU configuration',()=>{
 const activity=read('android-pilot/app/src/main/java/ir/sahamban/pilot/MainActivity.java');
 const host=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2SubscriptionHost.kt');
 const build=read('android-pilot/app/build.gradle');
 assert.match(activity,/otpClient\.checkSession/);
 assert.match(activity,/showSubscription\(\)/);
 assert.match(activity,/new BillingV2SubscriptionHost/);
 assert.match(activity,/showingSubscription/);
 assert.match(activity,/boolean loadPwa = webView == null/);
 assert.match(activity,/if \(loadPwa\) webView\.loadUrl\(START_URL\)/);
 assert.doesNotMatch(activity,/^\s*webView\.loadUrl\(START_URL\);$/m,
  'returning from subscriptions must not reload the PWA and discard in-memory state');
 assert.match(activity,/subscriptionHost\.close\(\)/);
 assert.match(host,/SAHAMBAN_EXPECTED_PACKAGE_NAME/);
 for(const sku of ['30D','60D','90D','180D','365D'])
  assert.match(host,new RegExp('SAHAMBAN_SKU_PRO_'+sku));
 assert.match(host,/UNCONFIGURED_SAHAMBAN_PRO_30D/);
 assert.match(host,/if \(!packageUsable\)/);
 assert.match(host,/BillingV2PurchaseFlow\(/);
 assert.match(host,/BillingV2SubscriptionView\(/);
 assert.match(build,/SAHAMBAN_EXPECTED_PACKAGE_NAME/);
 assert.match(build,/SAHAMBAN_SKU_PRO_30D/);
 assert.match(build,/SAHAMBAN_SKU_PRO_365D/);
 assert.match(build,/buildConfigField 'boolean', 'SAHAMBAN_BILLING_ENABLED', 'false'/);
});

test('native purchase verifies the exact order evidence on the server before consuming either store token',()=>{
 const flow=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2PurchaseFlow.kt');
 const api=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2ApiClient.kt');
 const bazaar=read('server/billing/bazaar.mjs');
 const myket=read('server/billing/myket.mjs');
 const worker=read('server/worker-api.mjs');

 const purchase=flow.slice(flow.indexOf('fun purchase('),flow.indexOf('fun restore('));
 assert.ok(purchase.indexOf('storeBilling.connect') < purchase.indexOf('api.createOrder'),
  'connect to the selected marketplace before creating a server order');
 assert.match(purchase,/evidence\.packageName != expectedPackageName/);
 assert.match(purchase,/evidence\.planSku != sku/);
 assert.match(purchase,/evidence\.orderId != order\.id/);
 const verifyAt=purchase.indexOf('api.verifyPurchase');
 const consumeAt=purchase.indexOf('storeBilling.consumeAfterSettlement');
 assert.ok(verifyAt >= 0 && consumeAt > verifyAt,
  'consumption must happen only after the server verification request');
 const verifiedSuccess=purchase.indexOf('is BillingV2ApiClient.Result.Success ->',verifyAt);
 const verifiedFailure=purchase.indexOf('is BillingV2ApiClient.Result.Failure ->',verifyAt);
 assert.ok(verifiedSuccess > verifyAt && verifiedFailure > verifiedSuccess);
 assert.ok(purchase.indexOf('storeBilling.consumeAfterSettlement',verifiedSuccess) > verifiedSuccess);
 assert.doesNotMatch(purchase.slice(verifiedFailure),/storeBilling\.consumeAfterSettlement/,
  'verification failure must never consume the marketplace purchase');

 assert.match(api,/JSONObject\(\)\.put\("orderId", orderId\)\s*\.put\("originalJson", originalJson\)\.put\("signature", dataSignature\)/);
 assert.match(api,/JSONObject\(\)\.put\("orderId", orderId\)\.put\("sku", sku\)/);
 assert.match(api,/\.put\("token", purchaseToken\)\.put\("originalJson", originalJson\)/);
 assert.match(api,/\.put\("dataSignature", dataSignature\)/);
 assert.match(bazaar,/Object\.keys\(body\)\.sort\(\)\.join\(','\)!=='dataSignature,orderId,originalJson,sku,token'/);
 assert.match(myket,/Object\.keys\(body\)\.sort\(\)\.join\(','\)!=='orderId,originalJson,signature'/);
 assert.match(worker,/const store=env\?\.BILLING_STORE\|\|'BAZAAR'/);
 assert.match(worker,/verifyAndSettleMyket/);
 assert.match(worker,/verifyAndSettle/);
});

test('restore recovers durable account access first and verifies pending store receipts before consume',()=>{
 const flow=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2PurchaseFlow.kt');
 const bazaar=read('android-pilot/app/src/bazaar/kotlin/ir/sahamban/pilot/BillingV2Coordinator.kt');
 const myket=read('android-pilot/app/src/myket/kotlin/ir/sahamban/pilot/BillingV2Coordinator.kt');
 const restore=flow.slice(flow.indexOf('fun restore('));

 const entitlementAt=restore.indexOf('api.refreshEntitlement');
 const billingGateAt=restore.indexOf('if (!BuildConfig.SAHAMBAN_BILLING_ENABLED)');
 const connectAt=restore.indexOf('storeBilling.connect');
 assert.ok(entitlementAt >= 0 && billingGateAt > entitlementAt && connectAt > billingGateAt,
  'durable account entitlement must be checked before optional store restoration');
 assert.match(restore,/if \(!BuildConfig\.SAHAMBAN_BILLING_ENABLED\) \{\s*callback\(listOfNotNull\(durable\)\)/);
 assert.match(restore,/storeBilling\.loadPlanDetails\(skuByPlan\.values\.toList\(\)\)/);
 assert.match(restore,/storeBilling\.restore/);
 assert.match(restore,/evidence\.packageName != expectedPackageName/);
 assert.match(restore,/evidence\.orderId\.matches\(Regex\("\^ord_\[a-f0-9\]\{32\}\$"\)\)/);

 const verifyAt=restore.indexOf('api.verifyPurchase');
 const consumeAt=restore.indexOf('storeBilling.consumeAfterSettlement');
 assert.ok(verifyAt >= 0 && consumeAt > verifyAt,
  'a recovered pending receipt must be server-verified before store consumption');
 const verifiedSuccess=restore.indexOf('is BillingV2ApiClient.Result.Success ->',verifyAt);
 const verifiedFailure=restore.indexOf('is BillingV2ApiClient.Result.Failure ->',verifyAt);
 assert.ok(verifiedSuccess > verifyAt && verifiedFailure > verifiedSuccess);
 assert.ok(restore.indexOf('storeBilling.consumeAfterSettlement',verifiedSuccess) > verifiedSuccess);
 assert.doesNotMatch(restore.slice(verifiedFailure),/storeBilling\.consumeAfterSettlement/,
  'invalid or unavailable verification must leave the store purchase unconsumed');
 assert.match(restore,/listOfNotNull\(durable\) \+ results\.toList\(\)/);

 assert.match(bazaar,/fun restore\(callback: \(List<PurchaseEvidence>\?\) -> Unit\)/);
 assert.match(bazaar,/payment\.getPurchasedProducts/);
 assert.match(myket,/fun restore\(callback: \(List<PurchaseEvidence>\?\) -> Unit\)/);
 assert.match(myket,/billing\.queryInventoryAsync\(\s*false,\s*skus/);
 assert.match(myket,/inventory\.getPurchase\(it\)\?\.toEvidence\(\)/);
});

test('subscription UI disables checkout until all five authoritative store prices load and shows no conflicting hard-coded prices',()=>{
 const ui=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2SubscriptionView.kt');
 const enabled=ui.indexOf('} else {',ui.indexOf('if (!BuildConfig.SAHAMBAN_BILLING_ENABLED)'));
 const load=ui.indexOf('purchaseFlow.loadPlanDetails',enabled);
 const failed=ui.indexOf('if (prices == null || prices.keys !=',load);
 const success=ui.indexOf('catalogReady = true',failed);
 assert.ok(enabled>=0 && load>enabled);
 assert.ok(ui.indexOf('purchaseButtons.forEach { it.isEnabled = false }',enabled)<load,
  'purchase buttons must remain disabled while marketplace prices are loading');
 assert.ok(failed>load && success>failed &&
  ui.indexOf('updateActionButtons()',success)>success,
  'only a complete five-plan price response may enable checkout through the shared state gate');
 assert.match(ui,/prices\.keys != plans\.map \{ it\.id \}\.toSet\(\)/);
 assert.match(ui,/قیمت فروشگاه: \$displayPrice/);
 assert.doesNotMatch(ui,/1_500_000|2_850_000|4_050_000|7_650_000|14_600_000|1500000|2850000|4050000|7650000|14600000/,
  'UI must not display stale hard-coded prices beside marketplace-localized prices');
 assert.match(ui,/برای تکمیل ثبت نهایی فروشگاه، «بازیابی اشتراک» را اجرا کنید/);
});

test('restore and busy-state transitions cannot bypass the complete marketplace catalog gate',()=>{
 const ui=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2SubscriptionView.kt');
 assert.match(ui,/private var catalogReady = false/);
 assert.match(ui,/catalogReady = true/);
 assert.match(ui,/catalogReady = false/);
 assert.match(ui,/purchaseButtons\.forEach \{ it\.isEnabled = !busy && catalogReady \}/);
 assert.match(ui,/setBusy\(value: Boolean, message: String\)[\s\S]*?updateActionButtons\(\)/);
 assert.match(ui,/if \(prices == null \|\| prices\.keys != plans\.map \{ it\.id \}\.toSet\(\)\)[\s\S]*?updateActionButtons\(\)/);
 assert.doesNotMatch(ui,/purchaseButtons\.forEach \{ it\.isEnabled = true \}/,
  'no asynchronous callback may enable checkout without consulting catalog readiness and busy state');
});
