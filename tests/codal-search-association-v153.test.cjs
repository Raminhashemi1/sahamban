'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {checkCodalSearchAssociation}=require('../codal-search-association-v153.cjs');
const serial='qr1ypqX8jr8rIaRvVJxoNA==';
const report='https://www.codal.ir/Reports/Decision.aspx?LetterSerial=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&rt=3&let=6&ct=0&ft=-1';
const filing=()=>({symbol:'وبملت',tracingNo:'1278431',letterSerial:serial,published:'۱۴۰۳/۰۹/۱۴',reportUrl:report});
const letter=()=>({TracingNo:1278431,Symbol:'وبملت',PublishDateTime:'۱۴۰۳/۰۹/۱۴ ۲۳:۲۳:۳۵',
 Url:'/Reports/Decision.aspx?LetterSerial=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&rt=3&let=6&ct=0&ft=-1',
 PdfUrl:'DownloadFile.aspx?hs=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&ft=1005&let=6'});
const endpoint='https://search.codal.ir/api/search/v2/q?TracingNo=1278431';
function response(payload,{status=200,url=endpoint,contentType='application/json',headers={}}={}){
 const body=typeof payload==='string'?payload:JSON.stringify(payload);
 const r=new Response(body,{status,headers:{'content-type':contentType,...headers}});
 Object.defineProperty(r,'url',{value:url});
 return r;
}
function fetcherFor(payload,opts){return async (url,init)=>{
 assert.equal(url,endpoint);assert.equal(init.redirect,'manual');
 assert.equal(init.credentials,'omit');assert.equal(init.cache,'no-store');
 assert.equal(init.headers.Accept,'application/json');
 return response(typeof payload==='string'?payload:{Total:1,Page:1,...payload},opts);
};}
test('v153 reviews a unique metadata association but never authorizes trading',async()=>{
 const result=await checkCodalSearchAssociation(filing(),{fetcher:fetcherFor({Letters:[letter()],Total:1,Page:1})});
 assert.equal(result.status,'CODAL_SEARCH_METADATA_MATCH_REVIEW_ONLY');
 assert.equal(result.tracingNo,'1278431');
 assert.equal(result.letterSerial,serial);
 for(const key of ['originVerified','figuresVerified','entryEligible','tradingSignalsEnabled'])
  assert.equal(result[key],false);
});
test('v153 binds DownloadFile hs to the search metadata PDF token',async()=>{
 const f={...filing(),reportUrl:'https://www.codal.ir/DownloadFile.aspx?hs=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&ft=1005&let=6'};
 assert.equal((await checkCodalSearchAssociation(f,{fetcher:fetcherFor({Letters:[letter()]})})).status,'CODAL_SEARCH_METADATA_MATCH_REVIEW_ONLY');
 const bad={...letter(),PdfUrl:'DownloadFile.aspx?hs=differentValidToken123&ft=1005&let=6'};
 assert.equal((await checkCodalSearchAssociation(f,{fetcher:fetcherFor({Letters:[bad]})})).reason,'SEARCH_PDF_URL_MISMATCH');
});
test('v153 fails closed on mismatched symbol, tracking number, token, path, date or ambiguous search results',async()=>{
 for(const [bad,reason] of [
  [{...letter(),Symbol:'فولاد'},'SEARCH_FILING_IDENTITY_MISMATCH'],
  [{...letter(),TracingNo:54321},'SEARCH_FILING_IDENTITY_MISMATCH'],
  [{...letter(),Url:'/Reports/Decision.aspx?LetterSerial=differentValidToken123'},'SEARCH_LETTER_SERIAL_MISMATCH'],
  [{...letter(),Url:'/untrusted?LetterSerial=qr1ypqX8jr8rIaRvVJxoNA%3d%3d'},'SEARCH_LETTER_SERIAL_MISMATCH'],
  [{...letter(),PublishDateTime:'۱۴۰۳/۰۹/۱۵ ۰۰:۰۰:۰۰'},'SEARCH_PUBLICATION_DATE_MISMATCH']
 ]){
  const r=await checkCodalSearchAssociation(filing(),{fetcher:fetcherFor({Letters:[bad]})});
  assert.equal(r.reason,reason);assert.equal(r.entryEligible,false);
 }
 for(const letters of [[],[letter(),letter()],null])
  assert.equal((await checkCodalSearchAssociation(filing(),{fetcher:fetcherFor({Letters:letters})})).reason,'SEARCH_RESULT_NOT_UNIQUE');
});
test('v153 rejects mismatched response URL, non-JSON, bad status, oversize and invalid JSON',async()=>{
 const data={Letters:[letter()]};
 for(const [options,reason] of [
  [{url:'https://search.codal.ir.evil.example/api/search/v2/q?TracingNo=1278431'},'BAD_SEARCH_HTTP_RESPONSE'],
  [{status:429},'BAD_SEARCH_HTTP_RESPONSE'],
  [{contentType:'text/html'},'SEARCH_CONTENT_TYPE_NOT_JSON'],
  [{headers:{'content-length':'999999999'}},'SEARCH_PAYLOAD_TOO_LARGE']
 ]){
  const r=await checkCodalSearchAssociation(filing(),{fetcher:fetcherFor(data,options)});
  assert.equal(r.reason,reason);
 }
 assert.equal((await checkCodalSearchAssociation(filing(),{fetcher:fetcherFor('{bad-json')})).reason,'INVALID_SEARCH_JSON');
});
test('v153 rejects invalid filing identity and offline network',async()=>{
 let called=0;
 const invalid=await checkCodalSearchAssociation({...filing(),letterSerial:'x'},{fetcher:async()=>{called++;return response({Letters:[letter()]});}});
 assert.equal(invalid.reason,'INVALID_FILING_URL');assert.equal(called,0);
 const offline=await checkCodalSearchAssociation(filing(),{fetcher:async()=>{throw Error('offline');}});
 assert.equal(offline.reason,'SEARCH_FETCH_OR_PARSE_FAILED');assert.equal(offline.originVerified,false);
});
test('v153 bounds unresponsive fetch and stalled response streams',async()=>{
 const keepAlive=setTimeout(()=>{},500);
 try{
  const hung=await checkCodalSearchAssociation(filing(),{fetcher:()=>new Promise(()=>{}),timeoutMs:30});
  assert.equal(hung.reason,'SEARCH_DEADLINE_EXCEEDED');
  const remote=response({Letters:[letter()]});
  Object.defineProperty(remote,'body',{value:{getReader:()=>({read:()=>new Promise(()=>{}),cancel:()=>new Promise(()=>{})})}});
  const stalled=await checkCodalSearchAssociation(filing(),{fetcher:async()=>remote,timeoutMs:30});
  assert.equal(stalled.reason,'SEARCH_DEADLINE_EXCEEDED');assert.equal(stalled.entryEligible,false);
 }finally{clearTimeout(keepAlive);}
});

