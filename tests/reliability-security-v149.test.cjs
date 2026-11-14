'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('sw.js','utf8');
function harness({offline=false,networkBody='fresh',cachedBody='cached'}={}){
 const listeners={},entries=new Map(),puts=[];
 const caches={
  async open(){return {async put(req,res){entries.set(req.url,res);puts.push(req.url);}}},
  async match(req){return entries.get(typeof req==='string'?new URL(req,'https://app.test/sahamban/').href:req.url);},
  async keys(){return []},async delete(){return true;}
 };
 const self={location:{origin:'https://app.test'},addEventListener:(n,fn)=>listeners[n]=fn,clients:{claim:async()=>{}},skipWaiting:async()=>{}};
 const fetch=async req=>{if(offline)throw Error('network offline');return {ok:true,type:'basic',body:networkBody,clone(){return {...this,clone:this.clone}}};};
 vm.runInNewContext(source,{self,caches,fetch,URL,Promise});
 async function request(path,mode='no-cors',method='GET'){
  let pending,responded=false;
  listeners.fetch({request:{url:'https://app.test/sahamban/'+path,mode,method},respondWith(p){responded=true;pending=p;}});
  return {responded,response:responded?await pending:null};
 }
 return {request,entries,puts,listeners};
}
test('new service worker generation invalidates old cache namespace',()=>{
 assert.match(source,/const CACHE='sahamban-static-v150-\d+'/);
 assert.match(source,/k\.startsWith\('sahamban-static-'\)&&k!==CACHE/);
});
test('same-origin static assets use network-first and refresh cache',async()=>{
 const h=harness(),result=await h.request('technical-analysis-v50.js?v=50.20');
 assert.equal(result.response.body,'fresh');
 assert.equal(h.puts.length,1);
 assert.ok(h.puts[0].includes('technical-analysis-v50.js'));
});
test('offline static assets fall back to cached response without HTML substitution',async()=>{
 const h=harness({offline:true});
 const key='https://app.test/sahamban/app.js?v=127.0';
 h.entries.set(key,{ok:true,body:'cached-app'});
 const result=await h.request('app.js?v=127.0');
 assert.equal(result.response.body,'cached-app');
 await assert.rejects(h.request('missing.js'),/network offline/);
});
test('offline navigation falls back to cached app shell',async()=>{
 const h=harness({offline:true}),shell={ok:true,body:'offline-shell'};
 h.entries.set('https://app.test/sahamban/index.html',shell);
 const result=await h.request('', 'navigate');
 assert.equal(result.response.body,'offline-shell');
});
test('cross-origin, non-GET and POST requests are not intercepted or cached',async()=>{
 const h=harness();
 let intercepted=false;
 h.listeners.fetch({request:{url:'https://cdn.tsetmc.com/api/quote',mode:'cors',method:'GET'},respondWith(){intercepted=true;}});
 h.listeners.fetch({request:{url:'https://app.test/sahamban/submit',mode:'cors',method:'POST'},respondWith(){intercepted=true;}});
 assert.equal(intercepted,false);
 assert.equal(h.puts.length,0);
});
test('financial parser rejects values outside safe integer precision',()=>{
 const app=fs.readFileSync('app.js','utf8');
 const extract=name=>{const i=app.indexOf('function '+name+'(');assert.ok(i>=0);const tail=app.slice(i);const j=tail.indexOf('\n}\n');assert.ok(j>0);return tail.slice(0,j+3);};
 const context=vm.createContext({fmt:String,Intl,Date,Number,String,Math,Array,Set,Error});
 vm.runInContext(extract('portfolioNumber')+'\n'+extract('parsePortfolio'),context);
 assert.throws(()=>context.parsePortfolio('فولاد,9007199254740991,100,110,90,130'),/دقت امن/);
 assert.throws(()=>context.parsePortfolio('فولاد,1,9007199254740992,9007199254740992,1,9007199254740993'),/دقت امن/);
 assert.equal(context.parsePortfolio('فولاد,10,100.5,110.5,90.5,130.5')[0].value,1105);
});
test('security boundaries: no eval or document.write; untrusted labels use text nodes',()=>{
 const app=fs.readFileSync('app.js','utf8'),broker=fs.readFileSync('broker-import.js','utf8'),backup=fs.readFileSync('local-backup-v148.js','utf8');
 for(const src of [app,broker,backup]){
  assert.doesNotMatch(src,/\beval\s*\(|\bnew\s+Function\s*\(|\bdocument\.write\s*\(/);
 }
 assert.match(app,/const p=document\.createElement\('div'\);p\.className=.*?p\.textContent=message/);
 assert.match(app,/td\.textContent=t/);
 assert.match(broker,/document\.createElement\('td'\)/);
 assert.match(backup,/const KEYS=\[/);
 assert.doesNotMatch(backup,/fetch\s*\(|XMLHttpRequest|sendBeacon/);
});
