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

test('minimum fundamental gate exposes descriptive quality ratios and fresh market multiples',()=>{
 const a=sample();
 Object.assign(a.fields,{
  revenue:{amount:8000,source_row:'درآمد عملیاتی',source_page:3},
  operating_profit:{amount:1600,source_row:'سود عملیاتی',source_page:4},
  net_income:{amount:1900,source_row:'سود خالص',source_page:5},
  total_assets:{amount:10000,source_row:'جمع دارایی‌ها',source_page:7},
  total_liabilities:{amount:6000,source_row:'جمع بدهی‌ها',source_page:7},
  equity:{amount:4000,source_row:'حقوق مالکانه',source_page:7},
  equity_attributable_to_parent:{amount:4000,source_row:'حقوق مالکانه قابل انتساب',source_page:7},
  operating_cash_flow:{amount:1000,source_row:'جریان نقد عملیاتی',source_page:9},
  shares_outstanding:{amount:100000000,unit:'SHARES',source_row:'تعداد سهام',source_page:2}
 });
 const r=evaluateFundamentalGate(a,'ونوین',{
  marketPriceEvidence:{status:'VERIFIED_MARKET_CLOSE',symbol:'ونوین',closeRialPerShare:1000,marketDate:'20261105',source:'VERIFIED_HISTORICAL_QUOTE_EVENT'},
  asOfDate:'20261106'
 });
 assert.equal(r.status,'FUNDAMENTAL_REVIEW_READY');
 assert.equal(r.financialRatios.ratios.operatingMarginPct,20);
 assert.equal(r.financialRatios.ratios.roePct,50);
 assert.equal(r.financialRatios.valuation.pe,50);
 assert.equal(r.financialRatios.valuation.pb,25);
 assert.equal(r.financialRatios.valuation.ps,12.5);
});
