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
 assert.match(bridge,/openOutputStream\(destination, "wt"\)/);
 assert.match(bridge,/openInputStream\(destination\)/);
 assert.match(bridge,/BackupFileVerifier\.matches\(input, work\.bytes\)/);
 assert.match(bridge,/FLAG_GRANT_READ_URI_PERMISSION/);
 assert.match(bridge,/FLAG_GRANT_WRITE_URI_PERMISSION/);
 const verifier=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BackupFileVerifier.java');
 assert.match(verifier,/stream\.read\(\) == -1/);
 assert.match(read('.github/workflows/android-pilot-debug.yml'),/BackupFileVerifierTest/);
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

test('debug-only offline self-test uses synthetic JSON, exact trusted origin and SAF roundtrip',()=>{
 const activity=read('android-pilot/app/src/debug/java/ir/sahamban/pilot/BackupSelfTestActivity.java');
 const debugManifest=read('android-pilot/app/src/debug/AndroidManifest.xml');
 const mainManifest=read('android-pilot/app/src/main/AndroidManifest.xml');
 const html=read('android-pilot/app/src/debug/assets/backup-self-test.html');
 const build=read('android-pilot/app/build.gradle');
 assert.match(debugManifest,/BackupSelfTestActivity/);
 assert.match(debugManifest,/android.intent.action.MAIN/);
 assert.doesNotMatch(mainManifest,/BackupSelfTestActivity/);
 for(const constraint of [
  'loadDataWithBaseURL(FIXTURE_URL', 'https://raminhashemi1.github.io/sahamban/',
  'setBlockNetworkLoads(true)', 'setDomStorageEnabled(false)',
  'setAllowFileAccess(false)', 'setAllowContentAccess(true)',
  'setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW)',
  'new BackupExportBridge(this, webView)', 'exporter.onActivityResult(',
  'Intent.ACTION_OPEN_DOCUMENT'])
  assert.ok(activity.includes(constraint),constraint);
 assert.match(build,/versionName '0\\.3\\.3-pilot'/);
 assert.match(activity,/loadDataWithBaseURL\\(FIXTURE_URL, html, "text\\/html", "UTF-8", FIXTURE_URL\\)/);
 assert.doesNotMatch(activity,/loadDataWithBaseURL\\([^;]*null\\)/);
 assert.match(html,/هنوز پاسخی از انتخابگر اندروید نرسیده است/);
 assert.match(html,/12000/);
 assert.match(html,/Content-Security-Policy/);
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/default-src 'none'/);
 assert.match(html,/sahamban-backup-export-v1/);
 assert.match(html,/sahamban-backup-result-v1/);
 assert.match(html,/sahamban-local-backup-v1\.json/);
 assert.match(html,/sahamban-portfolio-backup\.json/);
 assert.match(html,/fileText\(file\)/);
 assert.match(html,/raw!==savedContent/);
 assert.match(html,/syntheticTestNonce/);
 assert.match(html,/crypto\.getRandomValues/);
 assert.match(html,/if\(savedContent===null\)/);
 assert.match(html,/PASS:/);
 assert.match(html,/فولاد,10,1200,1350,1100,1550/);
 assert.doesNotMatch(html,/\blocalStorage\b|\bsessionStorage\b|\bfetch\s*\(|\bXMLHttpRequest\b/);
 assert.doesNotMatch(activity,/setBlockNetworkLoads\(false\)|setAllowFileAccess\(true\)/);
 assert.doesNotMatch(activity,/setAllowContentAccess\(false\)/);
 assert.match(activity,/picker\.addFlags\(Intent\.FLAG_GRANT_READ_URI_PERMISSION\)/);
 assert.match(activity,/"content"\.equals\(chosen\.getScheme\(\)\)/);
 assert.match(activity,/clips\.getItemCount\(\) == 1/);
 assert.match(activity,/setBlockNetworkLoads\(true\)/);
});
