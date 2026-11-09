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

test('CODAL opaque letter serial must be independent from numeric tracing number',()=>{
 const token='qr1ypqX8jr8rIaRvVJxoNA==';
 const report='https://www.codal.ir/Reports/Decision.aspx?LetterSerial=qr1ypqX8jr8rIaRvVJxoNA%3D%3D';
 const distinct=sample();distinct.report_url=report;distinct.letter_serial=token;
 assert.equal(checkFinancialEvidence(distinct,'ونوین').status,'READY_FOR_REVIEW');
 assert.equal(distinct.tracing_no,'۱۲۳۴۵');
 const mismatched={...distinct,letter_serial:'anotherValidToken123'};
 const bad=checkFinancialEvidence(mismatched,'ونوین');
 assert.equal(bad.status,'INSUFFICIENT_EVIDENCE');
 assert.ok(bad.errors.includes('REPORT_LETTER_SERIAL_MISMATCH'));
 assert.equal(bad.fields.length,0);
 const invalid={...distinct,letter_serial:'x'};
 assert.ok(checkFinancialEvidence(invalid,'ونوین').errors.includes('INVALID_LETTER_SERIAL'));
 const missing={...distinct,report_url:'https://www.codal.ir/Reports/Decision.aspx?OtherId=12345'};
 assert.ok(checkFinancialEvidence(missing,'ونوین').errors.includes('REPORT_LETTER_SERIAL_MISSING'));
 // Legacy records remain arithmetic-review only; missing declaration must
 // never be interpreted as independent CODAL origin or trading eligibility.
 const legacy=sample();
 assert.equal(checkFinancialEvidence(legacy,'ونوین').status,'READY_FOR_REVIEW');
 assert.equal(legacy.letter_serial,undefined);
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
 a.dividend_approval_source_row='مصوبه مجمع عمومی عادی';a.dividend_approval_source_page=11;
 a.dividend_record_date_source_row='تاریخ ثبت جهت دریافت سود نقدی';a.dividend_record_date_source_page=11;
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
 a.dividend_approval_source_row='پیشنهاد هیئت‌مدیره';a.dividend_approval_source_page=11;
 a.dividend_record_date_source_row='تاریخ ثبت پیشنهادی';a.dividend_record_date_source_page=11;
 a.fields.cash_dividend_approved_total={amount:1000,source_row:'پیشنهاد سود نقدی',source_page:12};
 a.fields.dividend_eligible_shares={amount:100000000,unit:'SHARES',source_row:'سهام مشمول',source_page:13};
 assert.ok(calculateDPS(a,'ونوین').errors.includes('DIVIDEND_NOT_APPROVED_BY_AGM'));
 a.dividend_status='APPROVED_BY_AGM';a.dividend_record_date='۱۴۰۵/۱۳/۰۱';
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
 assert.ok(calculateDPS(a,'ونوین').errors.includes('NEGATIVE_FINANCIAL_AMOUNT'));
 a.fields.cash_dividend_approved_total.amount=1000;a.fields.cash_dividend_approved_total.unit='IRR';
 assert.ok(calculateDPS(a,'ونوین').errors.includes('INVALID_FIELD_UNIT'));
});

test('DPS requires traceable AGM resolution and official record-date rows',()=>{
 const {calculateDPS}=require('../fundamental-evidence.js');
 const a=sample();a.dividend_status='APPROVED_BY_AGM';a.dividend_record_date='۱۴۰۵/۰۸/۱۰';
 a.fields.cash_dividend_approved_total={amount:1000,source_row:'سود نقدی مصوب',source_page:12};
 a.fields.dividend_eligible_shares={amount:100000000,unit:'SHARES',source_row:'سهام مشمول',source_page:13};
 assert.ok(calculateDPS(a,'ونوین').errors.includes('UNTRACEABLE_DIVIDEND_APPROVAL_OR_RECORD_DATE'));
 a.dividend_approval_source_row='مصوبه مجمع';a.dividend_approval_source_page=11;
 a.dividend_record_date_source_row='تاریخ ثبت';a.dividend_record_date_source_page=11;
 const r=calculateDPS(a,'ونوین');
 assert.equal(r.status,'DPS_READY_FOR_REVIEW');
 assert.equal(r.dps.approvalSource.page,11);
 assert.equal(r.dps.recordDateSource.page,11);
});

