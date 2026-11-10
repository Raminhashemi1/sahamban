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

test('a missing or malformed response instrument ID is never accepted',()=>{
 for(const raw of [
  '{"closingPriceDaily":{"dEven":20261110,"pClosing":4810}}',
  '{"closingPriceDaily":{"dEven":20261110,"insCode":null,"pClosing":4810}}',
  '{"closingPriceDaily":{"dEven":20261110,"insCode":true,"pClosing":4810}}',
  '{"closingPriceDaily":{"dEven":20261110,"insCode":"4634855919322409X","pClosing":4810}}'
 ]){
  const f=fixture();f.rawBytes=Buffer.from(raw);
  f.manifest.file.sizeBytes=f.rawBytes.length;
  f.manifest.file.sha256=createHash('sha256').update(f.rawBytes).digest('hex');
  assert.equal(review(f).reason,'INSTRUMENT_MISMATCH');
 }
});
test('the exact 17-digit identity is accepted as numeric token or exact decimal string',()=>{
 const f=fixture();
 const g=fixture();g.rawBytes=Buffer.from(g.rawBytes.toString().replace('"insCode":'+insCode,'"insCode":"'+insCode+'"'));
 g.manifest.file.sizeBytes=g.rawBytes.length;
 g.manifest.file.sha256=createHash('sha256').update(g.rawBytes).digest('hex');
 assert.equal(review(f).status,'SINGLE_DAY_BYTES_MATCH_FOR_REVIEW');
 assert.equal(review(g).status,'SINGLE_DAY_BYTES_MATCH_FOR_REVIEW');
});
\n\ntest('duplicate JSON identity, date, price, and envelope keys are rejected as ambiguous',()=>{\n const cases=[\n  ['"insCode":46348559193224090,"insCode":46348559193224090','DUPLICATE_INSCODE_FIELDS'],\n  ['"dEven":20261110,"dEven":20261110','DUPLICATE_DEVEN_FIELDS'],\n  ['"pClosing":4810,"pClosing":4810','DUPLICATE_PCLOSING_FIELDS'],\n  ['"closingPriceDaily":{},"closingPriceDaily":{}','DUPLICATE_CLOSINGPRICEDAILY_FIELDS']\n ];\n for(const [fragment,reason] of cases){\n  const f=fixture();\n  if(fragment.startsWith('"closingPriceDaily"'))\n   f.rawBytes=Buffer.from('{"closingPriceDaily":{},"closingPriceDaily":{}}');\n  else {\n   const raw=f.rawBytes.toString().replace('"insCode":46348559193224090,"pClosing":4810',fragment);\n   f.rawBytes=Buffer.from(raw);\n  }\n  f.manifest.file.sizeBytes=f.rawBytes.length;\n  f.manifest.file.sha256=createHash('sha256').update(f.rawBytes).digest('hex');\n  assert.equal(review(f).reason,reason);\n }\n});\n