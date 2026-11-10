'use strict';
/* Read-only integrity check for the optional single-day user-browser capture.
 * A matching SHA/URL does NOT independently authenticate provider transport
 * and does NOT verify price adjustment basis or authorize signals/trades. */
const {createHash}=require('node:crypto');
const HOST='https://cdn.tsetmc.com',MAX=131072;
const fail=reason=>Object.freeze({status:'SINGLE_DAY_NOT_VERIFIED',reason,
 byteIntegrityVerified:false,sourceAuthenticated:false,priceBasisVerified:false,
 entryEligible:false,tradingSignalsEnabled:false});
function reviewSingleDay({manifest,rawBytes}={}){
 if(!manifest||typeof manifest!=='object'||Array.isArray(manifest)||
  manifest.status!=='SINGLE_DAY_CAPTURE_FOR_REVIEW'||
  typeof manifest.insCode!=='string'||!/^\d{8,25}$/.test(manifest.insCode)||
  typeof manifest.dEven!=='string'||!/^20\d{6}$/.test(manifest.dEven)||
  manifest.host!==HOST||typeof manifest.collectedAt!=='string'||
  !Number.isFinite(Date.parse(manifest.collectedAt))||
  new Date(manifest.collectedAt).toISOString()!==manifest.collectedAt)
  return fail('INVALID_SINGLE_DAY_MANIFEST');
 const d=manifest.dEven,y=Number(d.slice(0,4)),m=Number(d.slice(4,6)),day=Number(d.slice(6));
 const calendar=new Date(Date.UTC(y,m-1,day,12));
 if(calendar.getUTCFullYear()!==y||calendar.getUTCMonth()+1!==m||calendar.getUTCDate()!==day)
  return fail('INVALID_EXPECTED_DATE');
 if(manifest.sourceAuthenticated!==false||manifest.priceBasisVerified!==false||
  manifest.threeModesVerified!==false||manifest.entryEligible!==false||
  manifest.tradingSignalsEnabled!==false)return fail('FORGED_APPROVAL');
 const expected=HOST+'/api/ClosingPrice/GetClosingPriceDaily/'+manifest.insCode+'/'+d;
 const name='tsetmc-single-'+manifest.insCode+'-'+d+'-'+manifest.collectedAt.replace(/[:.]/g,'-')+'.json';
 const file=manifest.file;
 if(manifest.sourceUrl!==expected||file?.filename!==name||
  typeof file.contentType!=='string'||!/^application\/json(?:\s*;|$)/.test(file.contentType))
  return fail('INVALID_SOURCE_METADATA');
 if(!Buffer.isBuffer(rawBytes)||rawBytes.length===0||rawBytes.length>MAX||
  file.sizeBytes!==rawBytes.length||!(/^[a-f0-9]{64}$/.test(file.sha256))||
  createHash('sha256').update(rawBytes).digest('hex')!==file.sha256)
  return fail('BYTE_INTEGRITY_MISMATCH');
 const raw=rawBytes.toString('utf8');
 if(!Buffer.from(raw,'utf8').equals(rawBytes))return fail('INVALID_UTF8');
 // Parse exact decimal instrument IDs as strings to prevent 17-digit rounding.
 const safeRaw=raw.replace(/("insCode"\s*:\s*)([0-9]+)(?=\s*[,}])/g,'$1"$2"');
 let data;try{data=JSON.parse(safeRaw);}catch{return fail('INVALID_JSON');}
 const row=data?.closingPriceDaily;
 if(!row||typeof row!=='object'||Array.isArray(row)||
  String(row.dEven)!==d||typeof row.pClosing!=='number'||
  !Number.isFinite(row.pClosing)||row.pClosing<=0)
  return fail('INVALID_PRICE_OR_DATE');
 if(Object.hasOwn(row,'insCode')&&String(row.insCode)!==manifest.insCode)
  return fail('INSTRUMENT_MISMATCH');
 return Object.freeze({status:'SINGLE_DAY_BYTES_MATCH_FOR_REVIEW',reason:null,
  insCode:manifest.insCode,dEven:d,closingPriceRial:row.pClosing,
  byteIntegrityVerified:true,sourceAuthenticated:false,priceBasisVerified:false,
  threeModesVerified:false,entryEligible:false,tradingSignalsEnabled:false,
  note:'Only original byte and declared URL consistency were checked, not provider authentication.'});
}
module.exports=Object.freeze({reviewSingleDay});
