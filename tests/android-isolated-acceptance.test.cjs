'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('acceptance variant has separate identity and no release-side source or signing change',()=>{
 const gradle=read('android-pilot/app/build.gradle');
 const manifest=read('android-pilot/app/src/acceptance/AndroidManifest.xml');
 assert.match(gradle,/acceptance\s*\{[\s\S]*applicationIdSuffix '\.acceptance'/);
 assert.match(gradle,/assets\.srcDir layout\.buildDirectory\.dir\('generated\/acceptanceAssets'\)/);
 assert.match(manifest,/android:name="\.MainActivity" android:enabled="false"/);
 assert.match(manifest,/android:name="\.IsolatedAcceptanceActivity"/);
 assert.match(manifest,/android:allowBackup="false"/);
 assert.doesNotMatch(manifest,/android\.permission\.(READ_|WRITE_|CAMERA|RECORD_AUDIO)/);
 assert.match(gradle,/include '\*\.html', '\*\.js', '\*\.css'/);
 assert.doesNotMatch(gradle,/signingConfigs|storePassword|keyPassword/);
});

test('isolated acceptance WebView denies network and unknown assets, preserves exact native origin',()=>{
 const java=read('android-pilot/app/src/acceptance/java/ir/sahamban/pilot/IsolatedAcceptanceActivity.java');
 const bridge=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BackupExportBridge.java');
 const policy=read('android-pilot/app/src/main/java/ir/sahamban/pilot/BackupExportPolicy.java');
 for(const required of [
  'setBlockNetworkLoads(true)', 'setAllowFileAccess(false)',
  'setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW)',
  'shouldInterceptRequest', 'getAssets().open("pwa/" + name)',
  'new WebResourceResponse("text/plain"', 'return blocked()',
  'loadDataWithBaseURL(TRUSTED, html', 'setServiceWorkerClient',
  'name.equals("sw.js")', 'SERVICE_WORKER_SHOULD_INTERCEPT_REQUEST',
  'BackupImportPolicy.acceptsContentUri', 'clips.getItemCount() == 1',
  'FLAG_GRANT_READ_URI_PERMISSION', 'new BackupExportBridge(this, view)',
  'exporter.install()', 'exporter.onActivityResult',
  'localStorage.setItem', 'نماد-ساختگی-آزمایش'
 ]) assert.ok(java.includes(required),required);
 assert.match(java,/https:\/\/raminhashemi1\.github\.io\/sahamban\//);
 assert.match(bridge,/Collections\.singleton\("https:\/\/raminhashemi1\.github\.io"\)/);
 assert.match(policy,/TrustedNavigation\.isInternal\(pageUrl\)/);
 assert.doesNotMatch(java,/addJavascriptInterface|setBlockNetworkLoads\(false\)/);
 assert.doesNotMatch(java,/http:\/\/|10\.0\.2\.2|localhost/);
});

test('acceptance CI only assembles test APK with pinned asset digest audit',()=>{
 const workflow=read('.github/workflows/android-isolated-acceptance.yml');
 assert.match(workflow,/assembleAcceptance/);
 assert.match(workflow,/app-acceptance\.apk/);
 assert.match(workflow,/acceptance-asset-manifest\.json/);
 assert.match(workflow,/hashlib\.sha256/);
 assert.match(workflow,/ir\.sahamban\.pilot\.acceptance/);
 assert.match(workflow,/upload-artifact/);
 assert.doesNotMatch(workflow,/assembleRelease|bundleRelease|deploy|publishRelease|marketplace/);
 const gradle=read('android-pilot/app/build.gradle');
 assert.match(gradle,/MessageDigest\.getInstance\('SHA-256'\)/);
 assert.match(gradle,/native-backup-export-v1\.js/);
 assert.match(gradle,/tasks\.configureEach/);
});
