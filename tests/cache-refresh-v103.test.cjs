'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const sw=fs.readFileSync('sw.js','utf8');
test('v103 installs a new cache generation then retires older Sahamban caches',async()=>{
 const events={},stores=new Map(),deleted=[],prefetched=[];
 const caches={
  open:async name=>({
   addAll:async urls=>{prefetched.push(...urls);stores.set(name,urls.slice());},
   add:async()=>{},
   put:async()=>{}
  }),
  keys:async()=>['sahamban-static-v93-0','sahamban-static-v102-0','unrelated-app-cache','sahamban-static-v103-0'],
  delete:async name=>{deleted.push(name);return true;},
  match:async()=>undefined
 };
 let skipped=0,claimed=0;
 const self={location:{origin:'https://example.test'},addEventListener:(name,fn)=>{events[name]=fn},skipWaiting:async()=>{skipped++},clients:{claim:async()=>{claimed++}}};
 vm.runInNewContext(sw,{self,caches,URL,Promise,fetch:async()=>{throw Error('offline')}});
 const fire=async name=>{let pending;events[name]({waitUntil:promise=>{pending=promise}});assert.ok(pending);await pending;};
 await fire('install');
 assert.equal(skipped,1);
 assert.ok(stores.has('sahamban-static-v103-0'));
 assert.ok(prefetched.includes('./index.html'));
 assert.ok(prefetched.includes('./update-notice-v103.js?v=103.0'));
 assert.ok(prefetched.includes('./update-notice-v103.css?v=103.0'));
 await fire('activate');
 assert.equal(claimed,1);
 assert.deepEqual(deleted.sort(),['sahamban-static-v102-0','sahamban-static-v93-0']);
});
test('v103 navigation remains network first and falls back to offline index only for navigations',async()=>{
 const events={},root='https://example.test/sahamban/';
 const caches={
  match:async req=>{
   const key=new URL(typeof req==='string'?req:req.url,root).href;
   if(key===root+'index.html')return {from:'offline-index'};
   if(key===root+'update-notice-v103.js?v=103.0')return {from:'offline-update-script'};
  },
  open:async()=>({put:async()=>{}}),
  keys:async()=>[],delete:async()=>{}
 };
 const self={location:{origin:'https://example.test'},addEventListener:(name,fn)=>{events[name]=fn},clients:{claim:async()=>{}},skipWaiting:async()=>{}};
 vm.runInNewContext(sw,{self,caches,URL,Promise,fetch:async()=>{throw Error('offline')}});
 const request=async(path,mode)=>{let pending;events.fetch({request:{method:'GET',mode,url:root+path},respondWith:p=>pending=p});return pending};
 assert.equal((await request('index.html?version=103','navigate')).from,'offline-index');
 assert.equal((await request('update-notice-v103.js?v=103.0','no-cors')).from,'offline-update-script');
 assert.equal(await request('unavailable.js?v=103','no-cors'),undefined);
});
