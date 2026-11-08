'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {calculateCapitalAdjustment,calculateAdjustedWeightedAverageShares,calculateMultiActionWeightedAverageShares}=require('../capital-adjustments.js');
const sample=()=>({symbol:'ونوین',tracing_no:'۱۲۳۴۵',
 report_url:'https://www.codal.ir/Reports/Decision.aspx?LetterSerial=12345',
 effective_date:'۱۴۰۵/۰۸/۱۲',document_sha256:'b'.repeat(64),original_document_read:true,
 source_row:'مصوبه افزایش سرمایه',source_page:6,
 action_type:'BONUS_ISSUE',pre_action_shares:1000000,post_action_shares:1500000});
test('bonus issue returns historical price factor from pre/post share counts',()=>{
 const r=calculateCapitalAdjustment(sample(),'ونوین');
 assert.equal(r.status,'CAPITAL_ADJUSTMENT_READY_FOR_REVIEW');
 assert.equal(r.adjustment.shareCountMultiplier,1.5);
 assert.equal(r.adjustment.historicalPriceMultiplier,2/3);
 assert.equal(r.adjustment.theoreticalExRightsPrice,null);
});
test('stock split and reverse split use the correct direction',()=>{
 const split=sample();split.action_type='STOCK_SPLIT';split.post_action_shares=5000000;
 assert.equal(calculateCapitalAdjustment(split,'ونوین').adjustment.historicalPriceMultiplier,0.2);
 const reverse=sample();reverse.action_type='REVERSE_SPLIT';reverse.pre_action_shares=1000000;reverse.post_action_shares=100000;
 assert.equal(calculateCapitalAdjustment(reverse,'ونوین').adjustment.historicalPriceMultiplier,10);
});
test('rights issue calculates TERP and historical price multiplier',()=>{
 const a=sample();a.action_type='RIGHTS_ISSUE';a.pre_action_shares=1000000;a.post_action_shares=1250000;
 a.cum_rights_price=1000;a.subscription_price=800;a.cum_rights_price_date='۱۴۰۵/۰۸/۱۱';a.price_unit='IRR_PER_SHARE';
 a.cum_rights_price_source_row='قیمت پایانی سهم پیش از مجمع';a.cum_rights_price_source_page=4;
 a.subscription_price_source_row='قیمت پذیره‌نویسی حق‌تقدم';a.subscription_price_source_page=5;
 const r=calculateCapitalAdjustment(a,'ونوین');
 assert.equal(r.status,'CAPITAL_ADJUSTMENT_READY_FOR_REVIEW');
 assert.equal(r.adjustment.theoreticalExRightsPrice,960);
 assert.equal(r.adjustment.historicalPriceMultiplier,0.96);
 assert.ok(Math.abs(r.adjustment.epsRetrospectiveShareMultiplier-(1000/960))<1e-12);
 assert.equal(r.adjustment.newShares,250000);
});
test('capital action refuses missing or mismatched CODAL evidence',()=>{
 const badSerial=sample();badSerial.report_url='https://www.codal.ir/Reports/Decision.aspx?LetterSerial=999';
 assert.ok(calculateCapitalAdjustment(badSerial,'ونوین').errors.includes('REPORT_TRACING_MISMATCH'));
 const spoof=sample();spoof.report_url='https://codal.ir.attacker.test/Reports/Decision.aspx?LetterSerial=12345';
 assert.ok(calculateCapitalAdjustment(spoof,'ونوین').errors.includes('INVALID_REPORT_URL'));
 const noOriginal=sample();noOriginal.original_document_read=false;
 assert.ok(calculateCapitalAdjustment(noOriginal,'ونوین').errors.includes('ORIGINAL_DOCUMENT_NOT_READ'));
});
test('capital action rejects impossible share direction and invalid rights prices',()=>{
 const bonus=sample();bonus.post_action_shares=bonus.pre_action_shares;
 assert.ok(calculateCapitalAdjustment(bonus,'ونوین').errors.includes('POST_ACTION_SHARES_MUST_INCREASE'));
 const rights=sample();rights.action_type='RIGHTS_ISSUE';rights.cum_rights_price=0;rights.subscription_price=800;rights.cum_rights_price_date='۱۴۰۵/۰۸/۱۱';
 assert.ok(calculateCapitalAdjustment(rights,'ونوین').errors.includes('INVALID_RIGHTS_PRICING_INPUTS_OR_UNIT'));
});
test('capital action rejects unsupported type, invalid effective date and unsafe counts',()=>{
 const type=sample();type.action_type='CASH_DIVIDEND';
 assert.ok(calculateCapitalAdjustment(type,'ونوین').errors.includes('UNSUPPORTED_CAPITAL_ACTION'));
 const date=sample();date.effective_date='۱۴۰۵/۱۳/۰۱';
 assert.ok(calculateCapitalAdjustment(date,'ونوین').errors.includes('INVALID_EFFECTIVE_DATE'));
 const count=sample();count.pre_action_shares=Number.MAX_SAFE_INTEGER+1;
 assert.ok(calculateCapitalAdjustment(count,'ونوین').errors.includes('INVALID_ACTION_SHARE_COUNTS'));
});

