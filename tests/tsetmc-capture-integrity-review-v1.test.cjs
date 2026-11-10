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

test('requires string instrument ID and TSETMC JSON content type metadata',()=>{
 const f=fixture();f.manifest.insCode=123456789012345;
 assert.equal(verify(f).reason,'INVALID_CAPTURE_MANIFEST');
 for(const bad of ['text/html','application/javascript',null,'APPLICATION/JSON']){
  const x=fixture();x.manifest.files.daily.contentType=bad;
  assert.equal(verify(x).reason,'INVALID_DAILY_CONTENT_TYPE');
 }
 const y=fixture();y.manifest.files.adjustments.contentType='text/plain';
 assert.equal(verify(y).reason,'INVALID_ADJUSTMENTS_CONTENT_TYPE');
});


test('browser Top=500 capture verifies bytes with explicitly limited historical scope',()=>{
 const f=fixture();
 f.manifest.captureScope='BOUNDED_DAILY_TOP_500';f.manifest.dailyTop=500;
 f.manifest.files.daily.url=f.manifest.files.daily.url.replace(/\/0$/,'/500');
 const r=verify(f);
 assert.equal(r.status,'RAW_BYTES_MATCH_MANIFEST_FOR_REVIEW');
 assert.equal(r.captureScope,'BOUNDED_DAILY_TOP_500');
 assert.equal(r.fullHistoryCaptured,false);
 assert.equal(r.sourceAuthenticated,false);
 assert.equal(r.historyPriceBasisVerified,false);
});
test('browser scope cannot be falsely marked full history or alter endpoint contract',()=>{
 const f=fixture();f.manifest.captureScope='BOUNDED_DAILY_TOP_500';f.manifest.dailyTop=500;
 assert.equal(verify(f).reason,'INVALID_DAILY_SOURCE_METADATA');
 const g=fixture();g.manifest.files.daily.url=g.manifest.files.daily.url.replace(/\/0$/,'/500');
 assert.equal(verify(g).reason,'INVALID_DAILY_SOURCE_METADATA');
 const h=fixture();h.manifest.captureScope='BOUNDED_DAILY_TOP_500';h.manifest.dailyTop=1000;
 assert.equal(verify(h).reason,'INVALID_CAPTURE_SCOPE');
 const j=fixture();j.manifest.captureScope='UNBOUNDED';j.manifest.dailyTop=0;
 assert.equal(verify(j).reason,'INVALID_CAPTURE_SCOPE');
});


test('real-format per-row instrument identity mismatch is rejected even with recomputed SHA',()=>{
 for(const kind of ['daily','adjustments']){
  const f=fixture(),field=kind==='daily'?'closingPriceDaily':'priceAdjust';
  const obj=JSON.parse(f[kind+'Bytes'].toString('utf8'));
  obj[field][0].insCode='99999999999999999';
  const bytes=Buffer.from(JSON.stringify(obj));
  f[kind+'Bytes']=bytes;f.manifest.files[kind].sizeBytes=bytes.length;
  f.manifest.files[kind].sha256=createHash('sha256').update(bytes).digest('hex');
  assert.equal(verify(f).reason,'ROW_INSTRUMENT_MISMATCH_'+kind.toUpperCase());
 }
});
test('matching string daily and JSON number adjustment IDs are reviewable, without authentication',()=>{
 const f=fixture();
 const daily=JSON.parse(f.dailyBytes),adjust=JSON.parse(f.adjustmentsBytes);
 daily.closingPriceDaily.forEach(row=>{row.insCode=insCode;});
 adjust.priceAdjust.forEach(row=>{row.insCode=Number(insCode);});
 for(const [kind,obj] of [['daily',daily],['adjustments',adjust]]){
  const bytes=Buffer.from(JSON.stringify(obj));f[kind+'Bytes']=bytes;
  f.manifest.files[kind].sizeBytes=bytes.length;
  f.manifest.files[kind].sha256=createHash('sha256').update(bytes).digest('hex');
 }
 const r=verify(f);
 assert.equal(r.status,'RAW_BYTES_MATCH_MANIFEST_FOR_REVIEW');
 assert.equal(r.sourceAuthenticated,false);
 assert.equal(r.tradingSignalsEnabled,false);
});


test('original 17-digit numeric JSON insCode lexeme is compared without JS precision loss',()=>{
 const f=fixture(),id='46348559193224090';
 f.manifest.insCode=id;
 for(const kind of ['daily','adjustments']){
  const field=kind==='daily'?'closingPriceDaily':'priceAdjust';
  const obj=JSON.parse(f[kind+'Bytes'].toString('utf8'));
  for(const row of obj[field])row.insCode=Number(id);
  // JSON.stringify rounds a 17-digit numeric ID; only the original literal is reliable.
  const raw=JSON.stringify(obj);
  const bytes=Buffer.from(raw);
  f[kind+'Bytes']=bytes;
  f.manifest.files[kind].filename=f.manifest.files[kind].filename.replace(insCode,id);
  f.manifest.files[kind].url=f.manifest.files[kind].url.replace(insCode,id);
  f.manifest.files[kind].sizeBytes=bytes.length;
  f.manifest.files[kind].sha256=createHash('sha256').update(bytes).digest('hex');
 }
 assert.equal(verify(f).status,'RAW_BYTES_MATCH_MANIFEST_FOR_REVIEW');
 const g=fixture();g.manifest.insCode=id;
 for(const kind of ['daily','adjustments']){
  const field=kind==='daily'?'closingPriceDaily':'priceAdjust';
  const obj=JSON.parse(g[kind+'Bytes'].toString('utf8'));
  for(const row of obj[field])row.insCode=Number(id);
  const raw=JSON.stringify(obj).replaceAll('"insCode":'+id,'"insCode":46348559193224091');
  const bytes=Buffer.from(raw);
  g[kind+'Bytes']=bytes;g.manifest.files[kind].filename=g.manifest.files[kind].filename.replace(insCode,id);
  g.manifest.files[kind].url=g.manifest.files[kind].url.replace(insCode,id);
  g.manifest.files[kind].sizeBytes=bytes.length;
  g.manifest.files[kind].sha256=createHash('sha256').update(bytes).digest('hex');
 }
 assert.equal(Number('46348559193224091'),Number(id));
 assert.equal(verify(g).reason,'RAW_INSTRUMENT_ID_MISMATCH_DAILY');
});
