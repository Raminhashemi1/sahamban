'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {verifyTsetmcCapture:verify}=require('../tsetmc-capture-integrity-review-v1.cjs');
const insCode='123456789012345',collectedAt='2026-11-10T07:12:30.123Z',stamp='2026-11-10T07-12-30-123Z';
function fixture(){
 const dailyBytes=Buffer.from(JSON.stringify({closingPriceDaily:[{dEven:20261109,pClosing:4000},{dEven:20261110,pClosing:4810}]}));
 const adjustmentsBytes=Buffer.from(JSON.stringify({priceAdjust:[{dEven:20261109,pClosing:4000,pClosingNotAdjusted:4000}]}));
 const meta=(kind,bytes,rows)=>({filename:'tsetmc-'+insCode+'-'+stamp+'-'+kind+'.json',
  url:'https://cdn.tsetmc.com/api/ClosingPrice/'+(kind==='daily'?'GetClosingPriceDailyList/'+insCode+'/0':'GetPriceAdjustList/'+insCode),
  sizeBytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),
  rowCount:rows,contentType:'application/json'});
 return {manifest:{status:'CAPTURED_FOR_MANUAL_REVIEW',insCode,collectedAt,host:'https://cdn.tsetmc.com',
  files:{daily:meta('daily',dailyBytes,2),adjustments:meta('adjustments',adjustmentsBytes,1)},
  sourceAuthenticated:false,priceBasisVerified:false,capitalActionsVerified:false,
  entryEligible:false,tradingSignalsEnabled:false},
  dailyBytes,adjustmentsBytes};
}
test('checks exact raw-byte integrity but never marks source or price basis attested',()=>{
 const r=verify(fixture());assert.equal(r.status,'RAW_BYTES_MATCH_MANIFEST_FOR_REVIEW');
 assert.equal(r.latestDailyDate,'20261110');assert.equal(r.byteIntegrityVerified,true);
 assert.equal(r.sourceAuthenticated,false);assert.equal(r.historyPriceBasisVerified,false);
 assert.equal(r.tradingSignalsEnabled,false);
});
test('tampered bytes fail even when valid JSON',()=>{
 const f=fixture();f.dailyBytes=Buffer.from(f.dailyBytes.toString().replace('4810','4820'));
 assert.equal(verify(f).reason,'BYTE_INTEGRITY_MISMATCH_DAILY');
});
test('tampered SHA, row count and size are rejected',()=>{
 const f=fixture();f.manifest.files.daily.sha256='0'.repeat(64);
 assert.equal(verify(f).reason,'BYTE_INTEGRITY_MISMATCH_DAILY');
 const g=fixture();g.manifest.files.daily.rowCount=4;
 assert.equal(verify(g).reason,'INVALID_ROWS_DAILY');
 const h=fixture();h.manifest.files.adjustments.sizeBytes=10000;
 assert.equal(verify(h).reason,'BYTE_INTEGRITY_MISMATCH_ADJUSTMENTS');
});
test('wrong endpoint, unexpected capture name and instrument mismatch fail',()=>{
 const f=fixture();f.manifest.files.daily.url='https://evil.example/api';
 assert.equal(verify(f).reason,'INVALID_DAILY_SOURCE_METADATA');
 const g=fixture();g.manifest.files.adjustments.filename='../example.json';
 assert.equal(verify(g).reason,'INVALID_ADJUSTMENTS_SOURCE_METADATA');
 const h=fixture();h.manifest.insCode='111111111111111';
 assert.equal(verify(h).reason,'INVALID_DAILY_SOURCE_METADATA');
});
test('caller cannot set claimed source or trading approval to true',()=>{
 for(const key of ['sourceAuthenticated','priceBasisVerified','capitalActionsVerified','entryEligible','tradingSignalsEnabled']){
  const f=fixture();f.manifest[key]=true;assert.equal(verify(f).reason,'FORGED_AUTHORIZATION_FLAGS');
 }
});
test('rejects duplicate/impossible dates and non-numeric daily closes',()=>{
 for(const data of [
  {closingPriceDaily:[{dEven:20260230,pClosing:100}]},
  {closingPriceDaily:[{dEven:20261110,pClosing:100},{dEven:20261110,pClosing:110}]},
  {closingPriceDaily:[{dEven:20261110,pClosing:'100'}]}
 ]){
  const f=fixture();f.dailyBytes=Buffer.from(JSON.stringify(data));
  f.manifest.files.daily.sizeBytes=f.dailyBytes.length;
  f.manifest.files.daily.sha256=createHash('sha256').update(f.dailyBytes).digest('hex');
  f.manifest.files.daily.rowCount=data.closingPriceDaily.length;
  assert.equal(verify(f).status,'CAPTURE_NOT_VERIFIED');
 }
});
test('rejects missing/non-Buffer, oversize or invalid capture manifests',()=>{
 const f=fixture();f.dailyBytes=null;assert.equal(verify(f).status,'CAPTURE_NOT_VERIFIED');
 const g=fixture();g.adjustmentsBytes=Buffer.alloc(1024*1024+1);assert.equal(verify(g).status,'CAPTURE_NOT_VERIFIED');
 const h=fixture();h.manifest.collectedAt='not-a-date';assert.equal(verify(h).reason,'INVALID_CAPTURE_MANIFEST');
});
test('does not mutate saved input metadata',()=>{
 const f=fixture(),before=JSON.stringify(f.manifest);verify(f);
 assert.equal(JSON.stringify(f.manifest),before);
});

test('manifest timestamp is bound to saved filenames and malformed timestamp types fail closed',()=>{
 const f=fixture();f.manifest.collectedAt='2026-11-10T07:12:31.123Z';
 assert.equal(verify(f).reason,'INVALID_DAILY_SOURCE_METADATA');
 const g=fixture();g.manifest.collectedAt=Symbol('not a date');
 assert.equal(verify(g).reason,'INVALID_CAPTURE_MANIFEST');
});
