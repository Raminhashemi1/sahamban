'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const client=require('../native-backup-export-v1.js');
const backup=require('../local-backup-v148.js');

function nativeHarness(){
 const listeners=new Set(),sent=[];
 const native={
  postMessage(raw){sent.push(JSON.parse(raw));},
  addEventListener(type,fn){if(type==='message')listeners.add(fn);},
  removeEventListener(type,fn){if(type==='message')listeners.delete(fn);},
  reply(status){const req=sent.at(-1);for(const fn of [...listeners])fn({data:JSON.stringify({protocol:'sahamban-backup-result-v1',requestId:req.requestId,status})});}
 };
 const win={SahambanBackupExport:native,setTimeout(fn){return 1;},clearTimeout(){},navigator:{userAgent:'SahambanPilotWebView/1'}};
 return {win,native,sent};
}

test('native save sends only an allowlisted JSON document over the named WebMessage protocol',async()=>{
 const h=nativeHarness(),doc=backup.createSyntheticSnapshot(),json=JSON.stringify(doc);
 const pending=client.save(h.win,'sahamban-local-backup-v1.json',json);
 assert.equal(h.sent.length,1);
 assert.equal(h.sent[0].protocol,'sahamban-backup-export-v1');
 assert.equal(h.sent[0].name,'sahamban-local-backup-v1.json');
 assert.equal(h.sent[0].content,json);
 h.native.reply('saved');
 assert.deepEqual(await pending,{status:'saved'});
 assert.equal(client.message({status:'saved'},'fixture.json').includes('بازیابی آزمایشی'),true);
});

test('native client rejects unknown filenames and oversized payloads before bridge use',async()=>{
 const h=nativeHarness();
 await assert.rejects(client.save(h.win,'arbitrary.txt','{}'));
 await assert.rejects(client.save(h.win,'sahamban-local-backup-v1.json','x'.repeat(client.MAX_BYTES+1)));
 assert.equal(h.sent.length,0);
});

test('Android pilot marker fails closed when native WebMessage listener is unavailable',async()=>{
 const win={navigator:{userAgent:'Example SahambanPilotWebView/1'},setTimeout(){throw Error('must not schedule');}};
 assert.deepEqual(await client.save(win,'sahamban-local-backup-v1.json','{}'),{status:'unsupported'});
});

test('synthetic fixture is exactly the shape accepted by Android acceptance guard',()=>{
 const snapshot=backup.createSyntheticSnapshot();
 assert.equal(snapshot.format,'sahamban-local-backup');
 assert.equal(snapshot.schema,1);
 assert.deepEqual(Object.keys(snapshot.items),['sahamban-v1']);
 assert.deepEqual(JSON.parse(snapshot.items['sahamban-v1']),{
  symbol:'نماد-ساختگی-آزمایش',aStop:'100',aTarget:'200'
 });
 assert.equal(JSON.stringify(snapshot).includes('PRIVATE'),false);
});

test('PWA wires the native client before local backup and offers an explicit synthetic-only action',()=>{
 const fs=require('node:fs'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
 assert.ok(html.indexOf('native-backup-export-v1.js')<html.indexOf('local-backup-v148.js'));
 assert.match(html,/id="sb148SyntheticExport"/);
 assert.match(html,/خروجی حاوی اطلاعات واقعی عمداً رد می‌شود/);
 assert.match(sw,/sahamban-static-v150-14/);
 assert.match(sw,/native-backup-export-v1\.js\?v=1\.0/);
});
