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

test('native backup export is origin-scoped, user-selected and has no broad JS file bridge',()=>{
 const bridge=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BackupExportBridge.java');
 const policy=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BackupExportPolicy.java');
 const activity=read('android-pilot/app/src/main/java/ir/sahamban/pilot/MainActivity.java');
 const deps=read('android-pilot/app/build.gradle');
 for(const required of [
  'WebViewCompat.addWebMessageListener', 'WEB_MESSAGE_LISTENER',
  'sourceOrigin.toString()', 'isMainFrame', 'requestId',
  'ACTION_CREATE_DOCUMENT', 'CATEGORY_OPENABLE', 'openOutputStream',
  'MAX_MESSAGE_CHARS', 'MAX_JSON_BYTES', 'content.getBytes',
  'try (OutputStream', '"saved"'])
  assert.ok((bridge+policy).includes(required),required);
 assert.ok(policy.includes('TrustedNavigation.isInternal(pageUrl)'));
 assert.ok(policy.includes('https://raminhashemi1.github.io'));
 assert.ok(!bridge.includes('addJavascriptInterface'));
 assert.ok(activity.includes('backupExport.install()'));
 assert.ok(activity.includes('backupExport.onActivityResult('));
 assert.match(deps,/androidx\.webkit:webkit:1\.14\.0/);
 assert.match(read('.github/workflows/android-pilot-debug.yml'),/BackupExportPolicyTest/);
});

test('debug APK has a temporary identity, no production signing and no checkout',()=>{
 const build=read('android-pilot/app/build.gradle');
 assert.match(build,/applicationId 'ir\.sahamban\.pilot'/);
 assert.doesNotMatch(build,/signingConfigs|storePassword|keyPassword/);
 const wf=read('.github/workflows/android-pilot-debug.yml');
 assert.match(wf,/assembleDebug/);
 assert.doesNotMatch(wf,/assembleRelease|bundleRelease|publishRelease|marketplace/);
 assert.match(wf,/upload-artifact/);
 assert.match(read('android-pilot/README.md'),/not.*signed production release/i);
});