test('financial ratios disclose margins, returns, leverage and cash conversion from traceable fields',()=>{
 const {calculateFinancialRatios}=require('../fundamental-evidence.js');
 const a=sample();a.audit_status='AUDITED';a.statement_basis='CONSOLIDATED';
 a.fields={
  revenue:{amount:8000,source_row:'درآمدهای عملیاتی',source_page:3},
  operating_profit:{amount:1600,source_row:'سود عملیاتی',source_page:4},
  net_income:{amount:1900,source_row:'سود خالص',source_page:5},
  net_income_attributable_to_parent:{amount:2000,source_row:'سود قابل انتساب به مالکان اصلی',source_page:5},
  total_assets:{amount:10000,source_row:'جمع دارایی‌ها',source_page:7},
  total_liabilities:{amount:6000,source_row:'جمع بدهی‌ها',source_page:7},
  equity:{amount:4000,source_row:'حقوق مالکانه',source_page:7},
  equity_attributable_to_parent:{amount:4000,source_row:'حقوق مالکانه قابل انتساب به مالکان شرکت اصلی',source_page:7},
  operating_cash_flow:{amount:1000,source_row:'جریان نقد عملیاتی',source_page:9},
  shares_outstanding:{amount:100000000,unit:'SHARES',source_row:'تعداد سهام پایان دوره',source_page:2},
  weighted_average_shares:{amount:100000000,unit:'SHARES',source_row:'میانگین موزون سهام',source_page:2}
 };
 const price={status:'VERIFIED_MARKET_CLOSE',symbol:'ونوین',closeRialPerShare:1000,marketDate:'۱۴۰۵/۰۸/۱۱',source:'VERIFIED_DAILY_MARKET_HISTORY'};
 const r=calculateFinancialRatios(a,'ونوین',{marketPriceEvidence:price,asOfDate:'۱۴۰۵/۰۸/۱۲'});
 assert.equal(r.status,'FINANCIAL_RATIOS_READY_FOR_REVIEW');
 assert.equal(r.ratios.operatingMarginPct,20);
 assert.equal(r.ratios.netMarginPct,23.75);
 assert.equal(r.ratios.roePct,50);
 assert.equal(r.ratios.roaPct,19);
 assert.equal(r.ratios.liabilitiesToAssetsPct,60);
 assert.equal(r.ratios.liabilitiesToEquity,1.5);
 assert.ok(Math.abs(r.ratios.operatingCashFlowToNetIncome-(1000/1900))<1e-12);
 assert.equal(r.valuation.pe,null);
 assert.equal(r.valuation.pb,null);
 assert.equal(r.valuation.ps,null);
 assert.ok(r.flags.includes('PB_PS_REQUIRE_DATED_MARKET_SHARE_BASIS'));
 assert.ok(r.flags.includes('LOW_OPERATING_CASH_FLOW_CONVERSION'));
});
test('valuation multiples are withheld for stale, unverified or wrong-symbol market prices',()=>{
 const {calculateFinancialRatios}=require('../fundamental-evidence.js');
 const a=sample();a.fields.weighted_average_shares={amount:100000000,unit:'SHARES',source_row:'میانگین موزون',source_page:2};
 a.fields.net_income_attributable_to_parent={amount:2000,source_row:'سود منتسب',source_page:4};
 const price={status:'VERIFIED_MARKET_CLOSE',symbol:'ونوین',closeRialPerShare:1000,marketDate:'۱۴۰۵/۰۷/۰۱',source:'VERIFIED_DAILY_MARKET_HISTORY'};
 const stale=calculateFinancialRatios(a,'ونوین',{marketPriceEvidence:price,asOfDate:'۱۴۰۵/۰۸/۱۲'});
 assert.equal(stale.valuation.status,'INSUFFICIENT_MARKET_PRICE_EVIDENCE');
 const wrong=calculateFinancialRatios(a,'ونوین',{marketPriceEvidence:{...price,symbol:'فولاد',marketDate:'۱۴۰۵/۰۸/۱۱'},asOfDate:'۱۴۰۵/۰۸/۱۲'});
 assert.equal(wrong.valuation.status,'INSUFFICIENT_MARKET_PRICE_EVIDENCE');
 assert.ok(wrong.flags.includes('VALUATION_MULTIPLES_WITHHELD_STALE_OR_UNVERIFIED_PRICE'));
});

test('valuation multiples accept verified Gregorian market-history dates and reject future closes',()=>{
 const {calculateFinancialRatios}=require('../fundamental-evidence.js');
 const a=sample();a.fields.weighted_average_shares={amount:100000000,unit:'SHARES',source_row:'میانگین موزون',source_page:2};
 a.fields.net_income_attributable_to_parent={amount:2000,source_row:'سود منتسب',source_page:4};
 const base={status:'VERIFIED_MARKET_CLOSE',symbol:'ونوین',closeRialPerShare:1000,source:'VERIFIED_HISTORICAL_QUOTE_EVENT'};
 const ok=calculateFinancialRatios(a,'ونوین',{marketPriceEvidence:{...base,marketDate:'20261105'},asOfDate:'20261106'});
 assert.equal(ok.valuation.status,'VALUATION_MULTIPLES_READY_FOR_REVIEW');
 const future=calculateFinancialRatios(a,'ونوین',{marketPriceEvidence:{...base,marketDate:'20261107'},asOfDate:'20261106'});
 assert.equal(future.valuation.status,'INSUFFICIENT_MARKET_PRICE_EVIDENCE');
});