test('v153 requires a provably unique search result count, not merely one visible page row',async()=>{
 for(const payload of [
  {Letters:[letter()],Total:2,Page:1},
  {Letters:[letter()],Total:1,Page:2},
  {Letters:[letter()],Page:1},
  {Letters:[letter()],Total:1}
 ]){
  const fetcher=async()=>response(payload);
  const r=await checkCodalSearchAssociation(filing(),{fetcher});
  assert.equal(r.reason,'SEARCH_RESULT_COUNT_OR_PAGE_UNVERIFIED');
  assert.equal(r.entryEligible,false);
 }
});

test('v153 requires the complete CODAL report URL, not just a matching LetterSerial',async()=>{
 const cases=[
  {...letter(),Url:'/Reports/Other.aspx?LetterSerial=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&rt=3&let=6&ct=0&ft=-1'},
  {...letter(),Url:'/Reports/Decision.aspx?LetterSerial=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&rt=4&let=6&ct=0&ft=-1'},
  {...letter(),Url:'/Reports/Decision.aspx?LetterSerial=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&rt=3&let=6&ct=0'},
  {...letter(),Url:'/Reports/Decision.aspx?LetterSerial=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&rt=3&rt=3&let=6&ct=0&ft=-1'},
  {...letter(),Url:'/Reports/Decision.aspx?LetterSerial=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&rt=3&let=6&ct=0&ft=-1&extra=1'}
 ];
 for(const [index,bad] of cases.entries()){
  const result=await checkCodalSearchAssociation(filing(),{fetcher:fetcherFor({Letters:[bad]})});
  assert.equal(result.status,'CODAL_METADATA_INSUFFICIENT');
  assert.equal(result.reason,index<3?'SEARCH_REPORT_URL_MISMATCH':'SEARCH_LETTER_SERIAL_MISMATCH');
  assert.equal(result.entryEligible,false);
 }
 const reordered={...letter(),Url:'/Reports/Decision.aspx?ft=-1&ct=0&let=6&rt=3&LetterSerial=qr1ypqX8jr8rIaRvVJxoNA%3D%3D'};
 assert.equal((await checkCodalSearchAssociation(filing(),{fetcher:fetcherFor({Letters:[reordered]})})).status,
  'CODAL_SEARCH_METADATA_MATCH_REVIEW_ONLY');
});
test('v153 rejects PDF query mismatch even if the hs token is identical',async()=>{
 const f={...filing(),reportUrl:'https://www.codal.ir/DownloadFile.aspx?hs=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&ft=1005&let=6'};
 for(const badPdf of [
  'DownloadFile.aspx?hs=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&ft=1000&let=6',
  'DownloadFile.aspx?hs=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&ft=1005&let=7',
  'DownloadFile.aspx?hs=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&ft=1005&let=6&more=1'
 ]){
  const result=await checkCodalSearchAssociation(f,{fetcher:fetcherFor({Letters:[{...letter(),PdfUrl:badPdf}]})});
  assert.equal(result.reason,'SEARCH_PDF_URL_MISMATCH');
 }
});
