'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const api=require('../local-backup-v148.js');
const broker={version:2,created:'2026-11-04',holdings:[{symbol:'فولاد',quantity:10,buy:1200.5,current:1350.5}]};
const risk={version:2,data:'فولاد,10,1200,1350,1100,1550',capital:'20000',riskCap:'5',stress:'10',concentration:'30'};
const watch=[{name:'فولاد',code:'12345678',stop:1100,target:1500}];
const alert={symbol:'فولاد',aStop:'1100',aTarget:'1550'};
function storage(pairs={}){
 const m=new Map(Object.entries(pairs));let failAt=0,attempts=0;
 return {getItem:k=>m.has(k)?m.get(k):null,
  setItem(k,v){attempts++;if(failAt&&attempts===failAt)throw Error('mock quota error');m.set(k,String(v));},
  removeItem:k=>m.delete(k),failOnNthWrite(n){failAt=n;attempts=0;},dump(){return Object.fromEntries(m);}};
}
test('exports exact allowlisted local holdings/risk/watch/alerts and leaves unknown keys untouched',()=>{
 const original=storage({
 'sahamban-broker-holdings-v1':JSON.stringify(broker),
 'sahamban-portfolio-local-v1':JSON.stringify(risk),
 'sahamban-watchlist-v6':JSON.stringify(watch),
 'sahamban-v1':JSON.stringify(alert),
 'some-third-party-token':'PRIVATE_NEVER_EXPORTED'
 });
 const snap=api.createSnapshot(original);
 assert.equal(snap.schema,1);assert.equal(snap.format,api.FORMAT);
 assert.deepEqual(Object.keys(snap.items),api.KEYS.filter(k=>original.getItem(k)!==null));
 assert.equal(JSON.stringify(snap).includes('PRIVATE_NEVER_EXPORTED'),false);
 assert.equal(snap.items['sahamban-broker-holdings-v1'],JSON.stringify(broker));
 assert.equal(snap.items['sahamban-portfolio-local-v1'],JSON.stringify(risk));
 const destination=storage({'unrelated':'keep','sahamban-broker-holdings-v1':JSON.stringify({...broker,created:'old'})});
 assert.equal(api.restoreSnapshot(destination,snap),4);
 for(const [k,v] of Object.entries(snap.items))assert.equal(destination.getItem(k),v);
 assert.equal(destination.getItem('unrelated'),'keep');
});
test('refuses tampered backup schema, unexpected keys and invalid financial values before writing',()=>{
 const original=storage({'sahamban-v1':JSON.stringify(alert)}),base=api.createSnapshot(original);
 for(const corrupt of [
  {...base,schema:99},{...base,format:'not-sahamban'},
  {...base,items:{...base.items,password:'secret'}},
  {...base,items:{'sahamban-broker-holdings-v1':JSON.stringify({...broker,holdings:[{symbol:'فولاد',quantity:0,buy:12,current:20}]})}},
  {...base,items:{'sahamban-portfolio-local-v1':JSON.stringify({...risk,data:'فولاد,0,1200,1350,1100,1550'})}},
  {...base,items:{'sahamban-watchlist-v6':JSON.stringify([...watch,...watch])}}
 ]){
  const dest=storage({'existing':'untouched'});
  assert.throws(()=>api.restoreSnapshot(dest,corrupt));
  assert.deepEqual(dest.dump(),{'existing':'untouched'});
 }
});
test('rollback restores all previous values on storage quota failure without partial data',()=>{
 const original=storage({'sahamban-v1':JSON.stringify(alert),'sahamban-watchlist-v6':JSON.stringify(watch)});
 const snap=api.createSnapshot(original);
 const dest=storage({'sahamban-v1':'OLD','sahamban-watchlist-v6':'OLD_WATCH','third-party':'untouched'});
 const before=dest.dump();
 dest.failOnNthWrite(2);
 assert.throws(()=>api.restoreSnapshot(dest,snap),/بازیابی انجام نشد/);
 assert.deepEqual(dest.dump(),before);
});
test('legacy broker and portfolio data are accepted without silent schema migration or mutation',()=>{
 const legacyBroker={version:1,holdings:[{symbol:'فولاد',quantity:3,buy:100,current:110}]};
 const legacyRisk={...risk,version:1,data:'فولاد,10,120,135,110,155'};
 const store=storage({'sahamban-broker-holdings-v1':JSON.stringify(legacyBroker),
  'sahamban-portfolio-local-v1':JSON.stringify(legacyRisk)});
 const snapshot=api.createSnapshot(store);
 assert.equal(api.restoreSnapshot(storage(),snapshot),2);
 assert.equal(snapshot.items['sahamban-broker-holdings-v1'],JSON.stringify(legacyBroker));
 assert.equal(snapshot.items['sahamban-portfolio-local-v1'],JSON.stringify(legacyRisk));
});
test('rejects unsupported overlong or corrupt local settings rather than generating misleading backups',()=>{
 for(const [key,raw] of [
  ['sahamban-broker-holdings-v1','{"version":3,"holdings":[]}'],
  ['sahamban-v1','"wrong schema"'],
  ['sahamban-watchlist-v6','[{"name":"bad","code":"x","stop":1,"target":2}]'],
  ['sahamban-portfolio-local-v1',JSON.stringify({...risk,riskCap:'500'})]
 ])assert.throws(()=>api.createSnapshot(storage({[key]:raw})));
});