test('EPS retrospective share multiplier differs from market-price factor for rights issue',()=>{
 const a=sample();a.action_type='RIGHTS_ISSUE';a.pre_action_shares=1000000;a.post_action_shares=1250000;
 a.cum_rights_price=1000;a.subscription_price=800;a.cum_rights_price_date='۱۴۰۵/۰۸/۱۱';a.price_unit='IRR_PER_SHARE';
 a.cum_rights_price_source_row='قیمت پایانی قبل از مجمع';a.cum_rights_price_source_page=4;
 a.subscription_price_source_row='قیمت پذیره‌نویسی';a.subscription_price_source_page=5;
 const r=calculateCapitalAdjustment(a,'ونوین');
 assert.equal(r.status,'CAPITAL_ADJUSTMENT_READY_FOR_REVIEW');
 assert.equal(r.adjustment.historicalPriceMultiplier,0.96);
 assert.ok(Math.abs(r.adjustment.epsRetrospectiveShareMultiplier-1.0416666666666667)<1e-12);
 assert.notEqual(r.adjustment.epsRetrospectiveShareMultiplier,r.adjustment.historicalPriceMultiplier);
});
test('rights issue refuses untraceable or wrongly denominated prices',()=>{
 const a=sample();a.action_type='RIGHTS_ISSUE';a.post_action_shares=1250000;
 a.cum_rights_price=1000;a.subscription_price=800;a.cum_rights_price_date='۱۴۰۵/۰۸/۱۱';a.price_unit='IRR';
 a.cum_rights_price_source_row='قیمت قبل';a.cum_rights_price_source_page=4;
 a.subscription_price_source_row='پذیره نویسی';a.subscription_price_source_page=5;
 assert.ok(calculateCapitalAdjustment(a,'ونوین').errors.includes('INVALID_RIGHTS_PRICING_INPUTS_OR_UNIT'));
 a.price_unit='IRR_PER_SHARE';a.cum_rights_price_source_page=0;
 assert.ok(calculateCapitalAdjustment(a,'ونوین').errors.includes('UNTRACEABLE_RIGHTS_PRICING_INPUTS'));
});
test('weighted-average EPS denominator retrospectively adjusts bonus shares and time-weights rights issues',()=>{
 const bonusData=sample();bonusData.effective_date='۱۴۰۵/۰۵/۱۲';
 const bonus=calculateCapitalAdjustment(bonusData,'ونوین');
 const b=calculateAdjustedWeightedAverageShares(bonus,{periodStart:'۱۴۰۵/۰۱/۰۱',periodEnd:'۱۴۰۵/۰۶/۳۱'});
 assert.equal(b.status,'CAPITAL_ADJUSTED_WA_SHARES_READY_FOR_REVIEW');
 assert.equal(b.weightedAverageShares,1500000);
 const rights=sample();rights.effective_date='۱۴۰۵/۰۵/۱۲';rights.action_type='RIGHTS_ISSUE';rights.pre_action_shares=1000000;rights.post_action_shares=1250000;
 rights.cum_rights_price=1000;rights.subscription_price=800;rights.cum_rights_price_date='۱۴۰۵/۰۵/۱۱';rights.price_unit='IRR_PER_SHARE';
 rights.cum_rights_price_source_row='قیمت قبل از مجمع';rights.cum_rights_price_source_page=4;
 rights.subscription_price_source_row='قیمت پذیره نویسی';rights.subscription_price_source_page=5;
 const action=calculateCapitalAdjustment(rights,'ونوین');
 const weighted=calculateAdjustedWeightedAverageShares(action,{periodStart:'۱۴۰۵/۰۱/۰۱',periodEnd:'۱۴۰۵/۰۶/۳۱'});
 assert.equal(weighted.status,'CAPITAL_ADJUSTED_WA_SHARES_READY_FOR_REVIEW');
 assert.equal(weighted.segments.length,2);
 assert.ok(Math.abs(weighted.segments[0].adjustedShares-(1000000*(1000/960)))<1e-7);
 assert.equal(weighted.segments[1].adjustedShares,1250000);
 assert.ok(weighted.weightedAverageShares>weighted.segments[0].adjustedShares&&weighted.weightedAverageShares<1250000);
 assert.equal(weighted.source.page,6);
});
test('weighted-average EPS denominator fails closed on invalid weights or action status',()=>{
 const action=calculateCapitalAdjustment(sample(),'ونوین');
 assert.equal(calculateAdjustedWeightedAverageShares(action,{periodStart:'۱۴۰۵/۰۱/۰۱'}).status,'INSUFFICIENT_EVIDENCE');
 assert.equal(calculateAdjustedWeightedAverageShares({status:'INSUFFICIENT_EVIDENCE'},{periodStart:'۱۴۰۵/۰۱/۰۱',periodEnd:'۱۴۰۵/۰۶/۳۱'}).status,'INSUFFICIENT_EVIDENCE');
});

