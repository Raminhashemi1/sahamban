'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const plansSource=fs.readFileSync('server/prepaid-plans.cjs','utf8');
const html=fs.readFileSync('index.html','utf8');
const bazaar=fs.readFileSync('android-pilot/app/src/bazaar/java/ir/sahamban/pilot/SubscriptionPreviewActivity.java','utf8');
const expected=[
 {days:30,rial:1500000,id:'SAHMINO_PRO_30D'},
 {days:60,rial:2850000,id:'SAHMINO_PRO_60D'},
 {days:90,rial:4050000,id:'SAHMINO_PRO_90D'},
 {days:180,rial:7650000,id:'SAHMINO_PRO_180D'},
 {days:365,rial:14600000,id:'SAHMINO_PRO_365D'}
];
test('PWA and Bazaar use the five approved server prices in rial only',()=>{
 assert.ok(plansSource.includes('const LAUNCH_PLANS=Object.freeze({'),'server launch catalogue exists');
 const inputs=[...html.matchAll(/<input[^>]*name="sahminoPlanDays"[^>]*>/g)];
 assert.equal(inputs.length,5);
 const actual=inputs.map(([tag])=>[
  Number(tag.match(/\\bvalue="(\\d+)"/)?.[1]),
  Number(tag.match(/\\bdata-price-rial="(\\d+)"/)?.[1])
 ]);
 assert.deepEqual(actual,expected.map(p=>[p.days,p.rial]));
 for(const p of expected) assert.ok(plansSource.includes(p.id+':Object.freeze({days:'+p.days+',priceRial:'+p.rial+'})'));
 for(const p of expected) {
  assert.ok(bazaar.includes(p.days+''));
  assert.ok(bazaar.includes(p.rial+'L'));
 }
 assert.doesNotMatch(bazaar,/PRICE_TOMAN|priceToman|تومان|formatToman/);
 const start=html.indexOf('id="subscriptionSectionSahmino"');
 const end=html.indexOf('<div id="sahminoAccountPanel"',start);
 assert.ok(start>=0&&end>start,'subscription section boundaries exist');
 const section=html.slice(start,end);
 assert.ok(section.includes('مبلغ نهایی: ۱٬۵۰۰٬۰۰۰ ریال'));
 assert.doesNotMatch(section,/تومان|data-price-toman/);
});
test('PWA keeps checkout disabled and renewal manual by default',()=>{
 assert.match(html,/تمدید دستی حالت پیش‌فرض است/);
 assert.match(html,/تمدید خودکار در این نسخه ارائه نمی‌شود/);
 const start=html.indexOf('id="subscriptionSectionSahmino"');
 const end=html.indexOf('<div id="sahminoAccountPanel"',start);
 assert.ok(start>=0&&end>start);
 const section=html.slice(start,end);
 assert.match(section,/<button type="button" disabled[^>]*>خرید اشتراک/);
 assert.match(section,/تخفیف اضافه ندارند/);
});
test('Bazaar Android preview remains visible and payment stays disabled until trusted server verification',()=>{
 assert.match(bazaar,/پرداخت و فعال‌سازی Pro تا تأیید رسید توسط سرور غیرفعال است/);
 assert.match(bazaar,/پرداخت تا اتصال سفارش احراز‌شده و اعتبارسنجی سرور غیرفعال است/);
});
