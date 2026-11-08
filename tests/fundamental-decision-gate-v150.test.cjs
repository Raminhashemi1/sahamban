'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {evaluateFundamentalGate}=require('../fundamental-decision-gate-v150.js');
const sample=()=>({symbol:'ونوین',tracing_no:'۱۲۳۴۵',
 report_url:'https://www.codal.ir/Reports/Decision.aspx?LetterSerial=12345',
 publication_date:'۱۴۰۵/۰۸/۱۲',period_end:'۱۴۰۵/۰۶/۳۱',unit:'MILLION_IRR',
 audit_status:'AUDITED',statement_basis:'CONSOLIDATED',document_sha256:'a'.repeat(64),
 original_document_read:true,fields:{
  net_income_attributable_to_parent:{amount:2000,source_row:'سود خالص قابل انتساب به مالکان شرکت اصلی',source_page:4},
  weighted_average_shares:{amount:100000000,unit:'SHARES',source_row:'میانگین موزون سهام',source_page:5}
 }});
test('audited same-symbol evidence with positive attributable EPS passes minimum fundamental screen',()=>{
 const r=evaluateFundamentalGate(sample(),'ونوین');
 assert.equal(r.status,'FUNDAMENTAL_REVIEW_READY');
 assert.equal(r.entryEligible,true);
 assert.equal(r.epsStatus,'EPS_READY_FOR_REVIEW');
 assert.equal(r.epsRialPerShare,20);
 assert.equal(r.auditStatus,'AUDITED');
 assert.equal(r.statementBasis,'CONSOLIDATED');
 assert.match(r.note,/does not establish fair value/);
});
test('unaudited evidence cannot pass the entry prerequisite',()=>{
 const a=sample();a.audit_status='UNAUDITED';
 const r=evaluateFundamentalGate(a,'ونوین');
 assert.equal(r.status,'FUNDAMENTAL_REVIEW_BLOCKED');
 assert.ok(r.reasons.includes('AUDITED_STATEMENT_REQUIRED_FOR_ENTRY_REVIEW'));
});
test('wrong issuer, missing attributable earnings or invalid weighted shares fail closed',()=>{
 const wrong=sample();wrong.symbol='فولاد';
 assert.equal(evaluateFundamentalGate(wrong,'ونوین').status,'FUNDAMENTAL_REVIEW_BLOCKED');
 const noIncome=sample();delete noIncome.fields.net_income_attributable_to_parent;
 assert.ok(evaluateFundamentalGate(noIncome,'ونوین').reasons.includes('EPS_REQUIRES_PARENT_ATTRIBUTABLE_NET_INCOME_AND_WEIGHTED_AVERAGE_SHARES'));
 const noShares=sample();delete noShares.fields.weighted_average_shares;
 assert.ok(evaluateFundamentalGate(noShares,'ونوین').reasons.includes('EPS_REQUIRES_PARENT_ATTRIBUTABLE_NET_INCOME_AND_WEIGHTED_AVERAGE_SHARES'));
});
test('negative EPS is visible but blocks a positive-EPS entry prerequisite',()=>{
 const a=sample();a.fields.net_income_attributable_to_parent.amount=-2000;
 const r=evaluateFundamentalGate(a,'ونوین');
 assert.equal(r.status,'FUNDAMENTAL_REVIEW_BLOCKED');
 assert.ok(r.reasons.includes('NON_POSITIVE_EPS_BLOCKS_ENTRY_CANDIDATE'));
 assert.equal(r.epsRialPerShare,-20);
});
test('a declared dividend without approved AGM evidence remains disclosed as insufficient',()=>{
 const a=sample();a.dividend_status='PROPOSED_BY_BOARD';a.dividend_record_date='۱۴۰۵/۰۸/۱۰';
 const r=evaluateFundamentalGate(a,'ونوین');
 assert.equal(r.status,'FUNDAMENTAL_REVIEW_READY');
 assert.equal(r.dpsStatus,'INSUFFICIENT_EVIDENCE');
 assert.ok(r.dpsErrors.includes('DIVIDEND_NOT_APPROVED_BY_AGM'));
});
