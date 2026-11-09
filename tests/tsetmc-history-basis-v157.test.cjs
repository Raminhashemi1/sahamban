'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('portfolio-pilot-v61.js','utf8');
const start=source.indexOf(' function labelUnverifiedHistoricalBasis(quote){');
const end=source.indexOf(' // Independent historical-series flow:',start);
assert.ok(start>=0&&end>start,'basis tagging function must exist');
const label=vm.runInNewContext(source.slice(start,end)+'\nlabelUnverifiedHistoricalBasis',{String,Error});

test('TSETMC daily history is always explicitly labeled basis UNKNOWN, not RAW',()=>{
 const history=[{date:'20261102',close:1200,tradedValue:10}];
 const quote={symbol:'ونوین',insCode:'123456789012345',history,historyPriceBasis:'RAW_UNADJUSTED',
  capitalAdjustmentAllowed:true};
 const copy=JSON.stringify(quote);
 const tagged=label(quote);
 assert.equal(tagged.historyPriceBasis,'UNKNOWN_NOT_ATTESTED');
 assert.equal(tagged.historyPriceBasisEvidence,'NOT_ESTABLISHED');
 assert.equal(tagged.capitalAdjustmentAllowed,false);
 assert.equal(tagged.historicalPriceSource.adjustmentBasis,'UNKNOWN_NOT_ATTESTED');
 assert.equal(tagged.historicalPriceSource.provider,'TSETMC');
 assert.equal(tagged.historicalPriceSource.priceField,'pClosing');
 assert.equal(tagged.historicalPriceSource.dateCalendar,'GREGORIAN_YYYYMMDD');
 assert.equal(tagged.historicalPriceSource.endpoint,'/ClosingPrice/GetClosingPriceDailyList/123456789012345/0');
 assert.equal(JSON.stringify(quote),copy,'must not mutate original historical quote');
 assert.equal(tagged.history,history,'do not rewrite market history');
});
test('rejects unverifiable instrument codes instead of assigning source metadata',()=>{
 for(const insCode of ['123','not-a-code','123456789012345?next=1','','0'.repeat(26)]){
  assert.throws(()=>label({insCode,history:[]}),/شناسه ابزار/);
 }
});
test('pilot historical event uses the tagged quote, without relabeling as verified raw prices',()=>{
 assert.match(source,/quote:labelUnverifiedHistoricalBasis\(\{/);
 assert.match(source,/historyCalendarConversion:\{/);
 assert.match(source,/calendarConversionStatus=startJalali&&endJalali\?'CALENDAR_ONLY_CONVERTED':'CONVERSION_UNAVAILABLE'/);
 assert.match(source,/new CustomEvent\('sahamban:verified-historical-quotes-v50'/);
 assert.doesNotMatch(source,/historyPriceBasis:'RAW_UNADJUSTED'/);
});

test('Gregorian TSETMC market dates convert to Jalali labels at Nowruz without changing calendar basis',()=>{
 const start=source.indexOf(' function marketGregorianToJalali(day){');
 const end=source.indexOf(' // A daily history response contains pClosing',start);
 assert.ok(start>=0&&end>start);
 const convert=vm.runInNewContext(source.slice(start,end)+'\nmarketGregorianToJalali',{Date,Intl,Object,Number,String});
 for(const [marketDay,expected] of [
  ['20260320','1404/12/29'],
  ['20260321','1405/01/01'],
  ['20261109','1405/08/18'],
  ['20240229','1402/12/10']
 ]){
  assert.equal(convert(marketDay),expected,marketDay);
 }
 for(const invalid of ['20260229','20261301','20260011','20261131','14050818','2026-11-09','2026110912',''])assert.equal(convert(invalid),null,invalid);
});
test('calendar conversion fails closed when runtime lacks Persian calendar support',()=>{
 const start=source.indexOf(' function marketGregorianToJalali(day){');
 const end=source.indexOf(' // A daily history response contains pClosing',start);
 const intl={DateTimeFormat:class {resolvedOptions(){return {calendar:'gregory'}};formatToParts(){return []}}};
 const convert=vm.runInNewContext(source.slice(start,end)+'\nmarketGregorianToJalali',{Date,Intl:intl,Object,Number,String});
 assert.equal(convert('20260321'),null);
});
