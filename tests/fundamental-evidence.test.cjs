'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {checkFinancialEvidence}=require('../fundamental-evidence.js');
const sample=()=>({symbol:'ونوين',tracing_no:'۱۲۳۴۵',report_url:'https://www.codal.ir/Reports/Decision.aspx?LetterSerial=12345',
 publication_date:'۱۴۰۵/۰۸/۱۲',period_end:'۱۴۰۵/۰۶/۳۱',unit:'MILLION_IRR',audit_status:'UNAUDITED',
 statement_basis:'STANDALONE',document_sha256:'a'.repeat(64),original_document_read:true,
 fields:{net_income:{amount:2000,source_row:'سود خالص',source_page:4}}});
test('listing metadata alone never authorizes financial analysis',()=>{
 const r=checkFinancialEvidence({symbol:'ونوین',tracing_no:12345},'ونوین');
 assert.equal(r.status,'INSUFFICIENT_EVIDENCE');assert.equal(r.fields.length,0);
});
test('well-formed synthetic evidence is only ready for review',()=>{
 const r=checkFinancialEvidence(sample(),'ونوین');
 assert.equal(r.status,'READY_FOR_REVIEW');assert.equal(r.fields[0].unit,'MILLION_IRR');
});
test('rejects wrong issuer, spoofed host, missing original',()=>{
 const a=sample();a.symbol='فولاد';a.report_url='https://codal.ir.fake.test/Reports/A.aspx?x=1';a.original_document_read=false;
 const r=checkFinancialEvidence(a,'ونوین');assert.equal(r.status,'INSUFFICIENT_EVIDENCE');
 assert.ok(r.errors.includes('SYMBOL_MISMATCH'));assert.ok(r.errors.includes('INVALID_REPORT_URL'));
 assert.ok(r.errors.includes('ORIGINAL_DOCUMENT_NOT_READ'));
});
test('rejects missing audit, unit, financial period, digest or traceable source row',()=>{
 const a=sample();a.audit_status='';a.unit='ریال';a.period_end='۱۴۰۵/۰۹/۰۱';
 a.document_sha256='';a.fields.net_income.source_page=0;
 const r=checkFinancialEvidence(a,'ونوین');
 assert.ok(r.errors.includes('INVALID_AUDIT_STATUS'));assert.ok(r.errors.includes('INVALID_UNIT'));
 assert.ok(r.errors.includes('PERIOD_AFTER_PUBLICATION'));
 assert.ok(r.errors.includes('MISSING_OR_INVALID_SHA256'));
 assert.ok(r.errors.includes('UNTRACEABLE_FIELD'));
});
test('rejects unrecognized metrics and strings as numeric amounts',()=>{
 const a=sample();a.fields.net_income.amount='2000';a.fields.fake_metric={amount:5,source_page:1,source_row:'x'};
 const r=checkFinancialEvidence(a,'ونوین');
 assert.ok(r.errors.includes('UNSUPPORTED_METRIC'));assert.ok(r.errors.includes('UNTRACEABLE_FIELD'));
});
