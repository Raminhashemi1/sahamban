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

test('CODAL report URL serial must match the declared tracing number',()=>{
 const mismatch=sample();mismatch.report_url='https://www.codal.ir/Reports/Decision.aspx?LetterSerial=99999';
 const r=checkFinancialEvidence(mismatch,'ونوین');
 assert.equal(r.status,'INSUFFICIENT_EVIDENCE');
 assert.ok(r.errors.includes('REPORT_TRACING_MISMATCH'));
 assert.equal(r.fields.length,0);
 const missing=sample();missing.report_url='https://www.codal.ir/Reports/Decision.aspx?OtherId=12345';
 assert.ok(checkFinancialEvidence(missing,'ونوین').errors.includes('REPORT_TRACING_MISMATCH'));
 const match=sample();match.report_url='https://www.codal.ir/Reports/Decision.aspx?LetterSerial=۱۲۳۴۵';
 assert.equal(checkFinancialEvidence(match,'ونوین').status,'READY_FOR_REVIEW');
});

test('EPS requires parent-attributable income and weighted-average shares with explicit units',()=>{
 const {calculateEPS}=require('../fundamental-evidence.js');
 const a=sample();
 assert.equal(calculateEPS(a,'ونوین').status,'INSUFFICIENT_EVIDENCE');
 assert.ok(calculateEPS(a,'ونوین').errors.includes('EPS_REQUIRES_PARENT_ATTRIBUTABLE_NET_INCOME_AND_WEIGHTED_AVERAGE_SHARES'));
 a.fields.net_income_attributable_to_parent={amount:2500,source_row:'سود خالص قابل انتساب به مالکان شرکت اصلی',source_page:4};
 a.fields.weighted_average_shares={amount:500000000,unit:'SHARES',source_row:'میانگین موزون تعداد سهام',source_page:8};
 const result=calculateEPS(a,'ونوین');
 assert.equal(result.status,'EPS_READY_FOR_REVIEW');
 assert.equal(result.eps.valueRialPerShare,5);
 assert.equal(result.eps.currency,'IRR');
 assert.equal(result.eps.periodEnd,a.period_end);
 assert.match(result.note,/not independently verified/);
});
test('EPS scales filing units correctly and preserves losses as negative EPS',()=>{
 const {calculateEPS}=require('../fundamental-evidence.js');
 const a=sample();a.fields.net_income_attributable_to_parent={amount:-2,source_row:'زیان قابل انتساب',source_page:4};
 a.fields.weighted_average_shares={amount:1000000,unit:'SHARES',source_row:'میانگین موزون سهام',source_page:8};
 const r=calculateEPS(a,'ونوین');
 assert.equal(r.status,'EPS_READY_FOR_REVIEW');
 assert.equal(r.eps.valueRialPerShare,-2);
});
test('EPS rejects missing or invalid weighted-average share evidence',()=>{
 const {calculateEPS}=require('../fundamental-evidence.js');
 const a=sample();a.fields.net_income_attributable_to_parent={amount:2500,source_row:'سود قابل انتساب',source_page:4};
 a.fields.weighted_average_shares={amount:0,unit:'SHARES',source_row:'میانگین موزون سهام',source_page:8};
 const r=calculateEPS(a,'ونوین');
 assert.equal(r.status,'INSUFFICIENT_EVIDENCE');
 assert.ok(r.errors.includes('INVALID_WEIGHTED_AVERAGE_SHARES'));
 assert.equal(r.eps,null);
});
test('EPS never substitutes closing shares outstanding for weighted-average shares',()=>{
 const {calculateEPS}=require('../fundamental-evidence.js');
 const a=sample();a.fields.net_income_attributable_to_parent={amount:2500,source_row:'سود قابل انتساب',source_page:4};
 a.fields.shares_outstanding={amount:500000000,unit:'SHARES',source_row:'تعداد سهام پایان دوره',source_page:8};
 const r=calculateEPS(a,'ونوین');
 assert.equal(r.status,'INSUFFICIENT_EVIDENCE');
 assert.ok(r.errors.includes('EPS_REQUIRES_PARENT_ATTRIBUTABLE_NET_INCOME_AND_WEIGHTED_AVERAGE_SHARES'));
});
test('EPS requires monetary income unit to match the filing unit',()=>{
 const {calculateEPS}=require('../fundamental-evidence.js');
 const a=sample();a.fields.net_income_attributable_to_parent={amount:2500,unit:'IRR',source_row:'سود قابل انتساب',source_page:4};
 a.fields.weighted_average_shares={amount:500000000,unit:'SHARES',source_row:'میانگین موزون سهام',source_page:8};
 const r=calculateEPS(a,'ونوین');
 assert.equal(r.status,'INSUFFICIENT_EVIDENCE');
 assert.ok(r.errors.includes('INVALID_FIELD_UNIT'));
});


