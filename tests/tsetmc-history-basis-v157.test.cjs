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
 assert.match(source,/quote:labelUnverifiedHistoricalBasis\(\{symbol:holding\.symbol,marketDate:historyEndDate,history:history\.slice\(-250\),insCode\}\)/);
 assert.match(source,/new CustomEvent\('sahamban:verified-historical-quotes-v50'/);
 assert.doesNotMatch(source,/historyPriceBasis:'RAW_UNADJUSTED'/);
});
