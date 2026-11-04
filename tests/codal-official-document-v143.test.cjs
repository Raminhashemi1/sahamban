'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {ReadableStream}=require('node:stream/web');
const {SOURCE,MAX_BYTES,detect,probe}=require('./codal-official-document-v143.cjs');
const reply=(data,{status=200,type='application/octet-stream',length}={})=>{
 const bytes=Buffer.from(data);
 return {ok:status>=200&&status<300,status,headers:{get:k=>k==='content-type'?type:k==='content-length'?(length??String(bytes.length)):null},
  body:new ReadableStream({start(c){c.enqueue(new Uint8Array(bytes));c.close();}})};
};
test('records ZIP signature and sha without claiming official report verification',async()=>{
 const r=await probe({fetchImpl:async(url,opts)=>{
  assert.equal(url,SOURCE);assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');
  return reply(Buffer.from([80,75,3,4,1,2,3,4,9]),{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 }});
 assert.equal(r.status,'OFFICIAL_URL_RESPONSE_HASHED_UNVERIFIED');
 assert.equal(r.contentFormat,'XLSX_OR_ZIP_UNINSPECTED');
 assert.match(r.sha256,/^[0-9a-f]{64}$/);
 assert.equal(r.figuresVerified,false);assert.equal(r.originalReportVerified,false);assert.equal(r.tradingSignalsEnabled,false);
});
test('HTML response is clearly classified as HTML not XLSX',async()=>{
 const r=await probe({fetchImpl:async()=>reply('<!DOCTYPE html><html><body>export blocked</body></html>',{type:'text/html'})});
 assert.equal(r.contentFormat,'HTML_OR_XML_UNINSPECTED');
 assert.equal(r.status,'UNVERIFIED_HTML_OR_XML_RESPONSE');
 assert.equal(r.originalReportVerified,false);assert.equal(r.sha256,undefined);
});
test('network timeout and 429 remain unverified',async()=>{
 const rate=await probe({fetchImpl:async()=>reply('limited',{status:429})});
 assert.equal(rate.status,'UNVERIFIED_RATE_LIMIT');
 const offline=await probe({fetchImpl:async()=>{throw Error('network blocked');}});
 assert.equal(offline.status,'UNVERIFIED_NETWORK');
});
test('reject nonofficial URLs without fetching',async()=>{
 let n=0;const r=await probe({url:'https://not-codal.example.com/file',fetchImpl:async()=>{n++;}});
 assert.equal(r.status,'INVALID_OFFICIAL_SOURCE');assert.equal(n,0);
});
test('rejects size limit based on length and streamed bytes',async()=>{
 const stated=await probe({fetchImpl:async()=>reply('x',{length:String(MAX_BYTES+1)})});
 assert.equal(stated.status,'UNVERIFIED_RESPONSE_SIZE');
 const oversized=new Uint8Array(MAX_BYTES+1);oversized.set([80,75,3,4]);
 const streamResult=await probe({fetchImpl:async()=>reply(oversized,{length:null})});
 assert.equal(streamResult.status,'UNVERIFIED_RESPONSE_SIZE');
});
test('recognizes old XLS/PDF and rejects unrecognized type',()=>{
 assert.equal(detect(Uint8Array.from([208,207,17,224,161,177,26,225])),'XLS_OLE_UNINSPECTED');
 assert.equal(detect(Buffer.from('%PDF-1.7\noriginal text')),'PDF_UNINSPECTED');
 assert.equal(detect(Buffer.from('random bytes')),'UNKNOWN');
});

test('mismatched HTML MIME and ZIP bytes never count as hashed report',async()=>{
 for(const type of ['text/html','application/json']){
  const r=await probe({fetchImpl:async()=>reply(Buffer.from([80,75,3,4,1,2,3,4,9]),{type})});
  assert.equal(r.status,'UNVERIFIED_CONTENT_TYPE_MISMATCH');
  assert.equal(r.sha256,undefined);assert.equal(r.originalReportVerified,false);
 }
});
test('HTML tables from Excel service are unverified',async()=>{
 const r=await probe({fetchImpl:async()=>reply('<table><tr><td>سود خالص</td><td>123</td></tr></table>',{type:'application/vnd.ms-excel'})});
 assert.equal(r.status,'UNVERIFIED_HTML_OR_XML_RESPONSE');
 assert.equal(r.sha256,undefined);assert.equal(r.figuresVerified,false);
});
