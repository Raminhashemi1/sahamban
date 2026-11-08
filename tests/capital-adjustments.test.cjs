'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {calculateCapitalAdjustment}=require('../capital-adjustments.js');
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
 a.cum_rights_price=1000;a.subscription_price=800;
 const r=calculateCapitalAdjustment(a,'ونوین');
 assert.equal(r.status,'CAPITAL_ADJUSTMENT_READY_FOR_REVIEW');
 assert.equal(r.adjustment.theoreticalExRightsPrice,960);
 assert.equal(r.adjustment.historicalPriceMultiplier,0.96);
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
 const rights=sample();rights.action_type='RIGHTS_ISSUE';rights.cum_rights_price=0;rights.subscription_price=800;
 assert.ok(calculateCapitalAdjustment(rights,'ونوین').errors.includes('INVALID_RIGHTS_PRICING_INPUTS'));
});
test('capital action rejects unsupported type, invalid effective date and unsafe counts',()=>{
 const type=sample();type.action_type='CASH_DIVIDEND';
 assert.ok(calculateCapitalAdjustment(type,'ونوین').errors.includes('UNSUPPORTED_CAPITAL_ACTION'));
 const date=sample();date.effective_date='۱۴۰۵/۱۳/۰۱';
 assert.ok(calculateCapitalAdjustment(date,'ونوین').errors.includes('INVALID_EFFECTIVE_DATE'));
 const count=sample();count.pre_action_shares=Number.MAX_SAFE_INTEGER+1;
 assert.ok(calculateCapitalAdjustment(count,'ونوین').errors.includes('INVALID_ACTION_SHARE_COUNTS'));
});
