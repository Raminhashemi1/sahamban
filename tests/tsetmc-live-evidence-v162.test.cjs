'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {captureTsetmcEvidence:collect,HOST}=require('../tsetmc-live-evidence-v162.cjs');
const code='123456789012345';
const base={closingPriceDaily:[{dEven:20260321,pClosing:1200}]};
const adjustment={priceAdjust:[{dEven:20260321,pClosing:800,pClosingNotAdjusted:1200}]};
function fake(fetchCalls,custom={}){
 return async(url,opts)=>{
  fetchCalls.push({url,opts});
  const isDaily=url.includes('GetClosingPriceDailyList');
  const body=JSON.stringify(isDaily?base:adjustment);
  return new Response(body,{status:200,headers:{'content-type':'application/json'}});
 };
}
function withUrl(fetcher){
 return async(url,opts)=>{
  const res=await fetcher(url,opts);
  Object.defineProperty(res,'url',{value:url});
  return res;
 };
}
test('captures exact raw response bytes, hashes and source URLs without authorizing trades',async()=>{
 const calls=[],capture=await collect(code,{fetcher:withUrl(fake(calls)),
  now:()=>new Date('2026-11-09T12:00:00Z')});
 assert.equal(capture.status,'CAPTURED_FOR_MANUAL_REVIEW');
 assert.equal(capture.collectedAt,'2026-11-09T12:00:00.000Z');
 assert.equal(capture.responses.daily.rowCount,1);
 assert.equal(capture.responses.adjustments.rowCount,1);
 assert.equal(capture.responses.daily.url,HOST+'/api/ClosingPrice/GetClosingPriceDailyList/'+code+'/0');
 assert.equal(capture.responses.adjustments.url,HOST+'/api/ClosingPrice/GetPriceAdjustList/'+code);
 for(const kind of ['daily','adjustments']){
  const item=capture.responses[kind];
  assert.equal(item.sha256,createHash('sha256').update(item.rawBodyUtf8).digest('hex'));
  assert.equal(item.sizeBytes,Buffer.byteLength(item.rawBodyUtf8));
 }
 assert.equal(calls.length,2);
 for(const call of calls){
  assert.equal(call.opts.method,'GET');
  assert.equal(call.opts.redirect,'manual');
  assert.equal(call.opts.credentials,'omit');
  assert.equal(call.opts.cache,'no-store');
 }
 for(const flag of ['sourceAuthenticated','priceBasisVerified','capitalActionsVerified','entryEligible','tradingSignalsEnabled'])
  assert.equal(capture[flag],false);
});
test('invalid codes fail before a network call',async()=>{
 let called=0;
 for(const code of ['../other','123','00000000','12345678?x=1','۱۲۳۴۵۶۷۸']){
  const r=await collect(code,{fetcher:async()=>{called++;}});
  assert.equal(r.reason,'INVALID_INSTRUMENT_CODE');
 }
 assert.equal(called,0);
});
test('rejects response URL mismatch, redirects, content type and non-JSON responses',async()=>{
 const cases=[
  [async()=>new Response('{}',{status:302,headers:{location:'https://evil.test'}}),'DAILY_HTTP_NOT_OK'],
  [async()=>new Response('{}',{status:200,headers:{'content-type':'text/html'}}),'DAILY_RESPONSE_URL_MISMATCH'],
  [async(url)=>Object.defineProperty(new Response('{"closingPriceDaily":[]}',{headers:{'content-type':'application/json'}}),'url',{value:'https://evil.test'}),'DAILY_RESPONSE_URL_MISMATCH'],
  [async(url)=>Object.defineProperty(new Response('not-json',{headers:{'content-type':'application/json'}}),'url',{value:url}),'DAILY_MALFORMED_JSON']
 ];
 for(const [fetcher,reason] of cases){
  const r=await collect(code,{fetcher});
  assert.equal(r.status,'COLLECTION_INSUFFICIENT');
  assert.equal(r.reason,reason);
 }
 const nonJson=await collect(code,{fetcher:withUrl(async()=>new Response('<html/>',{headers:{'content-type':'text/html'}}))});
 assert.equal(nonJson.reason,'DAILY_NOT_JSON');
});
test('rejects malformed daily rows and duplicate dates',async()=>{
 const responses=[
  {closingPriceDaily:[{dEven:20260230,pClosing:1200}]},
  {closingPriceDaily:[{dEven:20260321,pClosing:1200},{dEven:20260321,pClosing:1000}]},
  {closingPriceDaily:[{dEven:20260321,pClosing:-1}]}
 ];
 const errors=['INVALID_DAILY_DATE','DUPLICATE_DAILY_DATE','INVALID_DAILY_CLOSE'];
 for(let i=0;i<responses.length;i++){
  const fetcher=withUrl(async()=>new Response(JSON.stringify(responses[i]),{headers:{'content-type':'application/json'}}));
  const r=await collect(code,{fetcher});
  assert.equal(r.reason,errors[i]);
 }
});
test('a hanging custom transport is bounded by one deadline',async()=>{
 const keep=setTimeout(()=>{},200);
 try{
  const start=Date.now();
  const r=await collect(code,{fetcher:()=>new Promise(()=>{}),timeoutMs:30});
  assert.equal(r.reason,'COLLECTION_DEADLINE_EXCEEDED');
  assert.ok(Date.now()-start<170);
 }finally{clearTimeout(keep);}
});
test('rejects a streamed body exceeding the size cap',async()=>{
 const huge=new ReadableStream({start(c){c.enqueue(new Uint8Array(1024*1024+1));c.close();}});
 const fetcher=async url=>Object.defineProperty(new Response(huge,{headers:{'content-type':'application/json'}}),'url',{value:url});
 const r=await collect(code,{fetcher});
 assert.equal(r.reason,'DAILY_TOO_LARGE');
});
