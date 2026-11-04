'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const codal=require('../codal-disclosure-v137.js');
const row=(extra={})=>({Symbol:'ونوين',Title:'صورت وضعیت مالی نمونه',TracingNo:'۱۲۳۴۵',
 PublishDateTime:'۱۴۰۵/۰۸/۱۳ ۱۰:۳۰:۰۰',Url:'/Reports/Decision.aspx?LetterSerial=12345',...extra});
const body=(rows=[row()])=>({Total:rows.length,Page:1,Letters:rows});
test('exact Persian and Arabic symbol match yields metadata only',()=>{
 const r=codal.review(body(),'ونوین');
 assert.equal(r.status,'SEARCH_METADATA_VALIDATED');
 assert.equal(r.items.length,1);
 assert.equal(r.financialEvidence,'INSUFFICIENT_EVIDENCE');
 assert.equal(r.tradingSignalsEnabled,false);
 assert.equal(r.items[0].tracingNo,'12345');
});
test('wrong symbol cannot be accepted',()=>{
 const r=codal.review(body([row({Symbol:'فولاد'})]),'ونوین');
 assert.equal(r.items.length,0);assert.equal(r.status,'UNVERIFIED_NO_VALID_LETTERS');
});
test('duplicate tracing number cannot be counted twice',()=>{
 const r=codal.review(body([row(),row({Title:'duplicate'})]),'ونوین');
 assert.equal(r.items.length,1);assert.equal(r.rejected,1);
});
test('invalid date, missing title and bad tracing are rejected',()=>{
 const r=codal.review(body([row({PublishDateTime:'۱۴۰۵/۱۳/۰۱'}),row({Title:' '}),
 row({TracingNo:'0'}),row({TracingNo:'5e2'})]),'ونوین');
 assert.equal(r.items.length,0);assert.equal(r.rejected,4);
});
test('invalid response schemas fail closed',()=>{
 for(const b of [null,{}, {Letters:[],Total:-1,Page:1},{Letters:[row()],Total:0,Page:1},
 {Letters:[],Total:0,Page:0},{Letters:Array.from({length:101},()=>row()),Total:101,Page:1}]){
  assert.equal(codal.review(b,'ونوین').status,'UNVERIFIED_SEARCH_SCHEMA');
 }
});
test('empty search is not evidence of absence',()=>assert.equal(codal.review(body([]),'ونوین').status,'UNVERIFIED_EMPTY_SEARCH'));
test('only allowlisted original Codal URLs are used',()=>{
 assert.match(codal.reportUrl('/Reports/Decision.aspx?LetterSerial=12345'),/^https:\/\/www\.codal\.ir\//);
 for(const x of ['https://codal.ir.fake.test/Reports/A.aspx?x=1','http://codal.ir/Reports/A.aspx?x=1','javascript:alert(1)',
  '//codal.ir/Reports/A.aspx?x=1','https://codal.ir/other?x=1','https://user@codal.ir/Reports/A.aspx?x=1']){
  assert.equal(codal.reportUrl(x),null);
 }
});
test('valid row with unsafe URL has no clickable link',()=>{
 const r=codal.review(body([row({Url:'https://evil.test/Reports/A.aspx?x=1'})]),'ونوین');
 assert.equal(r.items.length,1);assert.equal(r.items[0].originalUrl,null);
});
test('search never transmits portfolio and returns only metadata',async()=>{
 let called=0;
 const fetchImpl=async(url,options)=>{
  called++;assert.match(url,/^https:\/\/search\.codal\.ir\/api\/search\/v2\/q\?/);
  assert.match(decodeURIComponent(url),/Symbol=ونوین/);
  assert.equal(options.method,'GET');assert.equal(options.cache,'no-store');
  assert.equal(options.body,undefined);
  return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>body()};
 };
 const r=await codal.search('ونوین',{fetchImpl});
 assert.equal(called,1);assert.equal(r.status,'SEARCH_METADATA_VALIDATED');
 assert.equal(r.financialEvidence,'INSUFFICIENT_EVIDENCE');
});
test('HTTP and content-type errors never produce acceptance',async()=>{
 for(const response of [
  {status:429,ok:false,headers:{get:()=>''}},
  {status:503,ok:false,headers:{get:()=>''}},
  {status:200,ok:true,headers:{get:()=> 'text/html'}}
 ])await assert.rejects(codal.search('ونوین',{fetchImpl:async()=>response}));
});
test('invalid symbol is rejected before any fetch',async()=>{
 let called=false;
 await assert.rejects(codal.search(' ',{fetchImpl:async()=>{called=true;}}),/INVALID_SYMBOL/);
 assert.equal(called,false);
});
test('browser script parses and UI is wired to PWA precache',()=>{
 const js=fs.readFileSync('codal-disclosure-v137.js','utf8');
 const html=fs.readFileSync('index.html','utf8');
 const sw=fs.readFileSync('sw.js','utf8');
 new vm.Script(js);
 for(const id of ['codalEvidenceV137','codalEvidenceSymbolV137','codalEvidenceRunV137','codalEvidenceStatusV137','codalEvidenceResultsV137'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(html.includes('./codal-disclosure-v137.js?v=137.1'));
 assert.ok(sw.includes('./codal-disclosure-v137.js?v=137.1'));
 assert.doesNotMatch(js,/localStorage|sessionStorage|sahamban-broker-holdings|dispatchEvent\(/);
});