test('P/B and P/S require point-in-time share evidence without altering EPS or P/E',()=>{
 const {calculateFinancialRatios}=require('../fundamental-evidence.js');
 const a=sample();a.audit_status='AUDITED';a.statement_basis='STANDALONE';
 Object.assign(a.fields,{
  revenue:{amount:8000,source_row:'درآمد',source_page:4},
  equity:{amount:4000,source_row:'حقوق مالکانه',source_page:7},
  net_income_attributable_to_parent:{amount:2000,source_row:'سود منتسب',source_page:5},
  weighted_average_shares:{amount:100000000,unit:'SHARES',source_row:'میانگین موزون',source_page:3},
  shares_outstanding:{amount:100000000,unit:'SHARES',source_row:'تعداد پایان دوره',source_page:3}
 });
 const options={marketPriceEvidence:{status:'VERIFIED_MARKET_CLOSE',symbol:'ونوین',closeRialPerShare:1000,marketDate:'۱۴۰۵/۰۸/۱۱',source:'VERIFIED_DAILY_MARKET_HISTORY'},asOfDate:'۱۴۰۵/۰۸/۱۲'};
 const absent=calculateFinancialRatios(a,'ونوین',options);
 assert.equal(absent.valuation.pe,null);assert.equal(absent.valuation.pb,null);assert.equal(absent.valuation.ps,null);
 const basis={symbol:'ونوین',sharesOutstanding:200000000,unit:'SHARES',asOfDate:'۱۴۰۵/۰۸/۱۱',sourceRow:'تعداد سهام تاریخ قیمت',sourcePage:9};
 const valid=calculateFinancialRatios(a,'ونوین',{...options,valuationShareBasis:basis});
 assert.equal(valid.valuation.pe,null);assert.equal(valid.valuation.pb,50);assert.equal(valid.valuation.ps,null);
 assert.equal(valid.valuation.valuationSharesAsOfDate,'۱۴۰۵/۰۸/۱۱');
 for(const invalid of [{...basis,symbol:'فولاد'},{...basis,asOfDate:'۱۴۰۵/۰۸/۱۰'},{...basis,sourceRow:''},{...basis,sharesOutstanding:1.5}]){
  const bad=calculateFinancialRatios(a,'ونوین',{...options,valuationShareBasis:invalid});
  assert.equal(bad.valuation.pb,null);assert.equal(bad.valuation.ps,null);assert.equal(bad.valuation.pe,null);
 }
});

test('P/E and P/S only use complete 12-month financial flows; P/B remains a dated balance-sheet multiple',()=>{
 const {calculateFinancialRatios}=require('../fundamental-evidence.js');
 const a=sample();a.audit_status='AUDITED';a.statement_basis='STANDALONE';
 Object.assign(a.fields,{
  revenue:{amount:8000,source_row:'فروش',source_page:4},
  equity:{amount:4000,source_row:'حقوق مالکانه',source_page:7},
  net_income_attributable_to_parent:{amount:2000,source_row:'سود منتسب',source_page:5},
  weighted_average_shares:{amount:100000000,unit:'SHARES',source_row:'میانگین موزون',source_page:3}
 });
 const options={marketPriceEvidence:{status:'VERIFIED_MARKET_CLOSE',symbol:'ونوین',closeRialPerShare:1000,marketDate:'۱۴۰۵/۰۸/۱۱',source:'VERIFIED_DAILY_MARKET_HISTORY'},asOfDate:'۱۴۰۵/۰۸/۱۲',
  valuationShareBasis:{symbol:'ونوین',sharesOutstanding:200000000,unit:'SHARES',asOfDate:'۱۴۰۵/۰۸/۱۱',sourceRow:'تعداد سهام',sourcePage:9}};
 const interim=calculateFinancialRatios({...a,period_start:'۱۴۰۵/۰۱/۰۱'},'ونوین',options);
 assert.equal(interim.valuation.pe,null);assert.equal(interim.valuation.ps,null);
 assert.equal(interim.valuation.pb,50);
 assert.ok(interim.flags.includes('PE_PS_REQUIRE_COMPLETE_TWELVE_MONTH_EARNINGS_AND_REVENUE'));
 const annual=calculateFinancialRatios({...a,period_start:'۱۴۰۴/۰۷/۰۱'},'ونوین',options);
 assert.equal(annual.valuation.pe,50);assert.equal(annual.valuation.ps,25);assert.equal(annual.valuation.pb,50);
 assert.ok([365,366].includes(annual.valuation.financialFlowCoverageDays));
 const undocumented=calculateFinancialRatios(a,'ونوین',options);
 assert.equal(undocumented.valuation.pe,null);assert.equal(undocumented.valuation.ps,null);
 assert.equal(undocumented.valuation.pb,50);
});
