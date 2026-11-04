'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const intake=require('../codal-original-intake-v138.js');
const record=()=>({symbol:'ونوین',tracingNo:'12345',published:'۱۴۰۵/۰۸/۱۳',originalUrl:'https://www.codal.ir/Reports/Decision.aspx?LetterSerial=12345'});
function file(data,name='report.pdf'){
 const b=Buffer.from(data);
 return {name,size:b.length,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
}
test('valid filing identity can be selected',()=>{
 assert.equal(intake.safeFiling(record()).tracingNo,'12345');
});
test('invalid issuer proof and unsafe URLs are rejected',()=>{
 for(const change of [{tracingNo:'0'},{symbol:''},{published:''},{originalUrl:null},
 {originalUrl:'https://codal.ir.evil.test/Reports/A.aspx?x=1'},
 {originalUrl:'https://codal.ir/unsafe?x=1'}]){
  assert.equal(intake.safeFiling({...record(),...change}),null);
 }
});
test('real SHA-256 local file is never authentic financial evidence',async()=>{
 const data='%PDF-1.7\nsynthetic offline example';
 const r=await intake.inspect(file(data),record(),{subtle:crypto.webcrypto.subtle});
 assert.equal(r.status,'LOCAL_FILE_FINGERPRINT_ONLY');
 assert.equal(r.sha256,crypto.createHash('sha256').update(data).digest('hex'));
 assert.equal(r.format,'PDF');
 assert.equal(r.originalDocumentRead,false);
 assert.equal(r.originVerified,false);
 assert.equal(r.financialEvidence,'INSUFFICIENT_EVIDENCE');
 assert.equal(r.tradingSignalsEnabled,false);
 assert.ok(!('fields' in r));
});
test('bad filing rejects before file reads',async()=>{
 let reads=0;
 const a={name:'a.pdf',size:5,arrayBuffer:async()=>{reads++;return new Uint8Array([37,80,68,70,45]).buffer;}};
 const r=await intake.inspect(a,{...record(),tracingNo:'bad'},{subtle:crypto.webcrypto.subtle});
 assert.equal(r.reason,'UNVERIFIED_FILING_IDENTITY');
 assert.equal(reads,0);
});
test('oversize, empty and missing files rejected without values',async()=>{
 const oversize={name:'x.pdf',size:intake.MAX_BYTES+1,arrayBuffer:async()=>{throw Error('never read');}};
 for(const a of [null,oversize,{name:'a.pdf',size:0,arrayBuffer:async()=>new ArrayBuffer(0)}]){
  assert.equal((await intake.inspect(a,record(),{subtle:crypto.webcrypto.subtle})).reason,'INVALID_FILE_OR_SIZE');
 }
});
test('unrecognized PDF content rejected',async()=>{
 assert.equal((await intake.inspect(file('not-a-pdf'),record(),{subtle:crypto.webcrypto.subtle})).reason,'UNRECOGNIZED_DOCUMENT_FORMAT');
});
test('spreadsheet containers are labeled uninspected',async()=>{
 const xlsx=await intake.inspect(file([80,75,3,4,0,0], 'a.xlsx'),record(),{subtle:crypto.webcrypto.subtle});
 const xls=await intake.inspect(file([208,207,17,224,161,177,26,225], 'a.xls'),record(),{subtle:crypto.webcrypto.subtle});
 assert.equal(xlsx.format,'XLSX_ZIP_CONTAINER_UNINSPECTED');
 assert.equal(xls.format,'XLS_OLE_CONTAINER_UNINSPECTED');
 assert.equal(xls.originalDocumentRead,false);
});
test('sha digest failure stays unverified',async()=>{
 const r=await intake.inspect(file('%PDF-1.4\nabc'),record(),{subtle:{digest:async()=>{throw Error('x');}}});
 assert.equal(r.reason,'SHA256_FAILED');assert.equal(r.financialEvidence,'INSUFFICIENT_EVIDENCE');
});
test('browser script parses, is before CODAL discovery and cached',()=>{
 const js=fs.readFileSync('codal-original-intake-v138.js','utf8');
 const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
 new vm.Script(js);
 for(const id of ['codalOriginalV138','codalOriginalFileV138','codalOriginalCheckV138','codalOriginalStatusV138','codalOriginalSelectedV138'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(html.indexOf('codal-original-intake-v138.js?v=138.0')<html.indexOf('codal-disclosure-v137.js?v=137.2'));
 assert.ok(sw.includes('codal-original-intake-v138.js?v=138.0'));
 assert.ok(sw.includes('codal-disclosure-v137.js?v=137.2'));
 assert.doesNotMatch(js,/localStorage|sessionStorage|XMLHttpRequest|sendBeacon/);
});
