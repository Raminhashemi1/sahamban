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
 assert.match(html,/local-backup-v148\.js\?v=148\.0/);
 assert.match(sw,/local-backup-v148\.js\?v=148\.0/);
 assert.match(html,/رمزگذاری نشده/);
});
