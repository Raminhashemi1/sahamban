'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {reviewSingleDay:review}=require('../tsetmc-single-day-integrity-review-v1.cjs');
const insCode='46348559193224090',d='20261110',time='2026-11-10T10:40:12.123Z';
function fixture(){
 const rawBytes=Buffer.from('{"closingPriceDaily":{"dEven":20261110,"insCode":46348559193224090,"pClosing":4810}}');
 const manifest={status:'SINGLE_DAY_CAPTURE_FOR_REVIEW',insCode,dEven:d,collectedAt:time,
  host:'https://cdn.tsetmc.com',
  sourceUrl:'https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceDaily/'+insCode+'/'+d,
  file:{filename:'tsetmc-single-'+insCode+'-'+d+'-'+time.replace(/[:.]/g,'-')+'.json',
   sizeBytes:rawBytes.length,sha256:createHash('sha256').update(rawBytes).digest('hex'),
   contentType:'application/json; charset=utf-8'},
  sourceAuthenticated:false,priceBasisVerified:false,threeModesVerified:false,
  entryEligible:false,tradingSignalsEnabled:false};
 return {manifest,rawBytes};
}
test('exact matching dated response remains review-only',()=>{
 const r=review(fixture());
 assert.equal(r.status,'SINGLE_DAY_BYTES_MATCH_FOR_REVIEW');
 assert.equal(r.closingPriceRial,4810);
 assert.equal(r.sourceAuthenticated,false);
 assert.equal(r.priceBasisVerified,false);
 assert.equal(r.entryEligible,false);
 assert.equal(r.tradingSignalsEnabled,false);
});
test('wrong date is rejected even when bytes and manifest hash were recomputed',()=>{
 const f=fixture();f.rawBytes=Buffer.from(f.rawBytes.toString().replace('20261110','20261109'));
 f.manifest.file.sizeBytes=f.rawBytes.length;
 f.manifest.file.sha256=createHash('sha256').update(f.rawBytes).digest('hex');
 assert.equal(review(f).reason,'INVALID_PRICE_OR_DATE');
});
test('tampered original bytes are rejected',()=>{
 const f=fixture();f.rawBytes=Buffer.from(f.rawBytes.toString().replace('4810','4820'));
 assert.equal(review(f).reason,'BYTE_INTEGRITY_MISMATCH');
});
test('forged trading authorization and source URL cannot be accepted',()=>{
 const f=fixture();f.manifest.tradingSignalsEnabled=true;
 assert.equal(review(f).reason,'FORGED_APPROVAL');
 const g=fixture();g.manifest.sourceUrl='https://evil.example/'+d;
 assert.equal(review(g).reason,'INVALID_SOURCE_METADATA');
});
test('rounding collision cannot substitute a 17-digit instrument code',()=>{
 const f=fixture();f.rawBytes=Buffer.from(f.rawBytes.toString().replace(insCode,'46348559193224091'));
 f.manifest.file.sizeBytes=f.rawBytes.length;
 f.manifest.file.sha256=createHash('sha256').update(f.rawBytes).digest('hex');
 assert.equal(Number(insCode),Number('46348559193224091'));
 assert.equal(review(f).reason,'INSTRUMENT_MISMATCH');
});
test('missing and malformed responses fail closed',()=>{
 const f=fixture();f.rawBytes=null;
 assert.equal(review(f).status,'SINGLE_DAY_NOT_VERIFIED');
 const g=fixture();g.manifest.dEven='20260230';
 assert.equal(review(g).reason,'INVALID_EXPECTED_DATE');
});


test('mobile capture offers two distinct user-triggered downloads, not an automatic batch',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const html=fs.readFileSync(path.join(__dirname,'../tsetmc-single-day-evidence-capture.html'),'utf8');
 assert.match(html,/id="saveData"/);
 assert.match(html,/id="saveManifest"/);
 assert.match(html,/saveData\.onclick=/);
 assert.match(html,/saveManifest\.onclick=/);
 assert.doesNotMatch(html,/saveButton\.onclick=/);
 assert.ok(html.includes('GetClosingPriceDaily/'));
 assert.match(html,/sourceAuthenticated:false/);
});
