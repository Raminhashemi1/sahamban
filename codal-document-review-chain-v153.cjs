'use strict';
// Review-only composition: match CODAL search identity first, then compare file bytes.
// Never promote a metadata or byte match to original-document authenticity, figure
// verification, entry eligibility, or trading permission.
const {checkCodalSearchAssociation}=require('./codal-search-association-v153.cjs');
const {compareRemoteCodalFile}=require('./codal-remote-byte-corroboration-v152.cjs');
const {performance}=require('node:perf_hooks');
function fail(stage,reason){
 return {status:'CODAL_REVIEW_INSUFFICIENT',stage,reason,
  originVerified:false,figuresVerified:false,entryEligible:false,tradingSignalsEnabled:false};
}
async function reviewCodalDocumentChain(file,filing,{
 metadataFetcher=globalThis.fetch,documentFetcher=globalThis.fetch,timeoutMs=12000
}={}){
 // Budget both stages together. Separate 12-second allowances can otherwise
 // double the network-review deadline on a slow metadata response.
 const budget=Number.isInteger(timeoutMs)&&timeoutMs>=1&&timeoutMs<=12000?timeoutMs:12000;
 const started=performance.now();
 const remaining=()=>Math.floor(budget-(performance.now()-started));
 let metadata;
 try{
  metadata=await checkCodalSearchAssociation(filing,{fetcher:metadataFetcher,timeoutMs:budget});
 }catch{return fail('METADATA','UNEXPECTED_METADATA_ERROR');}
 if(metadata?.status!=='CODAL_SEARCH_METADATA_MATCH_REVIEW_ONLY')
  return fail('METADATA',metadata?.reason||'METADATA_ASSOCIATION_FAILED');
 if(typeof metadata.pdfUrl!=='string'||!metadata.pdfUrl)
  return fail('DOCUMENT','SEARCH_PDF_URL_UNAVAILABLE');
 const documentBudget=remaining();
 if(documentBudget<1)return fail('DOCUMENT','REVIEW_DEADLINE_EXCEEDED');
 // The report page is HTML. Only the PDF URL returned in the matched
 // CODAL search letter is eligible for byte-for-byte PDF comparison.
 const documentFiling={...filing,originalUrl:metadata.pdfUrl,reportUrl:metadata.pdfUrl};
 let bytes;
 try{
  bytes=await compareRemoteCodalFile(file,documentFiling,{fetcher:documentFetcher,timeoutMs:documentBudget});
 }catch{return fail('DOCUMENT','UNEXPECTED_DOCUMENT_ERROR');}
 if(bytes?.status!=='CODAL_REMOTE_BYTES_MATCH_REVIEW_ONLY')
  return fail('DOCUMENT',bytes?.reason||'DOCUMENT_BYTES_NOT_MATCHED');
 // The metadata points to a PDF endpoint; a matching XLS/XLSX container
 // must not be mislabeled as a verified PDF document.
 if(bytes.format!=='PDF')return fail('DOCUMENT','DOWNLOADED_FILE_NOT_PDF');
 if(remaining()<0)return fail('DOCUMENT','REVIEW_DEADLINE_EXCEEDED');
 if(metadata.tracingNo!==bytes.tracingNo||metadata.symbol!==bytes.symbol||
    metadata.pdfUrl!==bytes.reportUrl)
  return fail('CHAIN','METADATA_DOCUMENT_IDENTITY_MISMATCH');
 return {status:'CODAL_DOCUMENT_CHAIN_READY_FOR_MANUAL_REVIEW',
  symbol:metadata.symbol,tracingNo:metadata.tracingNo,letterSerial:metadata.letterSerial,
  published:metadata.published,reportUrl:metadata.reportUrl,documentUrl:metadata.pdfUrl,
  sha256:bytes.sha256,fileSizeBytes:bytes.fileSizeBytes,format:bytes.format,
  metadataStatus:metadata.status,documentStatus:bytes.status,
  originVerified:false,figuresVerified:false,entryEligible:false,tradingSignalsEnabled:false,
  note:'Two consistent observations only: a CODAL search response and matching hosted file bytes. Not an issuer signature, verified report contents, or a trading signal.'};
}
module.exports={reviewCodalDocumentChain};
