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

test('Billing API client obtains a fresh native session token per request',()=>{
 const api=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BillingV2ApiClient.kt');
 assert.match(api,/fun interface BillingV2TokenProvider/);
 assert.match(api,/private val tokenProvider: BillingV2TokenProvider/);
 assert.match(api,/tokenProvider\.getToken/);
 assert.match(api,/NOT_AUTHENTICATED/);
 assert.match(api,/tokenProvider\.getToken[\s\S]*?main\.post/);
 assert.doesNotMatch(api,/private val bearerToken/);
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
