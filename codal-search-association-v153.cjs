'use strict';
// v153: corroborate a caller-supplied filing identity against the CODAL search
// API. This is a review-only observation, not authoritative document attestation.
const {verifiedUrl}=require('./codal-remote-byte-corroboration-v152.cjs');
const MAX_METADATA_BYTES=256*1024;
function fail(reason){return {status:'CODAL_METADATA_INSUFFICIENT',reason,
 originVerified:false,figuresVerified:false,entryEligible:false,tradingSignalsEnabled:false};}
function tokenFromUrl(value,key){
 if(typeof value!=='string'||!value||value.length>2048)return null;
 try{
  const u=new URL(value,'https://www.codal.ir/');
  if(u.protocol!=='https:'||!['codal.ir','www.codal.ir'].includes(u.hostname.toLowerCase())||
   u.username||u.password||u.port||u.hash)return null;
  if(key==='LetterSerial'&&!/^\/Reports\/[A-Za-z0-9._/-]+\.aspx$/i.test(u.pathname))return null;
  if(key==='hs'&&!/^(?:\/DownloadFile\.aspx|\/Reports\/DownloadFile\.aspx)$/i.test(u.pathname))return null;
  if(u.searchParams.getAll(key).length!==1)return null;
  const token=u.searchParams.get(key);
  return token&&/^[A-Za-z0-9+/_-]{8,128}={0,2}$/.test(token)?token:null;
 }catch{return null;}
}
function corroborateLetter(letters,identity){
 if(!Array.isArray(letters)||letters.length!==1)return fail('SEARCH_RESULT_NOT_UNIQUE');
 const letter=letters[0];
 if(!letter||typeof letter!=='object'||Array.isArray(letter))return fail('INVALID_SEARCH_LETTER');
 const tracing=String(letter.TracingNo);
 if(tracing!==identity.filing.tracingNo||letter.Symbol!==identity.filing.symbol)
  return fail('SEARCH_FILING_IDENTITY_MISMATCH');
 if(typeof letter.Url!=='string'||tokenFromUrl(letter.Url,'LetterSerial')!==identity.letterSerial)
  return fail('SEARCH_LETTER_SERIAL_MISMATCH');
 const expected=new URL(identity.url);
 if(expected.pathname.toLowerCase().endsWith('downloadfile.aspx')&&
  tokenFromUrl(letter.PdfUrl,'hs')!==identity.letterSerial)return fail('SEARCH_PDF_TOKEN_MISMATCH');
 if(typeof letter.PublishDateTime!=='string'||!letter.PublishDateTime.startsWith(identity.filing.published))
  return fail('SEARCH_PUBLICATION_DATE_MISMATCH');
 return {status:'CODAL_SEARCH_METADATA_MATCH_REVIEW_ONLY',
  symbol:identity.filing.symbol,tracingNo:identity.filing.tracingNo,
  letterSerial:identity.letterSerial,reportUrl:identity.url,
  published:identity.filing.published,
  originVerified:false,figuresVerified:false,entryEligible:false,tradingSignalsEnabled:false,
  note:'Exact metadata match against a CODAL search response only. This does not authenticate financial values, guarantee that the response was independently audited, or grant trading authority.'};
}
async function checkCodalSearchAssociation(filing,{fetcher=globalThis.fetch,timeoutMs=12000}={}){
 let identity;
 try{identity=verifiedUrl(filing);}catch{return fail('INVALID_FILING_URL');}
 if(!identity)return fail('INVALID_FILING_URL');
 if(typeof fetcher!=='function')return fail('FETCH_UNAVAILABLE');
 const deadline=Number.isInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=12000?timeoutMs:12000;
 let signal;
 try{if(typeof AbortSignal==='undefined'||typeof AbortSignal.timeout!=='function')return fail('TIMEOUT_UNAVAILABLE');
  signal=AbortSignal.timeout(deadline);
 }catch{return fail('TIMEOUT_UNAVAILABLE');}
 const query='https://search.codal.ir/api/search/v2/q?TracingNo='+encodeURIComponent(identity.filing.tracingNo);
 const expired=new Promise((_,reject)=>{
  const onAbort=()=>reject(new Error('METADATA_FETCH_TIMEOUT'));
  if(signal.aborted)onAbort();else signal.addEventListener('abort',onAbort,{once:true});
 });
 const within=p=>Promise.race([p,expired]);
 let response,reader;
 const discard=()=>{
  try{Promise.resolve(reader?reader.cancel():response?.body?.cancel?.()).catch(()=>{});}catch{}
 };
 try{
  response=await within(fetcher(query,{method:'GET',redirect:'manual',credentials:'omit',
   cache:'no-store',headers:{Accept:'application/json'},signal}));
  if(!response||response.status!==200||response.redirected===true||
    response.url!==query||!response.body||typeof response.body.getReader!=='function'){
   discard();return fail('BAD_SEARCH_HTTP_RESPONSE');
  }
  const len=response.headers?.get?.('content-length');
  if(len!==null&&len!==undefined&&(!/^\d+$/.test(len)||Number(len)>MAX_METADATA_BYTES)){
   discard();return fail('SEARCH_PAYLOAD_TOO_LARGE');
  }
  const type=response.headers?.get?.('content-type');
  if(typeof type!=='string'||!/^application\/json(?:\s*;|$)/i.test(type)){
   discard();return fail('SEARCH_CONTENT_TYPE_NOT_JSON');
  }
  reader=response.body.getReader();
  const chunks=[];let size=0;
  for(;;){
   const {done,value}=await within(reader.read());
   if(done)break;
   if(!(value instanceof Uint8Array)||!value.length)throw Error('BAD_SEARCH_CHUNK');
   size+=value.byteLength;
   if(size>MAX_METADATA_BYTES){discard();return fail('SEARCH_PAYLOAD_TOO_LARGE');}
   chunks.push(Buffer.from(value));
  }
  if(!size)return fail('EMPTY_SEARCH_RESPONSE');
  let data;
  try{data=JSON.parse(Buffer.concat(chunks,size).toString('utf8'));}
  catch{return fail('INVALID_SEARCH_JSON');}
  if(!data||typeof data!=='object'||Array.isArray(data)||data.IsAttacker===true)
   return fail('INVALID_SEARCH_RESPONSE');
  return corroborateLetter(data.Letters,identity);
 }catch{
  discard();
  return fail(signal.aborted?'SEARCH_DEADLINE_EXCEEDED':'SEARCH_FETCH_OR_PARSE_FAILED');
 }
}
module.exports={checkCodalSearchAssociation,MAX_METADATA_BYTES};
