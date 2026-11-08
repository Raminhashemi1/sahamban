'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const rows=require('../codal-source-rows-v139.js');
const sample=()=>({fingerprint:{
 status:'LOCAL_FILE_FINGERPRINT_ONLY',sha256:'a'.repeat(64),
 filing:{symbol:'ونوین',tracingNo:'12345',published:'۱۴۰۵/۰۸/۱۳ ۱۰:۳۰:۰۰',reportUrl:'https://www.codal.ir/Reports/X.aspx?a=1'},
 format:'PDF',fileSizeBytes:100,originVerified:false,originalDocumentRead:false},
 periodEnd:'۱۴۰۵/۰۶/۳۱',unit:'MILLION_IRR',auditStatus:'UNAUDITED',statementBasis:'STANDALONE',
 rows:[{metric:'net_income',amount:'-۱۲۳۴',page:'۴',sourceRow:'سود (زیان) خالص'}]});
test('local row annotations carry source and hash but never certify financial figures',()=>{
 const r=rows.review(sample());
 assert.equal(r.status,'LOCAL_ROW_REFERENCES_UNVERIFIED');
 assert.equal(r.evidence.fields[0].amount,-1234);
 assert.equal(r.evidence.fields[0].sourcePage,4);
 assert.equal(r.evidence.documentSha256,'a'.repeat(64));
 assert.equal(r.evidence.source,'USER_ENTERED_NOT_AUTOMATICALLY_EXTRACTED');
 assert.equal(r.evidence.originVerified,false);
 assert.equal(r.tradingSignalsEnabled,false);
 assert.ok(!('eps' in r.evidence));
});
test('rejects missing original hash and forged verification flags',()=>{
 for(const fingerprint of [null,{...sample().fingerprint,sha256:'z'.repeat(64)},
 {...sample().fingerprint,originVerified:true},{...sample().fingerprint,originalDocumentRead:true}]){
  const r=rows.review({...sample(),fingerprint});assert.equal(r.status,'INSUFFICIENT_EVIDENCE');
  assert.equal(r.fields.length,0);
 }
});
test('rejects period after publication and impossible Jalali date',()=>{
 for(const periodEnd of ['۱۴۰۵/۰۹/۰۱','۱۴۰۵/۱۳/۰۱','۱۴۰۵/۰۸/۳۱','garbage']){
  const r=rows.review({...sample(),periodEnd});assert.ok(r.errors.includes('INVALID_PERIOD'));
 }
});
test('rejects invalid unit, audit basis and no rows',()=>{
 const x=sample();x.unit='USD';x.auditStatus='invalid';x.statementBasis='other';x.rows=[];
 const r=rows.review(x);
 for(const err of ['INVALID_UNIT','INVALID_AUDIT_STATUS','INVALID_STATEMENT_BASIS','INVALID_ROWS_COUNT'])assert.ok(r.errors.includes(err));
});
test('duplicate and unsupported metrics fail closed',()=>{
 const x=sample();x.rows.push({...x.rows[0],amount:'2'});
 assert.equal(rows.review(x).status,'INSUFFICIENT_EVIDENCE');
 const y=sample();y.rows[0].metric='fake';assert.ok(rows.review(y).errors.includes('INVALID_OR_DUPLICATE_ROW'));
});
test('bad source page and label are rejected',()=>{
 for(const change of [{page:'0'},{page:'1.5'},{page:'NaN'},{sourceRow:''},{sourceRow:'a'.repeat(161)}]){
  const x=sample();x.rows[0]={...x.rows[0],...change};
  assert.equal(rows.review(x).status,'INSUFFICIENT_EVIDENCE');
 }
});
test('Persian and Arabic digits parse but comma grouped numbers do not',()=>{
 assert.equal(rows.parseAmount('۱۲۳۴.۵'),'1234.5'*1);
 assert.equal(rows.parseAmount('١٠٠'),100);
 for(const invalid of ['1,000','۱٬۰۰۰','12e3','Infinity','  ','.2','--1'])assert.equal(rows.parseAmount(invalid),null);
});
test('module loaded in PWA and has no storage/network/exfiltration',()=>{
 const js=fs.readFileSync('codal-source-rows-v139.js','utf8');
 const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
 new vm.Script(js);
 for(const id of ['codalRowsV139','codalRowsPeriodV139','codalRowsUnitV139','codalRowsAuditV139','codalRowsBasisV139','codalRowsAddV139','codalRowsCheckV139'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(sw.includes('codal-source-rows-v139.js?v=139.1'));
 assert.ok(html.indexOf('codal-source-rows-v139.js?v=139.1')<html.indexOf('codal-original-intake-v138.js?v=138.2'));
 assert.doesNotMatch(js,/localStorage|sessionStorage|XMLHttpRequest|sendBeacon|fetch\(/);
});

test('download packet is allowlisted, immutable by input extras, and unmistakably unverified',()=>{
 const input=sample();
 input.fingerprint.privateBrokerHoldings='DO_NOT_EXPORT';
 input.unknownSecret='DO_NOT_EXPORT';
 input.rows[0].privateAccount='DO_NOT_EXPORT';
 const r=rows.auditPacket(input);
 assert.equal(r.status,'LOCAL_ROW_REFERENCES_UNVERIFIED');
 assert.equal(r.packet.schema,'sahamban.codal.row-audit.v1');
 assert.equal(r.packet.financialEvidence,'INSUFFICIENT_EVIDENCE');
 assert.equal(r.packet.tradingSignalsEnabled,false);
 assert.equal(r.packet.document.originVerified,false);
 assert.equal(r.packet.document.originalDocumentRead,false);
 assert.equal(r.packet.fields.length,1);
 assert.equal(r.packet.fields[0].amount,-1234);
 const dumped=JSON.stringify(r.packet);
 assert.doesNotMatch(dumped,/DO_NOT_EXPORT|privateBrokerHoldings|privateAccount|unknownSecret/);
 assert.ok(!('holdings' in r.packet));
 assert.ok(!('verified' in r.packet));
});
test('no audit packet is exported on invalid row, missing SHA, or bad period',()=>{
 for(const change of [{rows:[{metric:'net_income',amount:'abc',page:'4',sourceRow:'سود خالص'}]},
 {fingerprint:null},{periodEnd:'۱۴۰۵/۱۲/۳۰'}]){
  const r=rows.auditPacket({...sample(),...change});
  assert.equal(r.status,'INSUFFICIENT_EVIDENCE');assert.equal(r.packet,null);
 }
});
test('local export button is present and app code contains no network access',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const src=fs.readFileSync('codal-source-rows-v139.js','utf8');
 const sw=fs.readFileSync('sw.js','utf8');
 assert.ok(html.includes('id="codalRowsExportV139"'));
 assert.ok(html.includes('codal-source-rows-v139.js?v=139.1'));
 assert.ok(sw.includes('codal-source-rows-v139.js?v=139.1'));
 assert.match(src,/createObjectURL/);
 assert.match(src,/revokeObjectURL/);
 assert.doesNotMatch(src,/localStorage|sessionStorage|XMLHttpRequest|sendBeacon|fetch\(/);
});

test('local CODAL row intake accepts Esfand 30 only in leap years',()=>{
 assert.equal(rows.date('۱۴۰۳/۱۲/۳۰'),'1403/12/30');
 assert.equal(rows.date('۱۴۰۵/۱۲/۳۰'),null);
 assert.equal(rows.date('۱۴۰۵/۱۲/۲۹'),'1405/12/29');
});

test('local CODAL row intake covers the 1399 to 1400 leap-year boundary',()=>{
 assert.equal(rows.date('۱۳۹۹/۱۲/۳۰'),'1399/12/30');
 assert.equal(rows.date('۱۴۰۰/۱۲/۳۰'),null);
});
