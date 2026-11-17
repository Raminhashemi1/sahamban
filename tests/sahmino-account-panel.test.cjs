'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const panel=fs.readFileSync('sahmino-account-panel.js','utf8');

test('account panel creates and retrieves pending orders through the implemented API route',()=>{
  assert.match(panel,/call\('\/api\/v1\/me\/prepaid-orders'\)/);
  assert.match(panel,/call\('\/api\/v1\/me\/prepaid-orders',\{method:'POST'/);
  assert.match(panel,/X-Sahmino-CSRF/);
  assert.match(panel,/PENDING_ORDER_CREATED/);
});

test('pending order UI never redirects to checkout or claims payment succeeded',()=>{
  assert.doesNotMatch(panel,/prepaid-checkout|checkoutUrl|location\.assign/);
  assert.match(panel,/این سفارش پرداخت نیست/);
  assert.match(panel,/تا تأیید پرداخت، اشتراکی فعال نمی‌شود/);
});

test('account panel reuses the five server-approved plan IDs',()=>{
  for(const id of ['SAHMINO_PRO_30D','SAHMINO_PRO_60D','SAHMINO_PRO_90D','SAHMINO_PRO_180D','SAHMINO_PRO_365D'])
    assert.ok(panel.includes(id),id+' remains selectable');
});