test('DPS requires AGM-approved total cash dividend and record-date eligible shares',()=>{
 const {calculateDPS}=require('../fundamental-evidence.js');
 const a=sample();a.dividend_status='APPROVED_BY_AGM';a.dividend_record_date='۱۴۰۵/۰۸/۱۰';
 a.fields.cash_dividend_approved_total={amount:1000,source_row:'مبلغ سود نقدی مصوب مجمع',source_page:12};
 a.fields.dividend_eligible_shares={amount:100000000,unit:'SHARES',source_row:'تعداد سهام مشمول سود در تاریخ ثبت',source_page:13};
 const r=calculateDPS(a,'ونوین');
 assert.equal(r.status,'DPS_READY_FOR_REVIEW');
 assert.equal(r.dps.valueRialPerShare,10);
 assert.equal(r.dps.currency,'IRR');
 assert.equal(r.dps.recordDate,a.dividend_record_date);
 assert.match(r.note,/not independently verified/);
});
test('DPS refuses proposed or paid-only status and invalid record dates',()=>{
 const {calculateDPS}=require('../fundamental-evidence.js');
 const a=sample();a.dividend_status='PROPOSED_BY_BOARD';a.dividend_record_date='۱۴۰۵/۰۸/۱۰';
 a.fields.cash_dividend_approved_total={amount:1000,source_row:'پیشنهاد سود نقدی',source_page:12};
 a.fields.dividend_eligible_shares={amount:100000000,unit:'SHARES',source_row:'سهام مشمول',source_page:13};
 assert.ok(calculateDPS(a,'ونوین').errors.includes('DIVIDEND_NOT_APPROVED_BY_AGM'));
 a.dividend_status='APPROVED_BY_AGM';a.dividend_record_date='۱۴۰۵/۱۲/۳۰';
 assert.ok(calculateDPS(a,'ونوین').errors.includes('INVALID_DIVIDEND_RECORD_DATE'));
});
test('DPS never substitutes closing shares outstanding for record-date eligible shares',()=>{
 const {calculateDPS}=require('../fundamental-evidence.js');
 const a=sample();a.dividend_status='APPROVED_BY_AGM';a.dividend_record_date='۱۴۰۵/۰۸/۱۰';
 a.fields.cash_dividend_approved_total={amount:1000,source_row:'سود نقدی مصوب',source_page:12};
 a.fields.shares_outstanding={amount:100000000,unit:'SHARES',source_row:'تعداد سهام پایان دوره',source_page:13};
 const r=calculateDPS(a,'ونوین');
 assert.equal(r.status,'INSUFFICIENT_EVIDENCE');
 assert.ok(r.errors.includes('DPS_REQUIRES_APPROVED_CASH_DIVIDEND_TOTAL_AND_RECORD_DATE_ELIGIBLE_SHARES'));
});
test('DPS rejects negative approved dividend totals and currency-unit mismatch',()=>{
 const {calculateDPS}=require('../fundamental-evidence.js');
 const a=sample();a.dividend_status='APPROVED_BY_AGM';a.dividend_record_date='۱۴۰۵/۰۸/۱۰';
 a.fields.cash_dividend_approved_total={amount:-1,source_row:'سود نقدی مصوب',source_page:12};
 a.fields.dividend_eligible_shares={amount:100000000,unit:'SHARES',source_row:'سهام مشمول',source_page:13};
 assert.ok(calculateDPS(a,'ونوین').errors.includes('NEGATIVE_BALANCE_SHEET_TOTAL'));
 a.fields.cash_dividend_approved_total.amount=1000;a.fields.cash_dividend_approved_total.unit='IRR';
 assert.ok(calculateDPS(a,'ونوین').errors.includes('INVALID_FIELD_UNIT'));
});
