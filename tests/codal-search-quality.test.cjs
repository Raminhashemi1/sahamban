'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {normalizeSymbol,validPublicationDate,verifySearchMetadata}=require('./codal-search-quality.cjs');
const letter=(overrides={})=>({Symbol:'ونوين',Title:'صورت‌های مالی میان‌دوره‌ای',TracingNo:12345,PublishDateTime:'۱۴۰۵/۰۸/۱۲ ۱۲:۳۰:۰۰',HasPdf:true,...overrides});
const body=(letters,total=letters.length)=>({Total:total,Page:1,Letters:letters});

test('validates exact symbol with Persian and Arabic digits',()=>{
 const r=verifySearchMetadata(body([letter()]),'ونوین');
 assert.equal(r.ok,true);assert.equal(r.status,'SEARCH_METADATA_VALIDATED');
 assert.equal(r.accepted[0].tracing_no,'12345');
 assert.equal(r.accepted[0].symbol,normalizeSymbol('ونوین'));
});
test('rejects wrong issuer rather than treating it as evidence',()=>{
 const r=verifySearchMetadata(body([letter({Symbol:'فولاد'})]),'ونوین');
 assert.equal(r.ok,false);assert.equal(r.rejected[0].reason,'SYMBOL_MISMATCH');
});
test('rejects absent tracing, title or publication date',()=>{
 for(const override of [{TracingNo:''},{Title:''},{PublishDateTime:'unknown'},{PublishDateTime:'۱۴۰۵/۱۳/۱۲'}]){
  const r=verifySearchMetadata(body([letter(override)]),'ونوین');
  assert.equal(r.ok,false);
 }
});
test('rejects duplicate tracing number while retaining unique valid rows',()=>{
 const r=verifySearchMetadata(body([letter(),letter({Title:'اصلاحیه'})]),'ونوین');
 assert.equal(r.accepted.length,1);assert.equal(r.rejected[0].reason,'DUPLICATE_TRACING');
});
test('requires plausible page, result count and structure',()=>{
 for(const value of [{Total:-1,Page:1,Letters:[]},{Total:1.5,Page:1,Letters:[]},{Total:0,Page:1,Letters:[letter()]},{Total:1,Page:0,Letters:[]}])
 assert.equal(verifySearchMetadata(value,'ونوین').status,'UNVERIFIED_SEARCH_SCHEMA');
});
test('an empty search is not falsely marked as connected financial evidence',()=>{
 const r=verifySearchMetadata(body([]),'ونوین');
 assert.equal(r.ok,false);assert.equal(r.status,'UNVERIFIED_EMPTY_SEARCH');
});
test('date metadata checks Jalali month/day bounds',()=>{
 assert.equal(validPublicationDate('۱۴۰۵/۰۸/۱۲ ۱۲:۳۰:۰۰'),true);
 assert.equal(validPublicationDate('1405/07/31'),false);
 assert.equal(validPublicationDate('1405/06/31'),true);
 assert.equal(validPublicationDate('1405/00/12'),false);
});
