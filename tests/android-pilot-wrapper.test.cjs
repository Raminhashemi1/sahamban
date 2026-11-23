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
 assert.match(build,/def releaseStoreFile = System\.getenv\('SAHMINO_RELEASE_KEYSTORE_PATH'\)/);
 assert.match(build,/def releaseSigningReady = .*file\(releaseStoreFile\)\.isFile\(\)/);
 assert.match(build,/System\.getenv\('SAHMINO_RELEASE_STORE_PASSWORD'\)/);
 assert.match(build,/if \(releaseSigningReady\) signingConfig signingConfigs\.release/);
 assert.doesNotMatch(build,/storePassword\s+['\"]/);
 assert.match(build,/compileSdk 36/);
 assert.match(build,/bazaarImplementation.*Poolakey/);
 assert.match(build,/myketImplementation.*ir\.myket:billing:2\.2/);
 assert.match(build,/System\.getenv\('SAHAMBAN_BILLING_ENABLED'\) == 'true'/);
 assert.match(build,/allSkusPresent/);
 assert.ok(build.includes("appId != 'ir.sahamban.pilot'"));
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

test('Billing API client obtains fresh native password-session cookie headers and never uses bearer tokens',()=>{
 const api=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2ApiClient.kt');
 assert.match(api,/fun interface BillingV2AuthProvider/);
 assert.match(api,/private val authProvider: BillingV2AuthProvider/);
 assert.match(api,/authProvider\.getHeaders/);
 assert.match(api,/sahmino_session=\[a-f0-9\]\{64\}/);
 assert.match(api,/X-Sahmino-CSRF/);
 assert.match(api,/BuildConfig\.SAHAMBAN_PWA_ORIGIN/);
 assert.match(api,/NOT_AUTHENTICATED/);
 assert.doesNotMatch(api,/Authorization|Bearer|BillingV2TokenProvider/);
 assert.equal((api.match(/instanceFollowRedirects = false/g)||[]).length,2);
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
 assert.ok(restore.indexOf('api.refreshEntitlement') < restore.indexOf('storeBilling.connect'));
 assert.match(restore,/if \(!BuildConfig\.SAHAMBAN_BILLING_ENABLED\)/);
 assert.doesNotMatch(ui,/1_500_000L|2_850_000L|4_050_000L|7_650_000L|14_600_000L/);
});

test('native password auth client creates and persists an HttpOnly session without JS exposure',()=>{
 const auth=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2NativeAuthClient.kt');
 assert.match(auth,/fun login\(username: String, password: String/);
 assert.match(auth,/api\/v1\/auth\/login/);
 assert.match(auth,/fun logout\(/);
 assert.match(auth,/fun checkSession\(/);
 assert.match(auth,/setCookie\(workerBaseUrl, cookie\)/);
 assert.match(auth,/Normalizer\.Form\.NFKC/);
 assert.match(auth,/digits\.matches\(Regex\(\"\^00989/);
 assert.match(auth,/CookieManager\.getInstance\(\)/);
 assert.match(auth,/HttpOnly/);
 assert.match(auth,/SameSite=None/);
 assert.match(auth,/X-Sahmino-CSRF/);
 assert.match(auth,/Origin", pwaOrigin/);
 assert.doesNotMatch(auth,/Log\.|println\(|addJavascriptInterface|evaluateJavascript/);
 assert.equal((auth.match(/instanceFollowRedirects = false/g)||[]).length,3);
 assert.match(auth,/singleOrNull/);
 assert.match(auth,/SESSION_COOKIE_REJECTED/);
 assert.doesNotMatch(auth,/otp|sms|codeInput|challengeId/i);
});

test('Android host gates PWA startup behind native username/password auth and revalidates sessions',()=>{
 const activity=read('android-pilot/app/src/main/java/ir/sahamban/pilot/MainActivity.java');
 const auth=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2NativeAuthClient.kt');
 const login=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2LoginView.kt');
 assert.match(activity,/new BillingV2NativeAuthClient/);
 assert.match(activity,/authClient\.checkSession/);
 assert.match(activity,/showLogin\(\)/);
 assert.match(activity,/showWebApp\(\)/);
 assert.match(activity,/performLogout/);
 assert.match(activity,/setAcceptThirdPartyCookies\(webView, true\)/);
 assert.match(activity,/TrustedNavigation\.isInternal/);
 assert.match(auth,/api\/v1\/auth\/session/);
 assert.match(auth,/api\/v1\/auth\/logout/);
 assert.match(login,/authClient\.login\(username, password\)/);
 assert.match(login,/passwordInput/);
 assert.match(login,/asciiDigits/);
 assert.match(login,/AuthenticatedListener/);
 assert.doesNotMatch(activity,/addJavascriptInterface|evaluateJavascript|OTP|Sms/);
});

test('native subscription entry is reachable only after password session and fails closed without owner SKU configuration',()=>{
 const activity=read('android-pilot/app/src/main/java/ir/sahamban/pilot/MainActivity.java');
 const host=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2SubscriptionHost.kt');
 const build=read('android-pilot/app/build.gradle');
 assert.match(activity,/authClient\.checkSession/);
 assert.match(activity,/showSubscription\(\)/);
 assert.match(activity,/new BillingV2SubscriptionHost/);
 assert.match(activity,/showingSubscription/);
 assert.match(activity,/boolean loadPwa = webView == null/);
 assert.match(activity,/if \(loadPwa\) webView\.loadUrl\(START_URL\)/);
 assert.doesNotMatch(activity,/^\s*webView\.loadUrl\(START_URL\);$/m);
 assert.match(activity,/subscriptionHost\.close\(\)/);
 assert.match(host,/SAHAMBAN_EXPECTED_PACKAGE_NAME/);
 for(const sku of ['30D','60D','90D','180D','365D']) assert.match(host,new RegExp('SAHAMBAN_SKU_PRO_'+sku));
 assert.match(host,/UNCONFIGURED_SAHAMBAN_PRO_30D/);
 assert.match(host,/if \(!packageUsable\)/);
 assert.match(host,/BillingV2PurchaseFlow\(/);
 assert.match(host,/BillingV2SubscriptionView\(/);
 assert.match(build,/SAHAMBAN_EXPECTED_PACKAGE_NAME/);
 assert.match(build,/SAHAMBAN_SKU_PRO_30D/);
 assert.match(build,/SAHAMBAN_SKU_PRO_365D/);
 assert.match(build,/buildConfigField 'boolean', 'SAHAMBAN_BILLING_ENABLED', 'false'/);
});

test('native password login exposes one-time recovery without passing credentials to WebView',()=>{
 const client=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2NativeAuthClient.kt');
 const view=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2LoginView.kt');
 assert.match(client,/\/api\/v1\/auth\/recover/);
 assert.match(client,/recoveryCode/);
 assert.match(view,/بازیابی رمز عبور با کد یک‌بارمصرف/);
 assert.match(view,/هر کد فقط یک‌بار قابل استفاده است/);
 assert.match(view,/INVALID_RECOVERY/);
});