test('EPS share adjustment refuses an action effective after the reporting period',()=>{
 const a=calculateCapitalAdjustment(sample(),'ونوین');
 const r=calculateAdjustedWeightedAverageShares(a,{periodStart:'۱۴۰۵/۰۱/۰۱',periodEnd:'۱۴۰۵/۰۶/۳۱'});
 assert.equal(r.status,'INSUFFICIENT_EVIDENCE');
 assert.ok(r.errors.includes('INVALID_ACTION_DATE_SHARE_COUNTS_OR_PROVENANCE'));
});

test('capital-adjusted weighted-average shares flow into EPS with issuer and period binding',()=>{
 const {calculateEPS}=require('../fundamental-evidence.js');
 const actionData=sample();actionData.effective_date='۱۴۰۵/۰۵/۱۲';
 const action=calculateCapitalAdjustment(actionData,'ونوین');
 const basis=calculateAdjustedWeightedAverageShares(action,{periodStart:'۱۴۰۵/۰۱/۰۱',periodEnd:'۱۴۰۵/۰۶/۳۱'});
 const financial={symbol:'ونوین',tracing_no:'۱۲۳۴۵',
  report_url:'https://www.codal.ir/Reports/Decision.aspx?LetterSerial=12345',
  publication_date:'۱۴۰۵/۰۸/۱۲',period_end:'۱۴۰۵/۰۶/۳۱',unit:'MILLION_IRR',
  audit_status:'AUDITED',statement_basis:'CONSOLIDATED',document_sha256:'c'.repeat(64),
  original_document_read:true,fields:{
   net_income_attributable_to_parent:{amount:2000,source_row:'سود قابل انتساب به مالکان اصلی',source_page:4}
  }};
 const eps=calculateEPS(financial,'ونوین',basis);
 assert.equal(eps.status,'EPS_READY_FOR_REVIEW');
 assert.ok(Math.abs(eps.eps.valueRialPerShare-(2000000000/1500000))<1e-9);
 assert.equal(eps.eps.shareBasisType,'CAPITAL_ACTION_SEQUENCE_RESTATED_WEIGHTED_AVERAGE_SHARES');
 assert.equal(eps.eps.capitalAdjustmentCount,1);
 assert.equal(eps.eps.capitalAdjustmentPeriodEnd,financial.period_end);
 const wrongSymbol=calculateEPS(financial,'ونوین',{...basis,symbol:'فولاد'});
 assert.ok(wrongSymbol.errors.includes('INVALID_OR_MISMATCHED_CAPITAL_ADJUSTED_SHARE_BASIS'));
 const wrongPeriod=calculateEPS(financial,'ونوین',{...basis,periodEnd:'۱۴۰۵/۰۳/۳۱'});
 assert.ok(wrongPeriod.errors.includes('INVALID_OR_MISMATCHED_CAPITAL_ADJUSTED_SHARE_BASIS'));
});

