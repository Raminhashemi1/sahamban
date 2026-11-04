'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assess,EXPECTED,SPEC}=require('./codal-final-acceptance-v144.cjs');
test('network failures are blocked, never a PASS despite green software CI',()=>{
 const r=assess({documentProbe:{source:EXPECTED,status:'UNVERIFIED_NETWORK'},
  searchProbe:{status:'UNVERIFIED_NETWORK'}});
 assert.equal(r.schema,SPEC);assert.equal(r.liveDocumentAcceptance,'BLOCKED_EXTERNAL_EVIDENCE');
 assert.equal(r.documentTransport,'UNVERIFIED');assert.equal(r.financialEvidence,'INSUFFICIENT_EVIDENCE');
 assert.equal(r.tradingSignalsEnabled,false);assert.equal(r.originalReportVerified,false);
 assert.equal(r.verificationBlockedBy.length,4);
});
test('even a successful bounded hash from configured URL is not document authenticity',()=>{
 const r=assess({documentProbe:{source:EXPECTED,status:'OFFICIAL_URL_RESPONSE_HASHED_UNVERIFIED',
  bytes:4096,contentFormat:'XLSX_OR_ZIP_UNINSPECTED',sha256:'a'.repeat(64)},
  searchProbe:{status:'SEARCH_METADATA_VALIDATED'},sourceCellChecks:[{
   status:'LOCAL_XLSX_CELL_MATCH_UNVERIFIED',figuresVerified:false,originVerified:false
  }],independentOriginProof:true});
 assert.equal(r.documentTransport,'HASHED_FROM_CONFIGURED_ENDPOINT_UNVERIFIED');
 assert.equal(r.liveDocumentAcceptance,'BLOCKED_EXTERNAL_EVIDENCE');
 assert.equal(r.figuresVerified,false);assert.equal(r.originVerified,false);
 assert.equal(r.financialEvidence,'INSUFFICIENT_EVIDENCE');
 assert.deepEqual(r.verificationBlockedBy,['NO_INDEPENDENT_AUTHENTICATED_CODAL_ORIGIN']);
});
test('tampered or wrong-source artifact cannot count as actual source bytes',()=>{
 for(const x of [{source:'https://fake.invalid',status:'OFFICIAL_URL_RESPONSE_HASHED_UNVERIFIED',
 sha256:'a'.repeat(64),bytes:1024,contentFormat:'XLSX_OR_ZIP_UNINSPECTED'},
 {source:EXPECTED,status:'OFFICIAL_URL_RESPONSE_HASHED_UNVERIFIED',sha256:'bad',bytes:1024,contentFormat:'XLSX_OR_ZIP_UNINSPECTED'},
 {source:EXPECTED,status:'OFFICIAL_URL_RESPONSE_HASHED_UNVERIFIED',sha256:'a'.repeat(64),bytes:1024,contentFormat:'HTML_OR_XML_UNINSPECTED'}]){
  assert.equal(assess({documentProbe:x}).documentTransport,'UNVERIFIED');
 }
});
test('no custom forged boolean or cell claim can promote financial readiness',()=>{
 const r=assess({documentProbe:{source:EXPECTED,status:'UNVERIFIED_NETWORK',originVerified:true,
  originalReportVerified:true,figuresVerified:true,tradingSignalsEnabled:true},
  sourceCellChecks:[{status:'LOCAL_XLSX_CELL_MATCH_UNVERIFIED',figuresVerified:true}]});
 assert.equal(r.tradingSignalsEnabled,false);
 assert.equal(r.originVerified,false);
 assert.equal(r.figuresVerified,false);
});
