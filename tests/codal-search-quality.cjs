'use strict';
// Validate issuer metadata from the public CODAL search response.
// A validated search result is NOT a validated financial statement.
function normalizeSymbol(value) {
 return String(value ?? '').replace(/[\s\u200c\u200e\u200f\ufeff]/g,'')
 .replace(/ي/g,'ی').replace(/ك/g,'ک').toUpperCase();
}
function toAsciiDigits(value){
 return String(value??'').replace(/[۰-۹]/g,ch=>String(ch.charCodeAt(0)-1776))
 .replace(/[٠-٩]/g,ch=>String(ch.charCodeAt(0)-1632));
}
function validPublicationDate(value){
 const s=toAsciiDigits(value).trim();
 // CODAL uses local Jalali dates. Reject malformed and implausible values;
 // this checks metadata shape only, not authenticity of publication.
 const m=s.match(/^(13\d\d|14\d\d)[/\-](\d\d?)[/\-](\d\d?)(?:\s+(\d\d?):(\d\d)(?::(\d\d))?)?$/);
 if(!m)return false;
 if(m[4]!==undefined&&(Number(m[4])>23||Number(m[5])>59||(m[6]!==undefined&&Number(m[6])>59)))return false;
 const month=Number(m[2]),day=Number(m[3]);
 if(month<1||month>12||day<1||day>(month<=6?31:30))return false;
 if(month===12&&day===30){
  // Validate Esfand 30 against the Persian calendar instead of accepting it every year.
  try{
   const formatter=new Intl.DateTimeFormat('en-u-ca-persian-nu-latn',{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'});
   for(let d=18;d<=22;d++){
    const parts=Object.fromEntries(formatter.formatToParts(new Date(Date.UTC(Number(m[1])+622,2,d))).map(p=>[p.type,p.value]));
    if(parts.year===String(Number(m[1]))&&parts.month==='12'&&parts.day==='30')return true;
   }
  }catch{}
  return false;
 }
 return true;
}
function verifySearchMetadata(body,expectedSymbol){
 const total=Number(body?.Total),page=Number(body?.Page??1);
 if(!Number.isSafeInteger(total)||total<0||!Number.isSafeInteger(page)||page<1||
    !Array.isArray(body?.Letters)||body.Letters.length>100||
    body.Letters.length>total) {
  return {ok:false,status:'UNVERIFIED_SEARCH_SCHEMA',accepted:[],rejected:[]};
 }
 const target=normalizeSymbol(expectedSymbol);
 if(!target)return {ok:false,status:'UNVERIFIED_TARGET_SYMBOL',accepted:[],rejected:[]};
 const accepted=[],rejected=[],seen=new Set();
 for(const item of body.Letters){
  const symbol=normalizeSymbol(item?.Symbol);
  const title=String(item?.Title??'').trim();
  const tracing=toAsciiDigits(item?.TracingNo).trim();
  const publication=String(item?.PublishDateTime||item?.SentDateTime||'').trim();
  let reason='';
  if(symbol!==target)reason='SYMBOL_MISMATCH';
  else if(!title||title.length>500)reason='INVALID_TITLE';
  else if(!/^\d{1,20}$/.test(tracing)||BigInt(tracing)<=0n)reason='INVALID_TRACING';
  else if(!validPublicationDate(publication))reason='INVALID_PUBLICATION_DATE';
  else if(seen.has(tracing))reason='DUPLICATE_TRACING';
  if(reason)rejected.push({reason,symbol,tracing:tracing.slice(0,24)});
  else{
   seen.add(tracing);
   accepted.push({symbol,title:title.slice(0,240),tracing_no:tracing,
    publication_date:publication,has_excel:Boolean(item.HasExcel),has_pdf:Boolean(item.HasPdf)});
  }
 }
 const status=accepted.length?'SEARCH_METADATA_VALIDATED':
    body.Letters.length?'UNVERIFIED_NO_MATCHING_VALID_LETTERS':'UNVERIFIED_EMPTY_SEARCH';
 return {ok:accepted.length>0,status,total,page,accepted,rejected};
}
module.exports={normalizeSymbol,toAsciiDigits,validPublicationDate,verifySearchMetadata};
