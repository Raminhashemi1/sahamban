'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const plansSource=fs.readFileSync('server/prepaid-plans.cjs','utf8');
const html=fs.readFileSync('index.html','utf8');
const android=fs.readFileSync('android-pilot/app/src/main/java/ir/sahamban/pilot/SubscriptionPreviewActivity.java','utf8');

const expected=[
  {days:30,toman:150000,rial:1500000,id:'SAHMINO_PRO_30D'},
  {days:60,toman:285000,rial:2850000,id:'SAHMINO_PRO_60D'},
  {days:90,toman:405000,rial:4050000,id:'SAHMINO_PRO_90D'},
  {days:180,toman:765000,rial:7650000,id:'SAHMINO_PRO_180D'},
  {days:365,toman:1460000,rial:14600000,id:'SAHMINO_PRO_365D'}
];

test('PWA and Android display exactly the five approved server catalogue prices',()=>{
  const server=plansSource.match(/const LAUNCH_PLANS=Object\.freeze\(\{([\s\S]*?)\n\}\);/);
  assert.ok(server,'server launch catalogue exists');
  const pwaInputs=[...html.matchAll(/<input type="radio" name="sahminoPlanDays" value="(\d+)" data-price-toman="(\d+)"/g)];
  assert.equal(pwaInputs.length,5);
  assert.deepEqual(pwaInputs.map(m=>[Number(m[1]),Number(m[2])]),
    expected.map(p=>[p.days,p.toman]));
  const native=android.match(/PRICE_TOMAN\s*=\s*\{([^}]+)\}/);
  assert.ok(native,'Android display price table exists');
  assert.deepEqual(native[1].split(',').map(x=>Number(x.trim())),
    expected.map(p=>p.toman));
  for(const plan of expected){
    assert.match(server[1],new RegExp(plan.id+'\\s*:\\s*Object\\.freeze\\(\\{days:'+plan.days+',priceRial:'+plan.rial+'\\}\\)'));
  }
});

test('PWA updates selected plan amount and keeps checkout disabled',()=>{
  assert.match(html,/function update\(\)[\s\S]*?sahmino-plan-price[\s\S]*?مبلغ نهایی/);
  assert.match(html,/تمدید دستی حالت پیش‌فرض است/);
  assert.match(html,/تمدید خودکار در این نسخه ارائه نمی‌شود/);
  const section=html.match(/<section class="card" id="subscriptionSectionSahmino"[\s\S]*?<\/section>/);
  assert.ok(section);
  assert.match(section[0],/<button type="button" disabled[^>]*>خرید اشتراک/);
  assert.match(section[0],/تخفیف اضافه ندارند/);
});

test('Android updates selected amount and keeps all payment actions disabled',()=>{
  assert.match(android,/selectedPriceToman\(\)/);
  assert.match(android,/setEnabled\(false\)/);
  assert.match(android,/تمدید دستی حالت پیش‌فرض است/);
  assert.match(android,/تمدید خودکار در این نسخه ارائه نمی‌شود/);
  assert.match(android,/پرداخت واقعی و فعال‌سازی اشتراک غیرفعال است/);
});


test('Android preview labels every approved duration and display amount in toman without payment',()=>{
  const preview=fs.readFileSync(
    'android-pilot/app/src/main/java/ir/sahamban/pilot/SubscriptionPreviewActivity.java','utf8');
  assert.match(preview,/PRICE_TOMAN\s*=\s*\{150000, 285000, 405000, 765000, 1460000\}/);
  assert.match(preview,/days \+ " روز — "\s*\+\s*formatToman\(PRICE_TOMAN\[i\]\) \+ " تومان"/);
  assert.match(preview,/" دوره انتخابی: "|"دوره انتخابی: "/);
  assert.match(preview,/" تومان\\n"/);
  assert.match(preview,/Button payment = choice\("پرداخت واقعی — غیرفعال"\);[\s\S]*?payment\.setEnabled\(false\)/);
});
