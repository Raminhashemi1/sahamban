'use strict';
/* v144: a reproducible final acceptance verdict; passing CI != verified CODAL data. */
const fs=require('node:fs');
const EXPECTED='https://excel.codal.ir/service/Excel/GetAll/OaYShM5Ay42fUq4E5eef5A%3D%3D/0';
const SPEC='sahamban.codal.final-acceptance.v1';
const EVIDENCE_NONE='INSUFFICIENT_EVIDENCE';
function assess({documentProbe,searchProbe,independentOriginProof,sourceCellChecks}={}){
 const doc=documentProbe&&typeof documentProbe==='object'?documentProbe:{};
 const search=searchProbe&&typeof searchProbe==='object'?searchProbe:{};
 const requiredSource=doc.source===EXPECTED;
 const downloaded=requiredSource&&doc.status==='OFFICIAL_URL_RESPONSE_HASHED_UNVERIFIED'&&
  Number.isSafeInteger(doc.bytes)&&doc.bytes>=8&&doc.bytes<=15*1024*1024&&
  /^[a-f0-9]{64}$/.test(doc.sha256||'')&&
  ['XLSX_OR_ZIP_UNINSPECTED','XLS_OLE_UNINSPECTED','PDF_UNINSPECTED'].includes(doc.contentFormat);
 // A secondary JSON artifact, even with a matching digest, is not an authenticated
 // response from CODAL. Never use a user/CI supplied boolean to certify origin.
 const networkSearchValid=search.status==='SEARCH_METADATA_VALIDATED';
 const originProofTrusted=false; // no authenticated, independently corroborated origin yet
 const cellsReviewed=Array.isArray(sourceCellChecks)&&sourceCellChecks.length>0&&sourceCellChecks.every(x=>
  x?.status==='LOCAL_XLSX_CELL_MATCH_UNVERIFIED'&&x.figuresVerified===false&&x.originVerified===false);
 const blocked=[];
 if(!downloaded)blocked.push('OFFICIAL_FILE_BYTES_UNAVAILABLE_OR_UNINSPECTED');
 if(!networkSearchValid)blocked.push('SEARCH_METADATA_NOT_LIVE_VERIFIED');
 if(!originProofTrusted)blocked.push('NO_INDEPENDENT_AUTHENTICATED_CODAL_ORIGIN');
 if(!cellsReviewed)blocked.push('ORIGINAL_FINANCIAL_ROWS_NOT_INDEPENDENTLY_VERIFIED');
 return {
  schema:SPEC,softwareAcceptance:'TESTED_SEPARATELY_BY_CI',
  liveDocumentAcceptance:'BLOCKED_EXTERNAL_EVIDENCE',
  documentTransport:downloaded?'HASHED_FROM_CONFIGURED_ENDPOINT_UNVERIFIED':'UNVERIFIED',
  searchMetadata:networkSearchValid?'SEARCH_METADATA_VALIDATED':'UNVERIFIED',
  originalReportVerified:false,originVerified:false,figuresVerified:false,
  financialEvidence:EVIDENCE_NONE,tradingSignalsEnabled:false,
  verificationBlockedBy:blocked,
  documentedFiling:{symbol:'ونوین',periodEnd:'۱۴۰۵/۰۶/۳۱',source:EXPECTED,
   discoveredFrom:'PUBLIC_SECONDARY_LISTING_UNVERIFIED'},
  note:'A successful GitHub job, an HTTP 200, a ZIP magic value or local cell match cannot certify official CODAL authenticity or financial figures.'
 };
}
function load(path){
 try{
  const stat=fs.statSync(path);
  if(stat.size<=0||stat.size>128*1024)return null;
  return JSON.parse(fs.readFileSync(path,'utf8'));
 }catch{return null;}
}
function main(){
 const verdict=assess({
  documentProbe:load('test-artifacts/codal-official-document-v143.json'),
  searchProbe:load('test-artifacts/codal-v136.json')
 });
 fs.mkdirSync('test-artifacts',{recursive:true});
 fs.writeFileSync('test-artifacts/codal-final-acceptance-v144.json',JSON.stringify({
  checkedAt:new Date().toISOString(),...verdict
 },null,2)+'\n');
 console.log('CODAL_FINAL_ACCEPTANCE: '+verdict.liveDocumentAcceptance);
 console.log('CODAL_BLOCKERS: '+verdict.verificationBlockedBy.join(','));
}
if(require.main===module)main();
module.exports={SPEC,EXPECTED,assess,load};
