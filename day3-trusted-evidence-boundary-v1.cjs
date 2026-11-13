'use strict';
// Day 3: fail-closed signer boundary. Trusted keys MUST be reviewed and pinned
// by maintainers in repository source, never supplied by browser/API input.
const {createHash,verify}=require('node:crypto');
const TRUSTED_REVIEWER_KEYS=Object.freeze({}); // intentionally unenrolled
const deny=reason=>Object.freeze({status:'NOT_INDEPENDENTLY_ATTESTED',reason,
 historyBasisAuthenticated:false,threeModesVerified:false,entryEligible:false,
 tradingSignalsEnabled:false,day3FinalAccepted:false});
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
function canonical(value){
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype)
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 throw new TypeError('UNSUPPORTED_CANONICAL_VALUE');
}
function attestPriceBasis({evidence,review,expectedInsCode,expectedDate,expectedDailySha256}={}){
 if(typeof expectedInsCode!=='string'||!/^[0-9]{8,25}$/.test(expectedInsCode)||
  typeof expectedDate!=='string'||!/^20[0-9]{6}$/.test(expectedDate)||!hex(expectedDailySha256))
  return deny('INVALID_CONTEXT');
 const validDay=value=>{
  if(typeof value!=='string'||!/^20[0-9]{6}$/.test(value))return false;
  const year=Number(value.slice(0,4)),month=Number(value.slice(4,6)),day=Number(value.slice(6,8));
  const checked=new Date(Date.UTC(year,month-1,day,12));
  return checked.getUTCFullYear()===year&&checked.getUTCMonth()+1===month&&checked.getUTCDate()===day;
 };
 if(!validDay(expectedDate))return deny('INVALID_CONTEXT');
 if(!evidence||evidence.insCode!==expectedInsCode||evidence.dailySha256!==expectedDailySha256||
  !Array.isArray(evidence.modes)||evidence.modes.length!==3)
  return deny('MISSING_OR_INVALID_THREE_MODE_EVIDENCE');
 const modes=new Map();
 for(const item of evidence.modes){
  const mode=String(item?.mode);
  if(!['0','1','2'].includes(mode)||modes.has(mode)||!hex(item?.sha256)||
   !Number.isSafeInteger(item?.rowCount)||item.rowCount<=0||
   !validDay(item.firstDate)||!validDay(item.lastDate)||
   item.firstDate>expectedDate||item.lastDate<expectedDate||
   item.firstDate>item.lastDate)
   return deny('MISSING_OR_INVALID_THREE_MODE_EVIDENCE');
  modes.set(mode,item);
 }
 const series=[modes.get('0'),modes.get('1'),modes.get('2')];
 if(new Set(series.map(x=>x.sha256)).size!==3||
  new Set(series.map(x=>x.rowCount)).size!==1||
  new Set(series.map(x=>x.firstDate)).size!==1||
  new Set(series.map(x=>x.lastDate)).size!==1)
  return deny('UNALIGNED_OR_RELABELED_PRICE_MODES');
 if(!review||typeof review.reviewerKeyId!=='string'||
  !Object.hasOwn(TRUSTED_REVIEWER_KEYS,review.reviewerKeyId))return deny('NO_TRUSTED_REVIEWER');
 if(review.insCode!==expectedInsCode||review.dailySha256!==expectedDailySha256||
  !(review.fromDate<=expectedDate&&expectedDate<=review.throughDate)||
  review.evidenceDigest!==createHash('sha256').update(canonical(evidence)).digest('hex'))
  return deny('REVIEW_SCOPE_MISMATCH');
 const from=Date.parse(review.verifiedAt),until=Date.parse(review.expiresAt);
 if(!Number.isFinite(from)||!Number.isFinite(until)||from>Date.now()||until<=Date.now()||until<=from)
  return deny('REVIEW_EXPIRED_OR_INVALID');
 if(typeof review.signature!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(review.signature))
  return deny('INVALID_SIGNATURE');
 const payload={...review};delete payload.signature;
 let ok=false;
 try{ok=verify(null,Buffer.from(canonical(payload)),TRUSTED_REVIEWER_KEYS[review.reviewerKeyId],
   Buffer.from(review.signature,'base64'));}catch{return deny('SIGNATURE_VERIFICATION_ERROR');}
 if(!ok)return deny('INVALID_SIGNATURE');
 return Object.freeze({status:'INDEPENDENTLY_ATTESTED',historyBasisAuthenticated:true,
  threeModesVerified:true,entryEligible:false,tradingSignalsEnabled:false,
  day3FinalAccepted:false,note:'Only price basis was reviewed; separate trade gates remain closed.'});
}
module.exports=Object.freeze({attestPriceBasis});
