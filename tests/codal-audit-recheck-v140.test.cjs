'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const rows=require('../codal-source-rows-v139.js');
const recheck=require('../codal-audit-recheck-v140.js');
const orig=require('../codal-original-intake-v138.js');
const docBytes=Buffer.from('%PDF-1.7\nSYNTHETIC TEST DATA');
function file(bytes,name='codal.pdf'){
 const b=Buffer.from(bytes);return {size:b.length,name,
  arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
}
async function fixture(){
 const source=file(docBytes);
 const h=await orig.inspect(source,{symbol:'ونوین',tracingNo:'12345',published:'۱۴۰۵/۰۸/۱۳',
  reportUrl:'https://www.codal.ir/Reports/Decision.aspx?LetterSerial=12345'},{subtle:webcrypto.subtle});
 assert.equal(h.status,'LOCAL_FILE_FINGERPRINT_ONLY');
 const result=rows.auditPacket({fingerprint:h,periodEnd:'۱۴۰۵/۰۶/۳۱',unit:'MILLION_IRR',auditStatus:'UNAUDITED',
 statementBasis:'STANDALONE',rows:[{metric:'net_income',amount:'1234',page:'3',sourceRow:'سود خالص'}]});
 assert.equal(result.status,'LOCAL_ROW_REFERENCES_UNVERIFIED');
 return {packet:result.packet,source};
}
test('matching exact source bytes yields only local file match without authenticating anything',async()=>{
 const {packet,source}=await fixture();
 assert.equal(recheck.validate(packet).status,'PACKET_STRUCTURE_UNVERIFIED');
 const result=await recheck.recheck(packet,source,{subtle:webcrypto.subtle});
 assert.equal(result.status,'LOCAL_FILE_BYTES_MATCH');
 assert.equal(result.originVerified,false);assert.equal(result.originalDocumentRead,false);
 assert.equal(result.figuresVerified,false);assert.equal(result.financialEvidence,'INSUFFICIENT_EVIDENCE');
 assert.equal(result.tradingSignalsEnabled,false);
});
test('modified PDF of same size is rejected',async()=>{
 const {packet}=await fixture();
 const changed=Buffer.from(docBytes);changed[changed.length-1]^=1;
 const result=await recheck.recheck(packet,file(changed),{subtle:webcrypto.subtle});
 assert.equal(result.reason,'FILE_HASH_OR_FORMAT_MISMATCH');
});
test('different PDF length is rejected before hashing',async()=>{
 const {packet}=await fixture();
 const result=await recheck.recheck(packet,file('%PDF-1.5\ntiny'),{subtle:webcrypto.subtle});
 assert.equal(result.reason,'FILE_SIZE_MISMATCH');
});
test('malformed packet metadata and added fields cannot be accepted',async()=>{
 const {packet,source}=await fixture();
 for(const edit of [p=>p.fields[0].unit='IRR',
  p=>p.document.originVerified=true,p=>p.tradingSignalsEnabled=true,
  p=>p.fields[0].sourcePage=0,p=>p.extraSecrets='x',
  p=>p.fields[0].privateBroker='x',p=>p.document.sha256='f'.repeat(64)]){
  const changed=JSON.parse(JSON.stringify(packet));edit(changed);
  const r=await recheck.recheck(changed,source,{subtle:webcrypto.subtle});
  assert.equal(r.status,'UNVERIFIED_RECHECK_FAILED');
 }
});
test('even altered user-entered figures can pass source-byte match: numbers stay unverified',async()=>{
 const {packet,source}=await fixture();
 const newPacket=JSON.parse(JSON.stringify(packet));newPacket.fields[0].amount=8888;
 const result=await recheck.recheck(newPacket,source,{subtle:webcrypto.subtle});
 assert.equal(result.status,'LOCAL_FILE_BYTES_MATCH');
 assert.equal(result.figuresVerified,false);
 assert.equal(result.tradingSignalsEnabled,false);
 assert.equal(result.financialEvidence,'INSUFFICIENT_EVIDENCE');
});
test('missing/corrupt/oversize JSON fails before processing',async()=>{
 for(const fileObj of [null,{size:recheck.MAX_JSON_BYTES+1,text:async()=>'{ }'},
  {size:4,text:async()=>'{xxx'},{size:100,text:async()=>'{ }'}]){
  const r=await recheck.filePacket(fileObj);assert.ok(r.error);
 }
});
test('downloaded JSON parses with exact byte count',async()=>{
 const {packet}=await fixture();const t=JSON.stringify(packet);
 const f={size:Buffer.byteLength(t),text:async()=>t};
 const result=await recheck.filePacket(f);
 assert.equal(result.packet.schema,'sahamban.codal.row-audit.v1');
});
test('local UI is embedded without storage, network, or scripttag injections',()=>{
 const js=fs.readFileSync('codal-audit-recheck-v140.js','utf8');
 const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
 new vm.Script(js);
 for(const id of ['codalAuditJsonV140','codalAuditOriginalV140','codalAuditRecheckV140','codalAuditRecheckStatusV140'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('./codal-audit-recheck-v140.js?v=140.1'));
 const from=html.indexOf('<section class="card" id="codalRowsV139"');
 const inner=html.indexOf('<div class="card" id="codalAuditRecheckPanelV140"');
 const next=html.indexOf('<section class="card" id="decisionSupportV129"');
 assert.ok(from>=0 && from<inner && inner<next,'recheck must stay within the visible financial-row module');
 assert.ok(sw.includes('./codal-audit-recheck-v140.js?v=140.1'));
 assert.doesNotMatch(js,/localStorage|sessionStorage|XMLHttpRequest|sendBeacon|fetch\(|innerHTML/);
});

test('recheck canonicalization preserves optional AGM dividend evidence metadata',async()=>{
 const source=file(docBytes);
 const h=await orig.inspect(source,{symbol:'ونوین',tracingNo:'12345',published:'۱۴۰۵/۰۸/۱۳',
  reportUrl:'https://www.codal.ir/Reports/Decision.aspx?LetterSerial=12345'},{subtle:webcrypto.subtle});
 const result=rows.auditPacket({fingerprint:h,periodEnd:'۱۴۰۵/۰۶/۳۱',unit:'MILLION_IRR',auditStatus:'AUDITED',
  statementBasis:'STANDALONE',rows:[
   {metric:'cash_dividend_approved_total',amount:'1000',page:'8',sourceRow:'کل سود نقدی مصوب'},
   {metric:'dividend_eligible_shares',amount:'100000000',page:'9',sourceRow:'سهام مشمول دریافت سود'}
  ],dividendEvidence:{status:'APPROVED_BY_AGM',recordDate:'۱۴۰۵/۰۸/۱۰',
   approvalSourceRow:'مصوبه مجمع عمومی',approvalSourcePage:'10',
   recordDateSourceRow:'تاریخ ثبت دریافت سود',recordDateSourcePage:'11'}});
 assert.equal(result.status,'LOCAL_ROW_REFERENCES_UNVERIFIED');
 assert.equal(recheck.validate(result.packet).status,'PACKET_STRUCTURE_UNVERIFIED');
 const matched=await recheck.recheck(result.packet,source,{subtle:webcrypto.subtle});
 assert.equal(matched.status,'LOCAL_FILE_BYTES_MATCH');
 assert.equal(matched.figuresVerified,false);
});
