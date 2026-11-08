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

test('rejects negative balance-sheet totals and non-positive share counts',()=>{
 const negativeAssets=sample();negativeAssets.fields.total_assets={amount:-1,source_row:'جمع دارایی‌ها',source_page:3};
 assert.ok(checkFinancialEvidence(negativeAssets,'ونوین').errors.includes('NEGATIVE_BALANCE_SHEET_TOTAL'));
 const zeroShares=sample();zeroShares.fields.shares_outstanding={amount:0,unit:'SHARES',source_row:'تعداد سهام',source_page:2};
 assert.ok(checkFinancialEvidence(zeroShares,'ونوین').errors.includes('INVALID_SHARES_OUTSTANDING'));
 const negativeShares=sample();negativeShares.fields.shares_outstanding={amount:-10,unit:'SHARES',source_row:'تعداد سهام',source_page:2};
 assert.ok(checkFinancialEvidence(negativeShares,'ونوین').errors.includes('INVALID_SHARES_OUTSTANDING'));
});
test('checks balance-sheet equation with a documented rounding tolerance',()=>{
 const a=sample();
 a.fields.total_assets={amount:1000,source_row:'جمع دارایی‌ها',source_page:3};
 a.fields.total_liabilities={amount:600,source_row:'جمع بدهی‌ها',source_page:3};
 a.fields.equity={amount:400,source_row:'حقوق صاحبان سهام',source_page:3};
 const pass=checkFinancialEvidence(a,'ونوین');
 assert.equal(pass.status,'READY_FOR_REVIEW');
 assert.equal(pass.accountingCheck.status,'PASS_WITH_ROUNDING_TOLERANCE');
 a.fields.equity.amount=350;
 const fail=checkFinancialEvidence(a,'ونوین');
 assert.equal(fail.status,'INSUFFICIENT_EVIDENCE');
 assert.ok(fail.errors.includes('BALANCE_SHEET_EQUATION_MISMATCH'));
 assert.equal(fail.fields.length,0);
});
test('rounding tolerance does not silently accept a material balance-sheet difference',()=>{
 const a=sample();
 a.fields.total_assets={amount:100000,source_row:'جمع دارایی‌ها',source_page:3};
 a.fields.total_liabilities={amount:60000,source_row:'جمع بدهی‌ها',source_page:3};
 a.fields.equity={amount:39800,source_row:'حقوق صاحبان سهام',source_page:3};
 const r=checkFinancialEvidence(a,'ونوین');
 assert.ok(r.errors.includes('BALANCE_SHEET_EQUATION_MISMATCH'));
});
test('share counts carry a distinct unit and cannot inherit a currency unit',()=>{
 const a=sample();
 a.fields.shares_outstanding={amount:1000000,unit:'SHARES',source_row:'تعداد سهام',source_page:2};
 const r=checkFinancialEvidence(a,'ونوین');
 assert.equal(r.status,'READY_FOR_REVIEW');
 assert.equal(r.fields.find(x=>x.name==='shares_outstanding').unit,'SHARES');
 a.fields.shares_outstanding.unit='MILLION_IRR';
 assert.ok(checkFinancialEvidence(a,'ونوین').errors.includes('INVALID_FIELD_UNIT'));
});
test('monetary fields cannot override the filing currency unit',()=>{
 const a=sample();a.fields.net_income.unit='SHARES';
 assert.ok(checkFinancialEvidence(a,'ونوین').errors.includes('INVALID_FIELD_UNIT'));
});
