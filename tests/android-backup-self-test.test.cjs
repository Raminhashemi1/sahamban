'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const html=fs.readFileSync('android-pilot/app/src/debug/assets/backup-self-test.html','utf8');
const source=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
assert.ok(source,'debug fixture must have a local inline script');

function harness(withBridge=true){
 const elements=new Map(),handlers=new Map(),requests=[],timeouts=[];
 const node=(id)=>{
  if(!elements.has(id))elements.set(id,{
   id,textContent:'',className:'',disabled:false,files:[],
   addEventListener(type,fn){handlers.set(id+':'+type,fn);}
  });
  return elements.get(id);
 };
 const callbacks=new Set();
 const bridge={
  postMessage(value){requests.push(JSON.parse(value));},
  addEventListener(type,cb){assert.equal(type,'message');callbacks.add(cb);}
 };
 let value=10;
 const crypto={getRandomValues(array){
  for(let i=0;i<array.length;i++)array[i]=value++;
  return array;
 }};
 const window={crypto,setTimeout(cb,ms){timeouts.push({cb,ms});return timeouts.length;}};
 if(withBridge)window.SahambanBackupExport=bridge;
 vm.runInNewContext(source,{window,document:{getElementById:node},crypto,Uint32Array,FileReader:class{}});
 const click=id=>handlers.get(id+':click')();
 const read=async(content)=>{
  const file={size:Buffer.byteLength(content,'utf8'),text:async()=>content};
  node('restore').files=[file];
  return handlers.get('restore:change')();
 };
 const reply=(request,status)=>{
  const data=JSON.stringify({
   protocol:'sahamban-backup-result-v1',requestId:request.requestId,status
  });
  for(const cb of callbacks)cb({data});
 };
 return {node,requests,click,read,reply,
  expireSaveWarning(){for(const timeout of timeouts)timeout.cb();},
  saveWarningDelay(){return timeouts.at(-1)?.ms;}
 };
}

test('fresh random nonce binds PASS to the same saved synthetic file, never a stale one',async()=>{
 const h=harness();
 h.click('local');
 const first=h.requests.at(-1);
 assert.equal(first.protocol,'sahamban-backup-export-v1');
 assert.equal(first.name,'sahamban-local-backup-v1.json');
 assert.equal(JSON.parse(first.content).format,'sahamban-local-backup');
 assert.ok(JSON.parse(first.content).syntheticTestNonce);
 assert.equal(h.node('local').disabled,true);
 h.reply(first,'saved');
 assert.equal(h.node('local').disabled,false);
 assert.doesNotMatch(h.node('status').textContent,/^PASS:/);
 await h.read(first.content);
 assert.match(h.node('status').textContent,/^PASS:/);
 h.click('local');
 const second=h.requests.at(-1);
 assert.notEqual(JSON.parse(first.content).syntheticTestNonce,
   JSON.parse(second.content).syntheticTestNonce);
 h.reply(second,'saved');
 await h.read(first.content);
 assert.match(h.node('status').textContent,/^FAIL:/);
 await h.read(second.content);
 assert.match(h.node('status').textContent,/^PASS:/);
});

test('cancelled or failed save cannot claim PASS even if a matching JSON file is supplied',async()=>{
 const h=harness();
 h.click('risk');
 const pending=h.requests.at(-1);
 assert.equal(pending.name,'sahamban-portfolio-backup.json');
 h.reply(pending,'cancelled');
 await h.read(pending.content);
 assert.doesNotMatch(h.node('status').textContent,/^PASS:/);
 h.click('risk');
 const failed=h.requests.at(-1);
 h.reply(failed,'failed');
 await h.read(failed.content);
 assert.doesNotMatch(h.node('status').textContent,/^PASS:/);
});

test('missing secure Android WebMessage bridge is a visible fail-closed outcome',()=>{
 const h=harness(false);
 h.click('local');
 assert.equal(h.requests.length,0);
 assert.match(h.node('status').textContent,/قابلیت پیام امن را ندارد/);
 assert.doesNotMatch(h.node('status').textContent,/^PASS:/);
});

test('payload tampering and invalid JSON cannot pass readback',async()=>{
 const h=harness();
 h.click('risk');
 const request=h.requests.at(-1);
 h.reply(request,'saved');
 const forged=JSON.stringify({...JSON.parse(request.content),riskCap:'1'});
 await h.read(forged);
 assert.match(h.node('status').textContent,/^FAIL:/);
 await h.read('not a JSON file');
 assert.match(h.node('status').textContent,/^FAIL:/);
});

test('no native picker response warns the user after 12 seconds without claiming saved',()=>{
 const h=harness();
 h.click('local');
 assert.equal(h.saveWarningDelay(),12000);
 assert.match(h.node('status').textContent,/درخواست ذخیره ارسال شد/);
 h.expireSaveWarning();
 assert.match(h.node('status').textContent,/هنوز پاسخی از انتخابگر اندروید نرسیده است/);
 assert.match(h.node('status').textContent,/هیچ فایل تأیید نشده است/);
 assert.doesNotMatch(h.node('status').textContent,/^PASS:/);
 assert.equal(h.node('local').disabled,true);
});

test('late warning never overrides native save response before expiry',()=>{
 const h=harness();
 h.click('local');
 h.reply(h.requests.at(-1),'saved');
 const afterSave=h.node('status').textContent;
 h.expireSaveWarning();
 assert.equal(h.node('status').textContent,afterSave);
 assert.doesNotMatch(afterSave,/^PASS:/);
});
