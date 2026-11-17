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
 const wf=read('.github/workflows/android-pilot-debug.yml');
 assert.match(wf,/assembleBazaarDebug/);
 assert.match(wf,/assembleMyketDebug/);
 assert.doesNotMatch(wf,/assembleRelease|bundleRelease|publishRelease/);
 assert.match(wf,/upload-artifact/);
 assert.match(build,/bazaarImplementation 'com\\.github\\.cafebazaar\\.Poolakey:poolakey:2\\.3\\.0'/);
 assert.match(build,/myketImplementation 'ir\\.myket:billing:2\\.2'/);
 assert.match(build,/applicationId 'ir\\.sahamban\\.pilot'/);
 assert.match(build,/BAZAAR_PUBLIC_KEY/);
 assert.match(build,/MYKET_PUBLIC_KEY/);
 assert.match(read('android-pilot/README.md'),/not.*signed production release/i);
});

test('Sahmino subscription preview displays all five approved periods and exact rial prices',()=>{
 const activity=read('android-pilot/app/src/main/java/ir/sahamban/pilot/SubscriptionPreviewActivity.java');
 assert.match(activity,/DAYS = \{30, 60, 90, 180, 365\}/);
 assert.match(activity,/PRICES_RIAL = \{1500000, 2850000, 4050000, 7650000, 14600000\}/);
 assert.match(activity,/حالت تمدید پیش‌فرض: دستی/);
 assert.match(activity,/تمدید خودکار تا اتصال و تأیید رسمی ارائه‌دهنده غیرفعال است/);
 assert.match(activity,/پرداخت واقعی در این نسخه آزمایشی غیرفعال است/);
 assert.match(activity,/ریال/);
 assert.doesNotMatch(activity,/تومان|TOMAN/);
 const web=read('index.html');
 for(const amount of ['۱٬۵۰۰٬۰۰۰ ریال','۲٬۸۵۰٬۰۰۰ ریال','۴٬۰۵۰٬۰۰۰ ریال','۷٬۶۵۰٬۰۰۰ ریال','۱۴٬۶۰۰٬۰۰۰ ریال']) assert.ok(web.includes(amount),amount);
 const sectionStart=web.indexOf('<section class="card" id="subscriptionSectionSahmino"');
 const sectionEnd=web.indexOf('</section>',sectionStart);
 const section=sectionStart>=0&&sectionEnd>sectionStart?web.slice(sectionStart,sectionEnd):'';
 assert.ok(section);
 assert.doesNotMatch(section,/تومان/);
});
