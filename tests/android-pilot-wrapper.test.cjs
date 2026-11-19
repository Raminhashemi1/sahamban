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

test('debug APK has a temporary identity, no production signing and no checkout',()=>{
 const build=read('android-pilot/app/build.gradle');
 assert.match(build,/applicationId 'ir\.sahamban\.pilot'/);
 assert.doesNotMatch(build,/signingConfigs|storePassword|keyPassword/);
 assert.match(build,/compileSdk 36/);
 assert.match(build,/bazaarImplementation.*Poolakey/);
 assert.match(build,/myketImplementation.*ir\.myket:billing:2\.2/);
 assert.match(build,/SAHAMBAN_BILLING_ENABLED.*false/);
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

test('standalone subscription selector renders five Rial-priced manual plans and restore action',()=>{
 const ui=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2SubscriptionView.kt');
 for(const plan of ['SAHAMBAN_PRO_30D','SAHAMBAN_PRO_60D','SAHAMBAN_PRO_90D',
  'SAHAMBAN_PRO_180D','SAHAMBAN_PRO_365D']) assert.ok(ui.includes(plan),plan);
 for(const price of ['1_500_000L','2_850_000L','4_050_000L','7_650_000L','14_600_000L'])
  assert.ok(ui.includes(price),price);
 assert.match(ui,/ریال/);
 assert.match(ui,/تمدید خودکار نداریم/);
 assert.match(ui,/بازیابی اشتراک/);
 assert.match(ui,/purchaseFlow\.purchase\(plan\.id\)/);
 assert.match(ui,/purchaseFlow\.restore/);
 assert.match(ui,/NOT_AUTHENTICATED/);
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
