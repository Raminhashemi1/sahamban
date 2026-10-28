'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const sw=fs.readFileSync('sw.js','utf8');
async function main(){
 const callbacks={};
 const root='https://example.test/sahamban/';
 const responses=new Map([
  [root+'index.html',{ok:true,from:'offline-index'}],
  [root+'app.js?v=41',{ok:true,from:'offline-js'}]
 ]);
 const caches={
  match:async input=>responses.get(new URL(typeof input==='string'?input:input.url,root).href),
  open:async()=>({put:async()=>{}}),
  keys:async()=>[],
  delete:async()=>true
 };
 const self={
  location:{origin:'https://example.test'},
  addEventListener:(name,callback)=>{callbacks[name]=callback;},
  clients:{claim:async()=>{}},
  skipWaiting:async()=>{}
 };
 const context={self,caches,URL,Promise,fetch:async()=>{throw Error('offline')}};
 vm.runInNewContext(sw,context);
 async function request(path,mode){
  let pending;
  callbacks.fetch({request:{method:'GET',mode,url:root+path},respondWith:p=>{pending=p}});
  assert.ok(pending,'fetch handler did not respond');
  return await pending;
 }
 assert.equal((await request('index.html?v=41','navigate')).from,'offline-index');
 console.log('PASS: versioned index.html navigation loads cached offline index');
 assert.equal((await request('?v=41','navigate')).from,'offline-index');
 console.log('PASS: versioned root navigation loads cached offline index');
 assert.equal((await request('app.js?v=41','no-cors')).from,'offline-js');
 console.log('PASS: offline JS cached version resolves');
 assert.equal(await request('app.js?v=999','no-cors'),undefined);
 console.log('PASS: missing JS does not silently return HTML fallback');
 console.log('SUCCESS: service worker offline tests');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