test('chronological bonus actions restate every earlier interval through all later factors',()=>{
 const a=sample();a.effective_date='۱۴۰۵/۰۴/۰۱';a.pre_action_shares=1000000;a.post_action_shares=1500000;
 const b=sample();b.effective_date='۱۴۰۵/۰۷/۰۱';b.pre_action_shares=1500000;b.post_action_shares=1800000;
 const first=calculateCapitalAdjustment(a,'ونوین'),second=calculateCapitalAdjustment(b,'ونوین');
 const r=calculateMultiActionWeightedAverageShares([first,second],{periodStart:'۱۴۰۵/۰۱/۰۱',periodEnd:'۱۴۰۵/۱۲/۲۹'});
 assert.equal(r.status,'CAPITAL_ADJUSTED_WA_SHARES_READY_FOR_REVIEW');
 assert.equal(r.actions.length,2);
 assert.equal(r.segments.length,3);
 assert.equal(r.segments.reduce((n,x)=>n+x.days,0),r.totalDays);
 assert.ok(r.segments.every(x=>Math.abs(x.adjustedShares-1800000)<1e-7));
 assert.ok(Math.abs(r.weightedAverageShares-1800000)<1e-7);
});
test('multi-action restatement rejects unordered, duplicate-date and broken share-count chains',()=>{
 const a=sample();a.effective_date='۱۴۰۵/۰۴/۰۱';a.pre_action_shares=1000000;a.post_action_shares=1500000;
 const b=sample();b.effective_date='۱۴۰۵/۰۷/۰۱';b.pre_action_shares=1500000;b.post_action_shares=1800000;
 const x=calculateCapitalAdjustment(a,'ونوین'),y=calculateCapitalAdjustment(b,'ونوین');
 assert.ok(calculateMultiActionWeightedAverageShares([y,x],{periodStart:'۱۴۰۵/۰۱/۰۱',periodEnd:'۱۴۰۵/۱۲/۲۹'}).errors.includes('CAPITAL_ACTIONS_NOT_STRICTLY_CHRONOLOGICAL'));
 const same={...b,effective_date:'۱۴۰۵/۰۴/۰۱'};
 const z=calculateCapitalAdjustment(same,'ونوین');
 assert.ok(calculateMultiActionWeightedAverageShares([x,z],{periodStart:'۱۴۰۵/۰۱/۰۱',periodEnd:'۱۴۰۵/۱۲/۲۹'}).errors.includes('CAPITAL_ACTIONS_NOT_STRICTLY_CHRONOLOGICAL'));
 const broken={...b,pre_action_shares:1400000};
 const q=calculateCapitalAdjustment(broken,'ونوین');
 assert.ok(calculateMultiActionWeightedAverageShares([x,q],{periodStart:'۱۴۰۵/۰۱/۰۱',periodEnd:'۱۴۰۵/۱۲/۲۹'}).errors.includes('CAPITAL_ACTION_SHARE_CHAIN_MISMATCH'));
});
test('multi-action EPS restatement is bound to same issuer and reporting period',()=>{
 const {calculateEPS}=require('../fundamental-evidence.js');
 const a=sample();a.effective_date='۱۴۰۵/۰۴/۰۱';a.pre_action_shares=1000000;a.post_action_shares=1500000;
 const b=sample();b.effective_date='۱۴۰۵/۰۷/۰۱';b.pre_action_shares=1500000;b.post_action_shares=1800000;
 const basis=calculateMultiActionWeightedAverageShares([calculateCapitalAdjustment(a,'ونوین'),calculateCapitalAdjustment(b,'ونوین')],{periodStart:'۱۴۰۵/۰۱/۰۱',periodEnd:'۱۴۰۵/۱۲/۲۹'});
 const financial={symbol:'ونوین',tracing_no:'۱۲۳۴۵',report_url:'https://www.codal.ir/Reports/Decision.aspx?LetterSerial=12345',
 publication_date:'۱۴۰۶/۰۱/۱۵',period_end:'۱۴۰۵/۱۲/۲۹',unit:'MILLION_IRR',audit_status:'AUDITED',
 statement_basis:'CONSOLIDATED',document_sha256:'d'.repeat(64),original_document_read:true,
 fields:{net_income_attributable_to_parent:{amount:3600,source_row:'سود خالص قابل انتساب',source_page:4}}};
 const eps=calculateEPS(financial,'ونوین',basis);
 assert.equal(eps.status,'EPS_READY_FOR_REVIEW');
 assert.equal(eps.eps.shareBasisType,'CAPITAL_ACTION_SEQUENCE_RESTATED_WEIGHTED_AVERAGE_SHARES');
 assert.equal(eps.eps.capitalAdjustmentCount,2);
 assert.ok(Math.abs(eps.eps.valueRialPerShare-2000)<1e-7);
 assert.ok(calculateEPS(financial,'ونوین',{...basis,symbol:'فولاد'}).errors.includes('INVALID_OR_MISMATCHED_CAPITAL_ADJUSTED_SHARE_BASIS'));
});

