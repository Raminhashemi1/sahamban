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


test('account panel sends credentials only to a configured HTTPS origin',()=>{
  const vm=require('node:vm');
  function boot(apiBase){
    const elements=new Map(),calls=[];
    const getElementById=id=>{
      if(!elements.has(id))elements.set(id,{
        hidden:false,textContent:'',children:[],
        addEventListener(){},
        replaceChildren(){this.children=[];},
        appendChild(node){this.children.push(node);}
      });
      return elements.get(id);
    };
    const document={getElementById,querySelector(){return null;}};
    const window={SAHMINO_API_BASE:apiBase};
    const fetch=async(url,options)=>{calls.push({url,options});return {
      ok:false,status:401,json:async()=>({error:'NOT_AUTHENTICATED'})
    };};
    vm.runInNewContext(panel,{window,document,fetch,URL,Intl,Date,Number,String,Math});
    return {calls,elements};
  }

  for(const unsafe of ['',undefined,'http://worker.example',
    'https://worker.example/api','https://user:pass@worker.example',
    'https://worker.example?token=secret','https://worker.example#fragment']){
    const result=boot(unsafe);
    assert.equal(result.calls.length,0,String(unsafe)+' must fail closed');
  }
  const safe=boot('https://worker.example/');
  assert.equal(safe.calls.length,1);
  assert.equal(safe.calls[0].url,'https://worker.example/api/v1/auth/session');
  assert.equal(safe.calls[0].options.credentials,'include');
});
