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

test('PWA wires native helper before the visible local-backup action and keeps the legacy synthetic button hidden',()=>{
 const fs=require('node:fs'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
 assert.ok(html.indexOf('native-backup-export-v1.js')<html.indexOf('local-backup-v148.js'));
 assert.match(html,/id="sb148Export" type="button" class="secondary" style="width:100%;min-height:56px;white-space:normal"/);
 assert.match(html,/id="sb148SyntheticExport" type="button" class="secondary" hidden style="display:none"/);
 assert.match(html,/پل بومی هر محتوای غیرساختگی یا هر کلید اضافه را رد می‌کند/);
 assert.match(sw,/sahamban-static-v150-15/);
 assert.match(sw,/native-backup-export-v1\.js\?v=1\.0/);
});

test('risk portfolio PWA backup uses the shared native JSON helper and 256 KiB restore cap',()=>{
 const fs=require('node:fs'),app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
 const start=app.indexOf("$('portfolioBackup').addEventListener");
 const end=app.indexOf("$('portfolioBackupFile').addEventListener",start);
 const handler=app.slice(start,end);
 assert.match(handler,/client\.save\(window,filename,content\)/);
 assert.match(handler,/client\.message\(result,filename\)/);
 assert.doesNotMatch(handler,/createObjectURL|\.download=/);
 assert.match(app,/file\.size>maxBackupBytes/);
 assert.match(html,/app\.js\?v=127\.1/);
 assert.match(sw,/app\.js\?v=127\.1/);
});

test('isolated acceptance exercises the real PWA local-backup button with only its seeded synthetic record',async()=>{
 const nodes=new Map(),reads=[],calls=[];
 const element=id=>{if(!nodes.has(id))nodes.set(id,{id,textContent:'',disabled:id==='sb148Restore',files:[],actions:{},addEventListener(name,fn){this.actions[name]=fn;}});return nodes.get(id);};
 const fixture={symbol:'نماد-ساختگی-آزمایش',aStop:'100',aTarget:'200'};
 const win={
  document:{getElementById:element},
  navigator:{userAgent:'SahambanPilotWebView/1'},
  localStorage:{getItem(key){reads.push(key);return key==='sahamban-v1'?JSON.stringify(fixture):null;}},
  SahambanBackupExportClient:{
   async save(_win,name,json){calls.push({name,json});return {status:'saved'};},
   message(){return 'saved';}
  }
 };
 backup.mount(win);
 await nodes.get('sb148Export').actions.click();
 assert.deepEqual(reads,backup.KEYS,'the PWA snapshot builder reads only its allowlisted keys');
 assert.equal(calls.length,1,'the real PWA export button must call the native helper');
 assert.equal(calls[0].name,'sahamban-local-backup-v1.json');
 const snapshot=JSON.parse(calls[0].json);
 assert.deepEqual(Object.keys(snapshot.items),['sahamban-v1']);
 assert.deepEqual(JSON.parse(snapshot.items['sahamban-v1']),fixture);
 assert.doesNotMatch(calls[0].json,/REAL_USER_DATA|PRIVATE|password/i);
 assert.match(nodes.get('sb148Status').textContent,/saved/);
});
