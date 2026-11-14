'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('acceptance variant has separate identity and no release-side source or signing change',()=>{
 const gradle=read('android-pilot/app/build.gradle');
 const manifest=read('android-pilot/app/src/acceptance/AndroidManifest.xml');
 assert.match(gradle,/acceptance\s*\{[\s\S]*applicationIdSuffix '\.acceptancefix2'/);
 assert.match(gradle,/assets\.srcDir layout\.buildDirectory\.dir\('generated\/acceptanceAssets'\)/);
 assert.match(manifest,/android:name="\.MainActivity" android:enabled="false"/);
 assert.match(manifest,/android:name="\.IsolatedAcceptanceActivity"/);
 assert.match(manifest,/سهام‌بان — آزمون ایزوله ۳/);
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
  'view.loadUrl(TRUSTED)', 'setServiceWorkerClient',
  'name.equals("sw.js")', 'SERVICE_WORKER_SHOULD_INTERCEPT_REQUEST',
  'BackupImportPolicy.acceptsContentUri', 'clips.getItemCount() == 1',
  'FLAG_GRANT_READ_URI_PERMISSION', 'new BackupExportBridge(this, view, true)',
  'exporter.install()', 'exporter.onActivityResult',
  'localStorage.setItem', 'نماد-ساختگی-آزمایش',
  'isSelectedSyntheticOnly(selected)'
 ]) assert.ok(java.includes(required),required);
 assert.match(java,/https:\/\/raminhashemi1\.github\.io\/sahamban\//);
 assert.match(bridge,/Collections\.singleton\("https:\/\/raminhashemi1\.github\.io"\)/);
 assert.match(policy,/TrustedNavigation\.isInternal\(pageUrl\)/);
 assert.match(bridge,/syntheticOnly &&/);
 assert.match(bridge,/isSyntheticLocalSnapshot\(document\)/);
 assert.match(java,/BackupExportBridge\.isSyntheticLocalSnapshot/);
 assert.doesNotMatch(java,/addJavascriptInterface|setBlockNetworkLoads\(false\)|view\.loadDataWithBaseURL\(/);
 assert.match(java,/view\.loadUrl\(TRUSTED\)/);
 assert.match(java,/return localResource\(request\.getUrl\(\)\)/);
 assert.doesNotMatch(java,/http:\/\/|10\.0\.2\.2|localhost/);
});

test('acceptance CI only assembles test APK with pinned asset digest audit',()=>{
 const workflow=read('.github/workflows/android-isolated-acceptance.yml');
 assert.match(workflow,/assembleAcceptance/);
 assert.match(workflow,/app-acceptance\.apk/);
 assert.match(workflow,/acceptance-asset-manifest\.json/);
 assert.match(workflow,/hashlib\.sha256/);
 assert.match(workflow,/ir\.sahamban\.pilot\.acceptancefix2/);
 assert.match(workflow,/upload-artifact/);
 assert.doesNotMatch(workflow,/assembleRelease|bundleRelease|deploy|publishRelease|marketplace/);
 const gradle=read('android-pilot/app/build.gradle');
 assert.match(gradle,/MessageDigest\.getInstance\('SHA-256'\)/);
 assert.match(gradle,/sourceCommit: sourceCommit/);
 assert.match(workflow,/manifest\['sourceCommit'\]/);
 assert.match(workflow,/IsolatedAcceptanceActivity/);
 assert.match(gradle,/native-backup-export-v1\.js/);
 assert.match(gradle,/tasks\.configureEach/);
});

test('synthetic acceptance action is the only visible export control and is full width',()=>{
 const html=read('index.html');
 const start=html.indexOf('id="sb148LocalBackup"');
 const end=html.indexOf('</div></section>',start);
 const panel=html.slice(start,end);
 assert.match(panel,/id="sb148ExportActions" style="display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(panel,/id="sb148Export" type="button" class="secondary" style="width:100%;min-height:56px;white-space:normal"/);
 assert.match(panel,/id="sb148SyntheticExport" type="button" class="secondary" hidden style="display:none"/);
 assert.match(panel,/پل بومی هر محتوای غیرساختگی یا هر کلید اضافه را رد می‌کند/);
});
