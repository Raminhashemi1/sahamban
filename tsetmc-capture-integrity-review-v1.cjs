'use strict';
/* Review-only integrity verifier for the EXISTING PR #162 raw capture manifest.
 * This checks saved bytes vs manifest, not the provenance of their HTTPS source. */
const {createHash}=require('node:crypto');
const MAX_BYTES=1024*1024,HOST='https://cdn.tsetmc.com';
const fail=reason=>Object.freeze({status:'CAPTURE_NOT_VERIFIED',reason,
 byteIntegrityVerified:false,sourceAuthenticated:false,historyPriceBasisVerified:false,
 capitalActionsVerified:false,entryEligible:false,tradingSignalsEnabled:false});
const validDate=d=>{
 const s=String(d??'');
 if(!/^(19|20|21)\d{6}$/.test(s))return false;
 const y=+s.slice(0,4),m=+s.slice(4,6),day=+s.slice(6),dt=new Date(Date.UTC(y,m-1,day,12));
 return dt.getUTCFullYear()===y&&dt.getUTCMonth()+1===m&&dt.getUTCDate()===day;
};
function verifyTsetmcCapture({manifest,dailyBytes,adjustmentsBytes}={}){
 if(!manifest||typeof manifest!=='object'||Array.isArray(manifest)||
  manifest.status!=='CAPTURED_FOR_MANUAL_REVIEW'||typeof manifest.insCode!=='string'||!/^\d{8,25}$/.test(manifest.insCode)||
  /^0+$/.test(manifest.insCode)||manifest.host!==HOST||
  typeof manifest.collectedAt!=='string'||!Number.isFinite(Date.parse(manifest.collectedAt))||
  new Date(manifest.collectedAt).toISOString()!==manifest.collectedAt)
  return fail('INVALID_CAPTURE_MANIFEST');
 if(manifest.sourceAuthenticated!==false||manifest.priceBasisVerified!==false||
  manifest.capitalActionsVerified!==false||manifest.entryEligible!==false||
  manifest.tradingSignalsEnabled!==false)return fail('FORGED_AUTHORIZATION_FLAGS');
 const bounded=manifest.captureScope==='BOUNDED_DAILY_TOP_500'&&manifest.dailyTop===500;
 if((manifest.captureScope!==undefined||manifest.dailyTop!==undefined)&&!bounded)
  return fail('INVALID_CAPTURE_SCOPE');
 const counts={};let latestDailyDate=null;
 for(const [kind,bytes] of [['daily',dailyBytes],['adjustments',adjustmentsBytes]]){
  const meta=manifest.files?.[kind],field=kind==='daily'?'closingPriceDaily':'priceAdjust';
  if(!meta||typeof meta!=='object'||Array.isArray(meta))return fail('MISSING_'+kind.toUpperCase()+'_METADATA');
  const expected=HOST+(kind==='daily'
   ?'/api/ClosingPrice/GetClosingPriceDailyList/'+manifest.insCode+(bounded?'/500':'/0')
   :'/api/ClosingPrice/GetPriceAdjustList/'+manifest.insCode);
  const expectedFilename='tsetmc-'+manifest.insCode+'-'+manifest.collectedAt.replace(/[:.]/g,'-')+'-'+kind+'.json';
  if(typeof meta.contentType!=='string'||!/^application\/json(?:\s*;|$)/.test(meta.contentType)||meta.contentType!==meta.contentType.toLowerCase())
   return fail('INVALID_'+kind.toUpperCase()+'_CONTENT_TYPE');
  if(meta.url!==expected||typeof meta.filename!=='string'||meta.filename!==expectedFilename||
   !/^tsetmc-\d{8,25}-\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d-\d{3}Z-(?:daily|adjustments)\.json$/.test(meta.filename)||
   !meta.filename.startsWith('tsetmc-'+manifest.insCode+'-')||
   !meta.filename.endsWith('-'+kind+'.json'))return fail('INVALID_'+kind.toUpperCase()+'_SOURCE_METADATA');
  if(!Buffer.isBuffer(bytes)||bytes.length===0||bytes.length>MAX_BYTES||
   meta.sizeBytes!==bytes.length||typeof meta.sha256!=='string'||!/^[a-f0-9]{64}$/.test(meta.sha256)||
   createHash('sha256').update(bytes).digest('hex')!==meta.sha256)
   return fail('BYTE_INTEGRITY_MISMATCH_'+kind.toUpperCase());
  const raw=bytes.toString('utf8');
  if(!Buffer.from(raw,'utf8').equals(bytes))return fail('INVALID_UTF8_'+kind.toUpperCase());
  let data;try{data=JSON.parse(raw);}catch{return fail('INVALID_JSON_'+kind.toUpperCase());}
  const rows=data?.[field];if(!Array.isArray(rows)||rows.length>(kind==='daily'&&bounded?500:10000)||rows.length!==meta.rowCount)
   return fail('INVALID_ROWS_'+kind.toUpperCase());
  // The real provider uses JSON NUMBER insCode values larger than 2^53.
  // JSON.parse rounds those numbers. Compare their original decimal lexemes,
  // not rounded JS numbers; otherwise adjacent IDs could be treated as equal.
  const rawIds=[...raw.matchAll(/"insCode"\s*:\s*(?:"([0-9]+)"|([0-9]+))/g)]
   .map(match=>match[1]||match[2]);
  const rowIds=rows.filter(row=>row&&typeof row==='object'&&
   Object.prototype.hasOwnProperty.call(row,'insCode')).length;
  if(rawIds.length!==rowIds||rawIds.some(id=>id!==manifest.insCode))
   return fail('RAW_INSTRUMENT_ID_MISMATCH_'+kind.toUpperCase());
  const seen=new Set();
  for(const row of rows){
   if(!row||typeof row!=='object'||Array.isArray(row)||!validDate(row.dEven))
    return fail('INVALID_DATE_'+kind.toUpperCase());
   // For provider rows that carry an instrument ID, bind it to the exact
   // requested code. Adjustment endpoint responses can encode the ID as a
   // JSON number (precision-limited in JS); do not claim identity attestation.
   if(Object.prototype.hasOwnProperty.call(row,'insCode')&&
    (row.insCode===null||!/^\d{8,25}$/.test(String(row.insCode))||
     String(row.insCode)!==manifest.insCode))
    return fail('ROW_INSTRUMENT_MISMATCH_'+kind.toUpperCase());
   if(kind==='daily'){
    if(typeof row.pClosing!=='number'||!Number.isFinite(row.pClosing)||row.pClosing<=0)
     return fail('INVALID_DAILY_PRICE');
    const date=String(row.dEven);
    if(seen.has(date))return fail('DUPLICATE_DAILY_DATE');
    seen.add(date);
    if(latestDailyDate===null||date>latestDailyDate)latestDailyDate=date;
   }
  }
  counts[kind]=rows.length;
 }
 return Object.freeze({status:'RAW_BYTES_MATCH_MANIFEST_FOR_REVIEW',reason:null,
  insCode:manifest.insCode,checkedCaptureTime:manifest.collectedAt,
  rowCounts:Object.freeze(counts),latestDailyDate,
  captureScope:bounded?'BOUNDED_DAILY_TOP_500':'UNBOUNDED_DAILY_TOP_0',fullHistoryCaptured:!bounded,
  byteIntegrityVerified:true,sourceAuthenticated:false,
  historyPriceBasisVerified:false,capitalActionsVerified:false,
  entryEligible:false,tradingSignalsEnabled:false,
  note:'SHA-256 byte consistency and schema only: not independent source authentication, price adjustment, fresh history or trading authorization.'});
}
module.exports=Object.freeze({verifyTsetmcCapture});