test('accepts valid Persian-number portfolio snapshots without editing source bytes',()=>{
 const risk={version:2,data:'فولاد,۱۰,۱۲۰۰,۱۳۵۰,۱۱۰۰,۱۵۵۰',
  capital:'۲۰۰۰۰',riskCap:'۵',stress:'۱۰',concentration:'۳۰'};
 const raw=JSON.stringify(risk),snap=api.createSnapshot(storage({'sahamban-portfolio-local-v1':raw}));
 assert.equal(snap.items['sahamban-portfolio-local-v1'],raw);
 const target=storage();api.restoreSnapshot(target,snap);
 assert.equal(target.getItem('sahamban-portfolio-local-v1'),raw);
});
test('rejects risk totals that would exceed safe monetary arithmetic bounds',()=>{
 const oversized={version:2,data:'فولاد,9007199254740991,100,110,90,130',
  capital:'',riskCap:'5',stress:'10',concentration:'30'};
 assert.throws(()=>api.createSnapshot(storage({'sahamban-portfolio-local-v1':JSON.stringify(oversized)})));
});
test('web HTML and service worker use the same locally cached backup module',()=>{
 const fs=require('node:fs');
 const html=fs.readFileSync('index.html','utf8');
 const sw=fs.readFileSync('sw.js','utf8');
 assert.match(html,/id="sb148LocalBackup"/);
 for(const id of ['sb148Export','sb148File','sb148Restore','sb148Status'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/local-backup-v148\.js\?v=148\.2/);
 assert.match(sw,/local-backup-v148\.js\?v=148\.2/);
 assert.match(html,/رمزگذاری نشده/);
 assert.match(html,/native-backup-export-v1\.js\?v=1\.0/);
});

function uiHarness(initial={}){
 const state=storage(initial),nodes=new Map(),confirms=[];
 const element=id=>{if(!nodes.has(id))nodes.set(id,{id,textContent:'',disabled:id==='sb148Restore',files:[],
  actions:{},addEventListener(name,cb){this.actions[name]=cb;}});return nodes.get(id);};
 const fakeWin={
  document:{getElementById:element},
  localStorage:state,
  confirm(message){confirms.push(message);return true;}
 };
 api.mount(fakeWin);
 return {state,element,confirms,fakeWin,fire:(id,kind='click')=>element(id).actions[kind]()};
}
test('UI requires validated preview and explicit user consent before local restore',async()=>{
 const live=JSON.stringify(alert),newAlert=JSON.stringify({...alert,symbol:'مخابرات'});
 const h=uiHarness({'sahamban-v1':live});
 const snap={format:api.FORMAT,schema:api.SCHEMA,items:{'sahamban-v1':newAlert}};
 assert.equal(h.element('sb148Restore').disabled,true);
 h.element('sb148File').files=[{size:100,text:async()=>JSON.stringify(snap)}];
 await h.fire('sb148File','change');
 assert.equal(h.state.getItem('sahamban-v1'),live);
 assert.equal(h.element('sb148Restore').disabled,false);
 assert.match(h.element('sb148Status').textContent,/هنوز جایگزین نشده/);
 h.fakeWin.confirm=()=>false;
 h.fire('sb148Restore');
 assert.equal(h.state.getItem('sahamban-v1'),live);
 assert.match(h.element('sb148Status').textContent,/لغو شد/);
 h.element('sb148File').files=[{size:100,text:async()=>JSON.stringify(snap)}];
 await h.fire('sb148File','change');
 h.fakeWin.confirm=()=>true;
 h.fire('sb148Restore');
 assert.equal(h.state.getItem('sahamban-v1'),newAlert);
 assert.match(h.element('sb148Status').textContent,/بازیابی شد/);
});
test('UI ignores stale backup file and rejects malformed backup before enabling restore',async()=>{
 const h=uiHarness(),old={};old.promise=new Promise(resolve=>{old.resolve=resolve;});
 h.element('sb148File').files=[{size:100,text:()=>old.promise}];
 const first=h.fire('sb148File','change');
 h.element('sb148File').files=[{size:100,text:async()=>JSON.stringify({format:api.FORMAT,schema:99,items:{}})}];
 await h.fire('sb148File','change');
 assert.equal(h.element('sb148Restore').disabled,true);
 old.resolve(JSON.stringify({format:api.FORMAT,schema:api.SCHEMA,items:{'sahamban-v1':JSON.stringify(alert)}}));
 await first;
 assert.equal(h.element('sb148Restore').disabled,true);
 assert.match(h.element('sb148Status').textContent,/پذیرفته نشد/);
});

test('rolls back failing key when storage writes new bytes and then throws',()=>{
 const original=storage({'sahamban-v1':JSON.stringify(alert),'sahamban-watchlist-v6':JSON.stringify(watch)});
 const snapshot=api.createSnapshot(original);
 const destination=storage({'sahamban-v1':'ORIGINAL_ALERT','sahamban-watchlist-v6':'ORIGINAL_WATCH','unrelated':'preserve'});
 const prior=destination.dump();
 const normalSet=destination.setItem.bind(destination);
 let calls=0;
 destination.setItem=(key,value)=>{
  normalSet(key,value);
  if(++calls===2)throw Error('write completed but wrapper threw');
 };
 assert.throws(()=>api.restoreSnapshot(destination,snapshot),/بازیابی انجام نشد/);
 assert.deepEqual(destination.dump(),prior);
});
test('detects and reports rollback failure instead of claiming atomic success',()=>{
 const snapshot=api.createSnapshot(storage({'sahamban-v1':JSON.stringify(alert)}));
 const destination=storage({'sahamban-v1':'BEFORE'});
 destination.setItem=()=>{throw Error('write denied');};
 assert.throws(()=>api.restoreSnapshot(destination,snapshot),/بازگردانی خودکار موفق نشد/);
 assert.equal(destination.getItem('sahamban-v1'),'BEFORE');
});
test('rejects oversized direct backup objects before mutating storage',()=>{
 const snapshot={format:api.FORMAT,schema:api.SCHEMA,items:{'sahamban-v1':JSON.stringify(alert)},
  extra:'X'.repeat(270000)};
 const destination=storage({'sahamban-v1':'UNCHANGED'});
 assert.throws(()=>api.restoreSnapshot(destination,snapshot),/از حد مجاز بزرگ‌تر است/);
 assert.equal(destination.getItem('sahamban-v1'),'UNCHANGED');
});

test('backup exports delegate to an explicit native-or-browser helper without claiming disk writes',()=>{
 const fs=require('node:fs');
 const helper=fs.readFileSync('native-backup-export-v1.js','utf8');
 assert.match(helper,/ذخیره‌شدن فایل تأیید نشده است/);
 assert.match(helper,/بازیابی آزمایشی انجام دهید/);
 for(const source of ['local-backup-v148.js','app.js']){
  const src=fs.readFileSync(source,'utf8');
  assert.match(src,/client\.save\(/);
  assert.match(src,/client\.message\(/);
  assert.doesNotMatch(src,/پشتیبان محلی آماده دانلود شد|فایل پشتیبان از سبد فعلی آماده دانلود شد/);
 }
});


test('real local PWA UI uses native WebMessage export and restores synthetic JSON only with consent',async()=>{
 const client=require('../native-backup-export-v1.js');
 const alertRaw=JSON.stringify(alert),watchRaw=JSON.stringify(watch);
 const ui=uiHarness({
  'sahamban-v1':alertRaw,'sahamban-watchlist-v6':watchRaw,
  'unrelated-private':'NOT_FOR_EXPORT'
 });
 const before=ui.state.dump(),listeners=new Set(),requests=[];
 ui.fakeWin.SahambanBackupExportClient=client;
 ui.fakeWin.navigator={userAgent:'SahambanPilotWebView/1'};
 ui.fakeWin.setTimeout=(callback,ms)=>{assert.equal(ms,300000);return 42;};
 ui.fakeWin.clearTimeout=(id)=>assert.equal(id,42);
 ui.fakeWin.SahambanBackupExport={
  addEventListener(type,fn){assert.equal(type,'message');listeners.add(fn);},
  removeEventListener(type,fn){assert.equal(type,'message');listeners.delete(fn);},
  postMessage(raw){requests.push(JSON.parse(raw));}
 };
 const send=(request,status,id=request.requestId)=>{
  for(const fn of [...listeners])fn({data:JSON.stringify({
   protocol:'sahamban-backup-result-v1',requestId:id,status
  })});
 };
 const pending=ui.fire('sb148Export');
 assert.equal(requests.length,1,'UI must call the real native-export helper once');
 const request=requests[0],snapshot=JSON.parse(request.content);
 assert.equal(request.protocol,'sahamban-backup-export-v1');
 assert.match(request.requestId,/^[A-Za-z0-9_-]{1,80}$/);
 assert.equal(request.name,'sahamban-local-backup-v1.json');
 assert.equal(snapshot.format,api.FORMAT);
 assert.equal(snapshot.schema,api.SCHEMA);
 assert.deepEqual(Object.keys(snapshot.items),['sahamban-v1','sahamban-watchlist-v6']);
 assert.equal(snapshot.items['sahamban-v1'],alertRaw);
 assert.equal(snapshot.items['sahamban-watchlist-v6'],watchRaw);
 assert.equal(request.content.includes('NOT_FOR_EXPORT'),false);
 assert.ok(Buffer.byteLength(request.content,'utf8')<=client.MAX_BYTES);
 assert.equal(listeners.size,1);
 assert.deepEqual(ui.state.dump(),before,'export must not mutate the local PWA store');
 assert.doesNotMatch(ui.element('sb148Status').textContent,/اندروید پایان نوشتن/);
 send(request,'saved','unrelated-request');
 assert.equal(listeners.size,1,'forged correlation must not settle native save');
 send(request,'saved');
 await pending;
 assert.equal(listeners.size,0,'native listener must be removed after reply');
 assert.match(ui.element('sb148Status').textContent,/اندروید پایان نوشتن/);
 assert.match(ui.element('sb148Status').textContent,/رمزگذاری نشده/);
 assert.deepEqual(ui.state.dump(),before);

 const oldAlert=JSON.stringify({...alert,symbol:'نماد قدیمی'});
 const imported=uiHarness({'sahamban-v1':oldAlert,'external-state':'preserve'});
 const selectedFile={size:Buffer.byteLength(request.content,'utf8'),
  text:async()=>request.content};
 imported.element('sb148File').files=[selectedFile];
 await imported.fire('sb148File','change');
 assert.equal(imported.element('sb148Restore').disabled,false);
 assert.equal(imported.state.getItem('sahamban-v1'),oldAlert,
  'valid preview alone must never replace local data');
 imported.fakeWin.confirm=()=>false;
 imported.fire('sb148Restore');
 assert.equal(imported.state.getItem('sahamban-v1'),oldAlert,
  'declined consent must preserve current data');
 imported.element('sb148File').files=[selectedFile];
 await imported.fire('sb148File','change');
 imported.fakeWin.confirm=()=>true;
 imported.fire('sb148Restore');
 assert.equal(imported.state.getItem('sahamban-v1'),alertRaw);
 assert.equal(imported.state.getItem('sahamban-watchlist-v6'),watchRaw);
 assert.equal(imported.state.getItem('external-state'),'preserve');
 assert.match(imported.element('sb148Status').textContent,/بازیابی شد/);

 const cancelled=ui.fire('sb148Export');
 assert.equal(requests.length,2);
 send(requests[1],'cancelled');
 await cancelled;
 assert.match(ui.element('sb148Status').textContent,/لغو شد/);
 assert.doesNotMatch(ui.element('sb148Status').textContent,/اندروید پایان نوشتن/);
 assert.equal(listeners.size,0);
 assert.deepEqual(ui.state.dump(),before,'native cancellation must not alter PWA data');
});


test('native saved status is replaced by later import preview in the same UI status field',async()=>{
 const client=require('../native-backup-export-v1.js');
 const synthetic=JSON.stringify({symbol:'نماد-ساختگی-آزمایش',aStop:'100',aTarget:'200'});
 const h=uiHarness({'sahamban-v1':synthetic});
 const replies=new Set(),requests=[];
 h.fakeWin.SahambanBackupExportClient=client;
 h.fakeWin.navigator={userAgent:'SahambanPilotWebView/1'};
 h.fakeWin.setTimeout=()=>17;
 h.fakeWin.clearTimeout=()=>{};
 h.fakeWin.SahambanBackupExport={
  addEventListener(kind,fn){assert.equal(kind,'message');replies.add(fn);},
  removeEventListener(kind,fn){assert.equal(kind,'message');replies.delete(fn);},
  postMessage(raw){requests.push(JSON.parse(raw));}
 };
 const before=h.state.dump();
 const pending=h.fire('sb148Export');
 assert.equal(requests.length,1);
 for(const fn of [...replies])fn({data:JSON.stringify({
  protocol:'sahamban-backup-result-v1',requestId:requests[0].requestId,status:'saved'
 })});
 await pending;
 assert.match(h.element('sb148Status').textContent,/اندروید پایان نوشتن فایل/);
 assert.deepEqual(h.state.dump(),before);
 h.element('sb148File').files=[{
  size:Buffer.byteLength(requests[0].content,'utf8'),
  text:async()=>requests[0].content
 }];
 await h.fire('sb148File','change');
 assert.match(h.element('sb148Status').textContent,/فایل معتبر است: 1 بخش/);
 assert.match(h.element('sb148Status').textContent,/هنوز جایگزین نشده/);
 assert.doesNotMatch(h.element('sb148Status').textContent,/اندروید پایان نوشتن فایل/);
 assert.deepEqual(h.state.dump(),before,'preview must not write any local data');
 assert.equal(replies.size,0,'native message listener must be cleaned up');
});
