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

test('market variants use separate store flavors, temporary identity and no production signing',()=>{
 const build=read('android-pilot/app/build.gradle');
 assert.match(build,/applicationId 'ir\.sahamban\.pilot'/);
 assert.doesNotMatch(build,/signingConfigs|storePassword|keyPassword/);
 const wf=read('.github/workflows/android-pilot-debug.yml');
 assert.match(wf,/assembleBazaarDebug/);\n assert.match(wf,/assembleMyketDebug/);\n assert.match(wf,/sahmino-market-debug-apks-NOT-FOR-STORE/);
 assert.doesNotMatch(wf,/assembleRelease|bundleRelease|publishRelease|marketplace/);
 assert.match(wf,/upload-artifact/);
 assert.match(read('android-pilot/README.md'),/not.*signed production release/i);
 assert.match(build,/bazaar\\s*\\{/);
 assert.match(build,/myket\\s*\\{/);
 assert.match(build,/ir\\.myket:billing:2\\.2/);
 assert.match(build,/sahmino_pro_365d/);
 assert.match(build,/BAZAAR_IAB_PUBLIC_KEY/);
 assert.match(build,/MYKET_IAB_PUBLIC_KEY/);
 assert.doesNotMatch(build,/com\\.android\\.vending/);
});