test('mixed bonus and rights actions compound only retrospective EPS factors for earlier segments',()=>{
 const bonus=sample();bonus.effective_date='۱۴۰۵/۰۴/۰۱';bonus.pre_action_shares=1000000;bonus.post_action_shares=1500000;
 const rights=sample();rights.effective_date='۱۴۰۵/۰۷/۰۱';rights.action_type='RIGHTS_ISSUE';
 rights.pre_action_shares=1500000;rights.post_action_shares=1875000;
 rights.cum_rights_price=1000;rights.subscription_price=800;rights.cum_rights_price_date='۱۴۰۵/۰۶/۳۱';rights.price_unit='IRR_PER_SHARE';
 rights.cum_rights_price_source_row='قیمت پایانی پیش از حق‌تقدم';rights.cum_rights_price_source_page=4;
 rights.subscription_price_source_row='قیمت پذیره‌نویسی حق‌تقدم';rights.subscription_price_source_page=5;
 const first=calculateCapitalAdjustment(bonus,'ونوین'),second=calculateCapitalAdjustment(rights,'ونوین');
 const r=calculateMultiActionWeightedAverageShares([first,second],{periodStart:'۱۴۰۵/۰۱/۰۱',periodEnd:'۱۴۰۵/۱۲/۲۹'});
 assert.equal(r.status,'CAPITAL_ADJUSTED_WA_SHARES_READY_FOR_REVIEW');
 assert.ok(Math.abs(r.segments[0].adjustedShares-1562500)<1e-7);
 assert.ok(Math.abs(r.segments[1].adjustedShares-1562500)<1e-7);
 assert.equal(r.segments[2].adjustedShares,1875000);
});

test('rights issue rejects cum-rights prices dated on or after the effective date or too far before it',()=>{
 const a=sample();a.action_type='RIGHTS_ISSUE';a.pre_action_shares=1000000;a.post_action_shares=1250000;
 a.cum_rights_price=1000;a.subscription_price=800;a.price_unit='IRR_PER_SHARE';
 a.cum_rights_price_source_row='قیمت پایانی';a.cum_rights_price_source_page=4;
 a.subscription_price_source_row='قیمت پذیره‌نویسی';a.subscription_price_source_page=5;
 a.cum_rights_price_date='۱۴۰۵/۰۸/۱۲';
 assert.ok(calculateCapitalAdjustment(a,'ونوین').errors.includes('INVALID_OR_STALE_CUM_RIGHTS_PRICE_DATE'));
 a.cum_rights_price_date='۱۴۰۵/۰۸/۰۱';
 assert.ok(calculateCapitalAdjustment(a,'ونوین').errors.includes('INVALID_OR_STALE_CUM_RIGHTS_PRICE_DATE'));
});
