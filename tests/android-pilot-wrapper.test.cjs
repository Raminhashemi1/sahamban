'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('Android wrapper keeps HTTPS navigation and sensitive local resources restricted',()=>{
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

test('market variants use separate store flavors, approved Sahmino identity and no production signing',()=>{
 const build=read('android-pilot/app/build.gradle');
 assert.match(build,/applicationId 'ir\.manahesab\.sahmino'/);
 assert.doesNotMatch(build,/signingConfigs|storePassword|keyPassword/);
 const wf=read('.github/workflows/android-pilot-debug.yml');
 assert.match(wf,/compileBazaarDebugJavaWithJavac/);
 assert.match(wf,/compileMyketDebugJavaWithJavac/);
 assert.match(wf,/Compile-check both store variants/);
 assert.match(wf,/assembleBazaarDebug/);
 assert.match(wf,/assembleMyketDebug/);
 assert.match(wf,/actions\/upload-artifact@v4/);
 assert.doesNotMatch(wf,/assembleRelease|bundleRelease|publishRelease/);
 assert.match(read('android-pilot/README.md'),/internal debug-only/);
 assert.match(build,/bazaar\s*\{/);
 assert.match(build,/myket\s*\{/);
 const bazaarUi=read('android-pilot/app/src/bazaar/java/ir/sahamban/pilot/SubscriptionPreviewActivity.java');
 const myketUi=read('android-pilot/app/src/myket/java/ir/sahamban/pilot/SubscriptionPreviewActivity.java');
 assert.match(bazaarUi,/پرداخت امن از طریق کافه‌بازار/);
 assert.match(bazaarUi,/خرید اشتراک از کافه‌بازار/);
 assert.match(myketUi,/پرداخت امن از طریق مایکت/);
 assert.match(myketUi,/خرید اشتراک از مایکت/);
 assert.match(build,/ir\.myket:billing:2\.2/);
 assert.match(build,/sahmino_pro_.*suffix\.toLowerCase\(\)/);
 assert.match(build,/BAZAAR_IAB_PUBLIC_KEY/);
 assert.match(build,/MYKET_IAB_PUBLIC_KEY/);
 assert.doesNotMatch(build,/com\.android\.vending/);
});
