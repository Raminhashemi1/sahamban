'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {reviewCodalDocumentChain}=require('../codal-document-review-chain-v153.cjs');
const serial='qr1ypqX8jr8rIaRvVJxoNA==';
const report='https://www.codal.ir/Reports/Decision.aspx?LetterSerial=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&rt=3&let=6&ct=0&ft=-1';
const filing=()=>({symbol:'وبملت',tracingNo:'1278431',letterSerial:serial,published:'۱۴۰۳/۰۹/۱۴',reportUrl:report});
const doc=Buffer.from('%PDF-1.7\nsynthetic-original');
const file=()=>({name:'proof.pdf',size:doc.length,arrayBuffer:async()=>doc.buffer.slice(doc.byteOffset,doc.byteOffset+doc.byteLength)});
const pdfUrl='https://www.codal.ir/DownloadFile.aspx?hs=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&ft=1005&let=6';
const metadataUrl='https://search.codal.ir/api/search/v2/q?TracingNo=1278431';
const letter=()=>({TracingNo:1278431,Symbol:'وبملت',PublishDateTime:'۱۴۰۳/۰۹/۱۴ ۱۱:۲۲:۳۳',Url:'/Reports/Decision.aspx?LetterSerial=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&rt=3&let=6&ct=0&ft=-1',
 PdfUrl:'DownloadFile.aspx?hs=qr1ypqX8jr8rIaRvVJxoNA%3d%3d&ft=1005&let=6'});
function res(data,url,headers){
 const r=new Response(data,{status:200,headers});
 Object.defineProperty(r,'url',{value:url});
 return r;
}
const metadataFetcher=(url,opts)=>{
 assert.equal(url,metadataUrl);assert.equal(opts.redirect,'manual');
 return Promise.resolve(res(JSON.stringify({Letters:[letter()],Total:1,Page:1}),metadataUrl,{'content-type':'application/json'}));
};
const documentFetcher=(url,opts)=>{
 assert.equal(url,pdfUrl);assert.equal(opts.redirect,'manual');assert.equal(opts.credentials,'omit');
 return Promise.resolve(res(doc,pdfUrl,{'content-type':'application/pdf'}));
};
test('v153 review chain requires both distinct metadata and byte observations but never grants trust',async()=>{
 const result=await reviewCodalDocumentChain(file(),filing(),{metadataFetcher,documentFetcher});
 assert.equal(result.status,'CODAL_DOCUMENT_CHAIN_READY_FOR_MANUAL_REVIEW');
 assert.equal(result.metadataStatus,'CODAL_SEARCH_METADATA_MATCH_REVIEW_ONLY');
 assert.equal(result.documentStatus,'CODAL_REMOTE_BYTES_MATCH_REVIEW_ONLY');
 assert.equal(result.reportUrl,report);
 assert.equal(result.documentUrl,pdfUrl);
 for(const key of ['originVerified','figuresVerified','entryEligible','tradingSignalsEnabled'])
  assert.equal(result[key],false);
});
test('v153 blocks document download when metadata association fails',async()=>{
 let downloads=0;
 const rejected=await reviewCodalDocumentChain(file(),filing(),{
  metadataFetcher:async()=>res(JSON.stringify({Letters:[{...letter(),Symbol:'فولاد'}],Total:1,Page:1}),metadataUrl,{'content-type':'application/json'}),
  documentFetcher:async()=>{downloads++;return res(doc,pdfUrl);}
 });
 assert.equal(rejected.status,'CODAL_REVIEW_INSUFFICIENT');
 assert.equal(rejected.stage,'METADATA');
 assert.equal(rejected.reason,'SEARCH_FILING_IDENTITY_MISMATCH');
 assert.equal(downloads,0);assert.equal(rejected.entryEligible,false);
});
test('v153 rejects mismatched document bytes after a matching CODAL search response',async()=>{
 const result=await reviewCodalDocumentChain(file(),filing(),{
  metadataFetcher,
  documentFetcher:async()=>res(Buffer.from('%PDF-1.7\nsynthetic-changed!'),pdfUrl)
 });
 assert.equal(result.stage,'DOCUMENT');
 assert.equal(result.status,'CODAL_REVIEW_INSUFFICIENT');
 assert.equal(result.originVerified,false);
});
test('v153 fails closed on network errors in each stage',async()=>{
 const metaFail=await reviewCodalDocumentChain(file(),filing(),{
  metadataFetcher:async()=>{throw Error('offline')},documentFetcher
 });
 assert.equal(metaFail.stage,'METADATA');
 assert.equal(metaFail.tradingSignalsEnabled,false);
 const docFail=await reviewCodalDocumentChain(file(),filing(),{
  metadataFetcher,documentFetcher:async()=>{throw Error('offline')}
 });
 assert.equal(docFail.stage,'DOCUMENT');assert.equal(docFail.entryEligible,false);
});

test('v153 will not fetch a report HTML page as PDF or invent a missing download URL',async()=>{
 let attempted=0;
 const missingPdf={...letter(),PdfUrl:null};
 const metadata=async()=>res(JSON.stringify({Letters:[missingPdf],Total:1,Page:1}),metadataUrl,{'content-type':'application/json'});
 const result=await reviewCodalDocumentChain(file(),filing(),{
  metadataFetcher:metadata,documentFetcher:async()=>{attempted++;return res(doc,report);}
 });
 assert.equal(result.status,'CODAL_REVIEW_INSUFFICIENT');
 assert.equal(result.stage,'DOCUMENT');
 assert.equal(result.reason,'SEARCH_PDF_URL_UNAVAILABLE');
 assert.equal(attempted,0);
 assert.equal(result.entryEligible,false);
});
