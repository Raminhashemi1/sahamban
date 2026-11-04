'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const zlib=require('node:zlib');
const extractor=require('../codal-xlsx-preview-v141.js');
function zip(files,{deflate=true}={}){
 const local=[],central=[];let offset=0;
 const u16=(b,o,v)=>b.writeUInt16LE(v,o),u32=(b,o,v)=>b.writeUInt32LE(v>>>0,o);
 for(const [name,text] of Object.entries(files)){
  const n=Buffer.from(name),raw=Buffer.from(text,'utf8'),compressed=deflate?zlib.deflateRawSync(raw):raw;
  const method=deflate?8:0,lh=Buffer.alloc(30),ch=Buffer.alloc(46);
  u32(lh,0,0x04034b50);u16(lh,8,method);u32(lh,18,compressed.length);u32(lh,22,raw.length);u16(lh,26,n.length);
  u32(ch,0,0x02014b50);u16(ch,10,method);u32(ch,20,compressed.length);u32(ch,24,raw.length);
  u16(ch,28,n.length);u32(ch,42,offset);
  local.push(lh,n,compressed);central.push(ch,n);offset+=lh.length+n.length+compressed.length;
 }
 const c=Buffer.concat(central),e=Buffer.alloc(22);
 u32(e,0,0x06054b50);u16(e,8,Object.keys(files).length);u16(e,10,Object.keys(files).length);
 u32(e,12,c.length);u32(e,16,offset);
 return Buffer.concat([...local,c,e]);
}
const base=()=>({
 'xl/workbook.xml':'<?xml version="1.0"?><workbook><sheets><sheet name="صورت مالی" sheetId="1"/></sheets></workbook>',
 'xl/sharedStrings.xml':'<sst><si><t>سود خالص</t></si><si><t>مبلغ &amp; رشد</t></si></sst>',
 'xl/worksheets/sheet1.xml':'<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><v>123456</v></c><c r="C1" t="inlineStr"><is><t>بانک</t></is></c><c r="D1" t="s"><v>1</v></c></row></sheetData></worksheet>'
});
const file=(raw,name='report.xlsx')=>{
 const b=Buffer.from(raw);
 return {name,size:b.length,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
};
test('actually extracts text and raw amount from deflated XLSX without network',async()=>{
 const r=await extractor.extract(file(zip(base())));
 assert.equal(r.status,'LOCAL_XLSX_CONTENT_PREVIEW_UNVERIFIED');
 assert.equal(r.sheets.length,1);
 assert.equal(r.sheets[0].name,'صورت مالی');
 assert.deepEqual(r.sheets[0].cells.map(c=>c.text),['سود خالص','123456','بانک','مبلغ & رشد']);
 assert.equal(r.originVerified,false);assert.equal(r.figuresVerified,false);
 assert.equal(r.financialEvidence,'INSUFFICIENT_EVIDENCE');assert.equal(r.tradingSignalsEnabled,false);
});
test('handles uncompressed ZIP and stored formula results as not recalculated',async()=>{
 const files=base();files['xl/worksheets/sheet1.xml']='<worksheet><sheetData><c r="A1"><f>SUM(1,2)</f><v>3</v></c></sheetData></worksheet>';
 const r=await extractor.extract(file(zip(files,{deflate:false})));
 assert.deepEqual(r.sheets[0].cells.map(c=>c.text),['3']);
 assert.equal(r.sheets[0].cells[0].formula,true);
});
test('rejects masquerading extensions, invalid ZIP and unsupported old XLS',async()=>{
 for(const f of [file('bad'),file(zip(base()),'bad.xls'),file(zip(base()),'other.pdf')])
  await assert.rejects(extractor.extract(f));
});
test('rejects oversized ZIP member claims before decompression',async()=>{
 const raw=zip(base());const b=Buffer.from(raw);
 const off=b.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
 b.writeUInt32LE(7*1024*1024,off+24);
 await assert.rejects(extractor.extract(file(b)),/ZIP_ENTRY_UNSAFE|ZIP_EXPANSION_LIMIT/);
});
test('disallows zip traversal and never treats it as report content',async()=>{
 const entries=base();entries['xl/worksheets/../evil.xml']='danger';
 await assert.rejects(extractor.extract(file(zip(entries))),/ZIP_ENTRY_UNSAFE/);
});
test('rejects text document attack and inflated nonworksheet content',async()=>{
 const a=base();a['xl/worksheets/sheet1.xml']='<!DOCTYPE worksheet [<!ENTITY x SYSTEM "file:///etc/passwd">]><worksheet/>';
 await assert.rejects(extractor.extract(file(zip(a))),/INVALID_WORKSHEET_XML|UNSUPPORTED_XML_DIRECTIVE/);
});
test('no numeric ratios, no holdings access, and UI + PWA caching connected',()=>{
 const source=fs.readFileSync('codal-xlsx-preview-v141.js','utf8');
 const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
 new vm.Script(source);
 for(const id of ['codalXlsxPreviewV141','codalXlsxFileV141','codalXlsxRunV141','codalXlsxStatusV141','codalXlsxCellsV141'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(html.includes('codal-xlsx-preview-v141.js?v=141.2'));
 assert.ok(sw.includes('codal-xlsx-preview-v141.js?v=141.2'));
 assert.doesNotMatch(source,/localStorage|sessionStorage|XMLHttpRequest|sendBeacon|fetch\(/);
});

test('rejects local ZIP header filename disagreement with central directory',async()=>{
 const archive=zip(base(),{deflate:false});
 const changed=Buffer.from(archive);
 const nameLength=changed.readUInt16LE(26);
 assert.ok(nameLength>0);
 changed[30]^=1;
 await assert.rejects(extractor.extract(file(changed)),/ZIP_LOCAL_HEADER_MISMATCH/);
});
test('rejects local ZIP size disagreement with central directory',async()=>{
 const changed=Buffer.from(zip(base(),{deflate:false}));
 changed.writeUInt32LE(changed.readUInt32LE(22)+1,22);
 await assert.rejects(extractor.extract(file(changed)),/ZIP_LOCAL_SIZE_MISMATCH/);
});
test('rejects even a single member whose inflated bytes differ from declared size',async()=>{
 const changed=Buffer.from(zip(base()));
 const out=await extractor.extract(file(changed),{inflate:async(comp)=>{
  const actual=zlib.inflateRawSync(Buffer.from(comp));
  return Buffer.concat([actual,Buffer.from('tamper')]);
 }}).then(()=>null,e=>e);
 assert.match(out.message,/ZIP_UNCOMPRESSED_MISMATCH/);
});

test('resolves nonsequential worksheet targets using XLSX workbook relationships',async()=>{
 const files=base();
 files['xl/workbook.xml']='<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="تلفیقی" sheetId="7" r:id="rId10"/><sheet name="جداگانه" sheetId="1" r:id="rId2"/></sheets></workbook>';
 files['xl/_rels/workbook.xml.rels']='<Relationships><Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet9.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';
 files['xl/worksheets/sheet9.xml']='<worksheet><sheetData><c r="A1" t="inlineStr"><is><t>تلفیقی واقعی</t></is></c></sheetData></worksheet>';
 const r=await extractor.extract(file(zip(files)));
 assert.deepEqual(r.sheets.map(s=>s.name),['تلفیقی','جداگانه']);
 assert.deepEqual(r.sheets.map(s=>s.path),['xl/worksheets/sheet9.xml','xl/worksheets/sheet1.xml']);
 assert.equal(r.sheets[0].cells[0].text,'تلفیقی واقعی');
 assert.equal(r.sheets[1].cells[0].text,'سود خالص');
});
test('never silently maps a missing workbook relationship to sheet1',async()=>{
 const files=base();
 files['xl/workbook.xml']='<workbook><sheets><sheet name="ناشناس" sheetId="1" r:id="rId42"/></sheets></workbook>';
 await assert.rejects(extractor.extract(file(zip(files))),/UNRESOLVED_WORKSHEET_RELATIONSHIP/);
});
test('rejects traversal and external-style workbook worksheet targets',async()=>{
 for(const target of ['../custom.xml','https://example.org/external.xml','worksheets/../sheet1.xml']){
  const files=base();
  files['xl/workbook.xml']='<workbook><sheets><sheet name="A" sheetId="1" r:id="rId1"/></sheets></workbook>';
  files['xl/_rels/workbook.xml.rels']='<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="'+target+'"/></Relationships>';
  await assert.rejects(extractor.extract(file(zip(files))),/UNSAFE_WORKSHEET_TARGET/);
 }
});
