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
 for(const guard of [
  'WebViewCompat.addWebMessageListener','WebViewFeature.WEB_MESSAGE_LISTENER',
  'new HashSet<>(Arrays.asList("https://raminhashemi1.github.io"))',
  '!isMainFrame','isTrustedMainFrame(view, sourceOrigin)',
  'path.startsWith("/sahamban/")','Intent.ACTION_CREATE_DOCUMENT',
  'getContentResolver().openOutputStream','MAX_BACKUP_BYTES',
  'sahamban-local-backup-v1.json','validateBackupSnapshot(content)'
 ])assert.ok(java.includes(guard),guard);
 assert.match(java,/BACKUP_KEYS\.contains\(key\)/);
 assert.match(java,/sourceOrigin\.getHost\(\)/);
 assert.ok(java.indexOf('reportBackupResult("saved")')>java.indexOf('catch (Exception error)'));
 const readme=read('android-pilot/README.md');
 assert.doesNotMatch(readme,/Backup export\s+and downloads are NOT yet verified/);
 assert.match(readme,/WebMessageListener/);
 assert.match(readme,/256 KiB/);
});

test('Android pilot uses the owner-approved permanent package ID, no production signing and no checkout',()=>{
 const build=read('android-pilot/app/build.gradle');
 assert.ok(build.includes("applicationId 'ir.sahmino.app'"));
 assert.doesNotMatch(build,/signingConfigs|storePassword|keyPassword/);
 const wf=read('.github/workflows/android-pilot-debug.yml');
 assert.match(wf,/assembleDebug/);
 assert.doesNotMatch(wf,/assembleRelease|bundleRelease|publishRelease|marketplace/);
 assert.match(wf,/upload-artifact/);
 assert.match(read('android-pilot/README.md'),/not.*signed production release/i);
});
