'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {compare}=require('../codal-xlsx-match-v142.js');
const source=()=>({status:'LOCAL_XLSX_CONTENT_PREVIEW_UNVERIFIED',sheets:[
 {name:'صورت مالی',cells:[{cell:'A1',text:'سود خالص'},{cell:'B1',text:'123456.50'},{cell:'C1',text:'بانک'}]}]});
const claim=()=>({sheetIndex:'۱',labelCell:'a1',valueCell:'B1',expectedLabel:'سود خالص',expectedAmount:'۱۲۳۴۵۶.۵۰'});
test('exact worksheet cells match user-entered label and number without certifying financial evidence',()=>{
 const r=compare(source(),claim());
 assert.equal(r.status,'LOCAL_XLSX_CELL_MATCH_UNVERIFIED');
 assert.equal(r.sheet,'صورت مالی');assert.equal(r.valueCell,'B1');
 assert.equal(r.figuresVerified,false);assert.equal(r.originVerified,false);
 assert.equal(r.tradingSignalsEnabled,false);assert.equal(r.financialEvidence,'INSUFFICIENT_EVIDENCE');
});
test('changed numbers, dates or labels do not match',()=>{
 for(const patch of [{expectedAmount:'123456.40'},{expectedLabel:'دارایی'},
  {sheetIndex:'2'},{labelCell:'Z20000'},{valueCell:'A1'}]){
  const r=compare(source(),{...claim(),...patch});assert.notEqual(r.status,'LOCAL_XLSX_CELL_MATCH_UNVERIFIED');
 }
});
test('unsupported formats and ambiguous numbers fail closed',()=>{
 for(const amount of ['1,234.50','12e3','Infinity','','١٢٬٣٤٥']){
  assert.notEqual(compare(source(),{...claim(),expectedAmount:amount}).status,'LOCAL_XLSX_CELL_MATCH_UNVERIFIED');
 }
});
test('missing source preview never matches',()=>{
 assert.equal(compare(null,claim()).status,'LOCAL_CELL_MATCH_UNVERIFIED_FAILED');
});
test('browser UI and local cache available without portfolio or external network access',()=>{
 const code=fs.readFileSync('codal-xlsx-match-v142.js','utf8');
 const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
 new vm.Script(code);
 for(const id of ['codalXlsxCompareV142','codalXlsxSheetV142','codalXlsxLabelCellV142','codalXlsxValueCellV142','codalXlsxExpectedLabelV142','codalXlsxExpectedAmountV142','codalXlsxCompareStatusV142'])
 assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(sw.includes('codal-xlsx-match-v142.js?v=142.0'));
 assert.ok(html.indexOf('codal-xlsx-preview-v141.js?v=141.1')<html.indexOf('codal-xlsx-match-v142.js?v=142.0'));
 assert.doesNotMatch(code,/localStorage|sessionStorage|XMLHttpRequest|sendBeacon|fetch\(/);
});
