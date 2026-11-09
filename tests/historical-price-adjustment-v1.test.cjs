'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {calculateCapitalAdjustment}=require('../capital-adjustments.js');
const {adjustHistoricalPrice}=require('../historical-price-adjustment-v1.js');
const action=(patch={})=>calculateCapitalAdjustment({
 symbol:'ونوین',tracing_no:'۱۲۳۴۵',
 report_url:'https://www.codal.ir/Reports/Decision.aspx?LetterSerial=12345',
 effective_date:'۱۴۰۵/۰۴/۰۱',document_sha256:'a'.repeat(64),original_document_read:true,
 source_row:'مصوبه افزایش سرمایه',source_page:6,action_type:'BONUS_ISSUE',
 pre_action_shares:1000000,post_action_shares:1500000,...patch
},'ونوین');
const price=(patch={})=>({symbol:'ونوین',price:1200,unit:'IRR_PER_SHARE',
 priceType:'CLOSE',date:'۱۴۰۵/۰۳/۳۱',priceBasis:'RAW_UNADJUSTED',
 source:{provider:'TSETMC',recordId:'instrument-123/date-1405-03-31'},...patch});
test('applies a bonus factor once to a raw historical close and preserves source input',()=>{
 const raw=price(),before=JSON.stringify(raw);
 const r=adjustHistoricalPrice(raw,[action()],{expectedSymbol:'ونوین',asOfDate:'۱۴۰۵/۰۵/۰۱'});
 assert.equal(r.status,'HISTORICAL_PRICE_ADJUSTED_FOR_REVIEW');
 assert.equal(r.rawPrice,1200);
 assert.ok(Math.abs(r.adjustedPrice-800)<1e-9);
 assert.equal(r.cumulativeFactor,2/3);
 assert.equal(r.actionsApplied,1);
 assert.equal(JSON.stringify(raw),before);
});
test('does not apply actions effective on/before quote date or after the as-of date',()=>{
 const beforeQuote=action({effective_date:'۱۴۰۵/۰۳/۳۰',source_row:'رویداد پیش از قیمت'});
 const afterCutoff=action({effective_date:'۱۴۰۵/۰۵/۰۲',source_row:'رویداد آینده'});
 const r=adjustHistoricalPrice(price(),[beforeQuote,afterCutoff],{expectedSymbol:'ونوین',asOfDate:'۱۴۰۵/۰۵/۰۱'});
 assert.equal(r.status,'HISTORICAL_PRICE_ADJUSTED_FOR_REVIEW');
 assert.equal(r.adjustedPrice,1200);
 assert.equal(r.actionsApplied,0);
});
test('composes chronological factors and checks adjacent share-count continuity',()=>{
 const first=action();
 const second=action({effective_date:'۱۴۰۵/۰۵/۰۱',source_row:'مصوبه تجمیع سرمایه دوم',
  tracing_no:'۱۲۳۴۶',report_url:'https://www.codal.ir/Reports/Decision.aspx?LetterSerial=12346',
  action_type:'STOCK_SPLIT',pre_action_shares:1500000,post_action_shares:3000000});
 const r=adjustHistoricalPrice(price(),[second,first],{expectedSymbol:'ونوین',asOfDate:'۱۴۰۵/۰۶/۰۱'});
 assert.equal(r.actionsApplied,2);
 assert.ok(Math.abs(r.cumulativeFactor-(2/3*0.5))<1e-12);
 assert.ok(Math.abs(r.adjustedPrice-400)<1e-9);
 assert.ok(adjustHistoricalPrice(price(),[first,{...second,adjustment:{...second.adjustment,preActionShares:1400000}}],{expectedSymbol:'ونوین',asOfDate:'۱۴۰۵/۰۶/۰۱'}).errors.includes('CAPITAL_ACTION_SHARE_CHAIN_MISMATCH'));
});
test('rejects adjusted input to prevent accidental double application',()=>{
 const r=adjustHistoricalPrice(price({priceBasis:'CAPITAL_ACTION_ADJUSTED'}),[action()],{expectedSymbol:'ونوین',asOfDate:'۱۴۰۵/۰۵/۰۱'});
 assert.equal(r.status,'INSUFFICIENT_EVIDENCE');
 assert.ok(r.errors.includes('RAW_PRICE_BASIS_REQUIRED'));
});
test('rejects duplicate source replay, wrong issuer, and malformed provenance',()=>{
 const a=action();
 const duplicate={...a,adjustment:{...a.adjustment,effectiveDate:'۱۴۰۵/۰۵/۰۱',preActionShares:1500000,postActionShares:2000000}};
 assert.ok(adjustHistoricalPrice(price(),[a,duplicate],{expectedSymbol:'ونوین',asOfDate:'۱۴۰۵/۰۶/۰۱'}).errors.includes('DUPLICATE_CAPITAL_ACTION_SOURCE'));
 assert.ok(adjustHistoricalPrice(price(),[a],{expectedSymbol:'فولاد',asOfDate:'۱۴۰۵/۰۵/۰۱'}).errors.includes('PRICE_SYMBOL_MISMATCH'));
 assert.ok(adjustHistoricalPrice(price({source:null}),[a],{expectedSymbol:'ونوین',asOfDate:'۱۴۰۵/۰۵/۰۱'}).errors.includes('UNTRACEABLE_RAW_PRICE_SOURCE'));
});
test('rejects missing, future, invalid, or non-positive raw price inputs',()=>{
 assert.ok(adjustHistoricalPrice(null,[],{expectedSymbol:'ونوین',asOfDate:'۱۴۰۵/۰۵/۰۱'}).errors.includes('MISSING_RAW_PRICE_RECORD'));
 assert.ok(adjustHistoricalPrice(price({date:'۱۴۰۵/۰۵/۰۲'}),[],{expectedSymbol:'ونوین',asOfDate:'۱۴۰۵/۰۵/۰۱'}).errors.includes('INVALID_PRICE_OR_AS_OF_DATE'));
 assert.ok(adjustHistoricalPrice(price({price:0}),[],{expectedSymbol:'ونوین',asOfDate:'۱۴۰۵/۰۵/۰۱'}).errors.includes('INVALID_RAW_PRICE'));
});
