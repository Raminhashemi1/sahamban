'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const plansSource=fs.readFileSync('server/prepaid-plans.cjs','utf8');
const html=fs.readFileSync('index.html','utf8');
const android=fs.readFileSync('android-pilot/app/src/main/java/ir/sahamban/pilot/SubscriptionPreviewActivity.java','utf8');
const expected=[
  {days:30,rial:1500000,id:'SAHMINO_PRO_30D'},
  {days:60,rial:2850000,id:'SAHMINO_PRO_60D'},
  {days:90,rial:4050000,id:'SAHMINO_PRO_90D'},
  {days:180,rial:7650000,id:'SAHMINO_PRO_180D'},
  {days:365,rial:14600000,id:'SAHMINO_PRO_365D'}
];

test('PWA and Android display exactly the five approved server catalogue prices in rial',()=>{
  const server=plansSource.match(/const LAUNCH_PLANS=Object\\.freeze\\(\\{([\\s\\S]*?)\\n\\}\\);/);
  assert.ok(server,'server launch catalogue exists');
  const pwaInputs=[...html.matchAll(/<input type="radio" name="sahminoPlanDays" value="(\\d+)" data-price-rial="(\\d+)"/g)];
  assert.equal(pwaInputs.length,5);
  assert.deepEqual(pwaInputs.map(m=>[Number(m[1]),Number(m[2])]),expected.map(p=>[p.days,p.rial]));
  const native=android.match(/PRICE_RIAL\\s*=\\s*\\{([^}]+)\\}/);
  assert.ok(native,'Android rial display price table exists');
  assert.deepEqual(native[1].split(',').map(x=>Number(x.trim().replace(/L$/,''))),expected.map(p=>p.rial));
  for(const plan of expected)assert.match(server[1],new RegExp(plan.id+'\\\\s*:\\\\s*Object\\\\.freeze\\\\(\\\\{days:'+plan.days+',priceRial:'+plan.rial+'\\\\}\\\\)'));
  assert.doesNotMatch(html,/data-price-toman|تومان/);
  assert.doesNotMatch(android,/PRICE_TOMAN|priceToman|تومان|formatToman/);
});

test('PWA updates selected plan amount and keeps checkout disabled',()=>{
  assert.match(html,/function update\\(\\)[\\s\\S]*?sahmino-plan-price[\\s\\S]*?مبلغ نهایی/);
  assert.match(html,/تمدید دستی حالت پیش‌فرض است/);
  assert.match(html,/تمدید خودکار در این نسخه ارائه نمی‌شود/);
  const section=html.match(/<section class="card" id="subscriptionSectionSahmino"[\\s\\S]*?<\\/section>/);
  assert.ok(section);
  assert.match(section[0],/<button type="button" disabled[^>]*>خرید اشتراک/);
  assert.match(section[0],/تخفیف اضافه ندارند/);
  assert.match(section[0],/ریال/);
});

test('Android updates selected rial amount and keeps payment disabled',()=>{
  assert.match(android,/selectedPriceRial\\(\\)/);
  assert.match(android,/setEnabled\\(false\\)/);
  assert.match(android,/تمدید دستی حالت پیش‌فرض است/);
  assert.match(android,/پرداخت واقعی و فعال‌سازی اشتراک غیرفعال است/);
  assert.match(android,/ریال/);
});

test('Android preview displays every approved rial amount without payment',()=>{
  assert.match(android,/PRICE_RIAL\\s*=\\s*\\{1500000L, 2850000L, 4050000L, 7650000L, 14600000L\\}/);
  assert.match(android,/formatRial\\(PRICE_RIAL\\[i\\]\\) \\+ " ریال"/);
  assert.match(android,/formatRial\\(selectedPriceRial\\(\\)\\) \\+ " ریال\\\\n"/);
  assert.match(android,/Button payment = choice\\("پرداخت واقعی — غیرفعال"\\);[\\s\\S]*?payment\\.setEnabled\\(false\\)/);
});
