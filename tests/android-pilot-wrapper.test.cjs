'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('Android wrapper keeps HTTPS navigation and sensitive local resources restricted',()=>{
 const m=read('android-pilot/app/src/main/AndroidManifest.xml');
 assert.match(m,/android\\.permission\\.INTERNET/);
 assert.doesNotMatch(m,/android\\.permission\\.(READ_|WRITE_|CAMERA|RECORD_AUDIO|ACCESS_FINE_LOCATION)/);
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

test('Android billing is Bazaar-only with the approved Sahmino identity and no release signing',()=>{
 const build=read('android-pilot/app/build.gradle');
 assert.match(build,/applicationId 'ir\\.manahesab\\.sahmino'/);
 assert.doesNotMatch(build,/signingConfigs|storePassword|keyPassword/);
 const wf=read('.github/workflows/android-pilot-debug.yml');
 assert.match(wf,/compileBazaarDebugJavaWithJavac/);
 assert.doesNotMatch(wf,/compileMyket|MYKET|Google Play|GOOGLE_PLAY|WEB_DIRECT/);
 assert.doesNotMatch(wf,/assembleRelease|bundleRelease|publishRelease|marketplace/);
 assert.doesNotMatch(wf,/upload-artifact|assembleBazaarDebug/);
 assert.match(read('android-pilot/README.md'),/CafeBazaar only/);
 assert.match(build,/bazaar\\s*\\{/);
 assert.doesNotMatch(build,/myket|MYKET|com\\.android\\.vending|ir\\.myket/);
 assert.match(build,/sahmino_pro_365d/);
 assert.match(build,/BAZAAR_IAB_PUBLIC_KEY/);
 assert.doesNotMatch(build,/MYKET_IAB_PUBLIC_KEY/);
 assert.doesNotMatch(read('android-pilot/settings.gradle'),/maven\\.myket/);
});
