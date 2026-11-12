'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const client=require('../native-backup-export-v1.js');

test('WebView sends an origin-scoped native request and waits for the actual result',async()=>{
 const callbacks=new Set(),requests=[];
 const bridge={
  addEventListener(type,fn){assert.equal(type,'message');callbacks.add(fn);},
  removeEventListener(type,fn){assert.equal(type,'message');callbacks.delete(fn);},
  postMessage(raw){requests.push(JSON.parse(raw));}
 };
 const win={SahambanBackupExport:bridge,navigator:{userAgent:'SahambanPilotWebView/1'}};
 const pending=client.save(win,'sahamban-local-backup-v1.json','{"format":"sahamban-local-backup","schema":1,"items":{}}');
 assert.equal(requests.length,1);
 assert.equal(requests[0].protocol,'sahamban-backup-export-v1');
 assert.equal(requests[0].name,'sahamban-local-backup-v1.json');
 assert.equal(requests[0].content,'{"format":"sahamban-local-backup","schema":1,"items":{}}');
 for(const fn of callbacks)fn({data:JSON.stringify({protocol:'sahamban-backup-result-v1',requestId:'unrelated',status:'saved'})});
 assert.equal(callbacks.size,1);
 for(const fn of callbacks)fn({data:JSON.stringify({protocol:'sahamban-backup-result-v1',requestId:requests[0].requestId,status:'saved'})});
 assert.deepEqual(await pending,{status:'saved'});
 assert.equal(callbacks.size,0);
 assert.match(client.message({status:'saved'},'sample.json'),/بازیابی آزمایشی/);
});

test('pilot without secure WebMessage feature fails closed instead of starting blob download',async()=>{
 let blobUsed=false;
 const win={navigator:{userAgent:'Mozilla/5.0 SahambanPilotWebView/1'},URL:{createObjectURL(){blobUsed=true;}}};
 const result=await client.save(win,'sahamban-portfolio-backup.json','{"format":"sahamban-portfolio"}');
 assert.equal(result.status,'unsupported');
 assert.equal(blobUsed,false);
 assert.match(client.message(result,'test.json'),/از داده واقعی استفاده نکنید/);
});

test('ordinary browser preserves blob download fallback without confirmed-save wording',async()=>{
 const calls=[];
 const anchor={click(){calls.push('click');},remove(){calls.push('remove');}};
 const win={navigator:{userAgent:'Chrome'},Blob:class{constructor(parts){assert.equal(parts[0],'{}');}},
  URL:{createObjectURL(){calls.push('create');return 'blob:fake';},revokeObjectURL(){calls.push('revoke');}},
  document:{createElement(name){assert.equal(name,'a');return anchor;},body:{appendChild(){calls.push('append');}}},
  setTimeout(callback,ms){assert.equal(ms,60000);callback();}
 };
 const result=await client.save(win,'sahamban-portfolio-backup.json','{}');
 assert.equal(result.status,'requested');
 assert.deepEqual(calls,['create','append','click','remove','revoke']);
 assert.match(client.message(result,'test.json'),/ذخیره‌شدن فایل تأیید نشده است/);
});

test('rejects non-allowlisted filenames and oversize payloads before any native call',async()=>{
 let nativeCalled=false;
 const win={SahambanBackupExport:{postMessage(){nativeCalled=true;}}};
 await assert.rejects(client.save(win,'../../secret.json','{}'),/نام یا محتوای/);
 await assert.rejects(client.save(win,'sahamban-local-backup-v1.json','x'.repeat(client.MAX_BYTES+1)),/حجم پشتیبان/);
 assert.equal(nativeCalled,false);
});

test('portfolio restore shares the export byte limit, including UTF-8 Persian content',()=>{
 const fs=require('node:fs');
 const app=fs.readFileSync('app.js','utf8');
 assert.match(app,/const maxBackupBytes=window\.SahambanBackupExportClient\?\.MAX_BYTES\?\?256\*1024/);
 assert.match(app,/if\(file\.size>maxBackupBytes\)/);
 assert.doesNotMatch(app,/file\.size>30000/);
 const json=JSON.stringify({
  format:'sahamban-portfolio',version:2,
  data:'ف'.repeat(15000),capital:'20000',riskCap:'5',
  stress:'10',concentration:'30'
 });
 const byteLength=Buffer.byteLength(json,'utf8');
 assert.ok(byteLength>30000,'regression fixture must exceed the old 30 KB cap');
 assert.ok(byteLength<=client.MAX_BYTES,'fixture must remain within the shared 256 KiB cap');
});

test('native save times out visibly and unregisters its listener when Android never replies',async()=>{
 const callbacks=new Set();let timeoutCallback=null,cleared=false;
 const bridge={
  addEventListener(type,fn){callbacks.add(fn);},
  removeEventListener(type,fn){callbacks.delete(fn);},
  postMessage(){}
 };
 const win={
  SahambanBackupExport:bridge,
  navigator:{userAgent:'SahambanPilotWebView/1'},
  setTimeout(fn,ms){assert.equal(ms,300000);timeoutCallback=fn;return 7;},
  clearTimeout(id){assert.equal(id,7);cleared=true;}
 };
 const pending=client.save(win,'sahamban-portfolio-backup.json','{}');
 assert.equal(callbacks.size,1);
 timeoutCallback();
 assert.deepEqual(await pending,{status:'timeout'});
 assert.equal(callbacks.size,0);
 assert.equal(cleared,true);
 assert.match(client.message({status:'timeout'},'sample.json'),/ذخیره‌شدن فایل تأیید نشده است/);
});

test('a partial native bridge without listener cleanup fails closed',async()=>{
 let called=false;
 const win={
  SahambanBackupExport:{postMessage(){called=true;},addEventListener(){}},
  navigator:{userAgent:'SahambanPilotWebView/1'}
 };
 const result=await client.save(win,'sahamban-portfolio-backup.json','{}');
 assert.equal(result.status,'unsupported');
 assert.equal(called,false);
});
