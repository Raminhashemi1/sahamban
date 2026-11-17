'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const plansSource=fs.readFileSync('server/prepaid-plans.cjs','utf8');
const html=fs.readFileSync('index.html','utf8');
const bazaar=fs.readFileSync('android-pilot/app/src/bazaar/java/ir/sahamban/pilot/SubscriptionPreviewActivity.java','utf8');
const myket=fs.readFileSync('android-pilot/app/src/myket/java/ir/sahamban/pilot/SubscriptionPreviewActivity.java','utf8');
const expected=[
 {days:30,rial:1500000,id:'SAHMINO_PRO_30D'},
 {days:60,rial:2850000,id:'SAHMINO_PRO_60D'},
 {days:90,rial:4050000,id:'SAHMINO_PRO_90D'},
 {days:180,rial:7650000,id:'SAHMINO_PRO_180D'},
 {days:365,rial:14600000,id:'SAHMINO_PRO_365D'}
];
test('PWA, Bazaar and Myket use the five approved server prices in rial only',()=>{
 const server=plansSource.match(/const LAUNCH_PLANS=Object\.freeze\(\{([\s\S]*?)\n\}\);/);
 assert.ok(server,'server launch catalogue exists');
 const inputs=[...html.matchAll(/<input type="radio" name="sahminoPlanDays" value="(\d+)" data-price-rial="(\d+)"/g)];
 assert.equal(inputs.length,5);
 assert.deepEqual(inputs.map(m=>[Number(m[1]),Number(m[2])]),expected.map(p=>[p.days,p.rial]));
 for(const [channel,source] of [['Bazaar',bazaar],['Myket',myket]]){
  const native=source.match(/(?:PRICE_RIAL|PRICES)\s*=\s*\{([^}]+)\}/);
  assert.ok(native,channel+' rial price table exists');
  assert.deepEqual(native[1].split(',').map(x=>Number(x.trim().replace(/L$/,''))),expected.map(p=>p.rial));
  assert.doesNotMatch(source,/PRICE_TOMAN|priceToman|تومان|formatToman/);
 }
 for(const p of expected) assert.ok(server[1].includes(p.id+':Object.freeze({days:'+p.days+',priceRial:'+p.rial+'})'));
 const section=html.slice(html.indexOf('<section class="card" id="subscriptionSectionSahmino"'),html.indexOf('<div id="sahminoAccountPanel"'));
 assert.ok(section.includes('مبلغ نهایی: ۱٬۵۰۰٬۰۰۰ ریال'));
 assert.doesNotMatch(section,/تومان|data-price-toman/);
});
test('PWA keeps checkout disabled and renewal manual by default',()=>{
 assert.match(html,/تمدید دستی حالت پیش‌فرض است/);
 assert.match(html,/تمدید خودکار در این نسخه ارائه نمی‌شود/);
 const section=html.match(/<section class="card" id="subscriptionSectionSahmino"[\s\S]*?<div id="sahminoAccountPanel"/);
 assert.ok(section);
 assert.match(section[0],/<button type="button" disabled[^>]*>خرید اشتراک/);
 assert.match(section[0],/تخفیف اضافه ندارند/);
});
test('Bazaar Android checkout remains disabled pending Poolakey and server verification',()=>{
 assert.match(bazaar,/پرداخت غیرفعال است/);
 assert.match(bazaar,/اعتبارسنجی رسید سمت سرور هنوز تکمیل نشده است/);
});
test('Myket Android checkout remains disabled pending trusted server verification',()=>{
 assert.match(myket,/setEnabled\(false\)/);
 assert.match(myket,/پرداخت واقعی و فعال‌سازی اشتراک تا اتصال اعتبارسنجی سرور غیرفعال است/);
});
