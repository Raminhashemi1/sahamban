'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('market-connectivity-test.html','utf8');
const start=html.indexOf(' function xmlDecode(');
const end=html.indexOf('\n const button=document.getElementById(\'codal-run\');',start);
assert.ok(start>=0&&end>start,'Codal response parser must exist in browser diagnostic');
const source=html.slice(start,end);
const sandbox={JSON,Number,String,RegExp,Error,Array,parseInt};
vm.createContext(sandbox);
vm.runInContext(source+';this.parseCodalSearchPayload=parseCodalSearchPayload;',sandbox);
const parse=sandbox.parseCodalSearchPayload;

test('parses valid JSON response and normalizes metadata',()=>{
 const body=parse(JSON.stringify({Total:1,Page:1,Letters:[{TracingNo:123,Symbol:'فولاد',Title:'صورت مالی',PublishDateTime:'1405/01/01',HasExcel:true}]}),'application/json');
 assert.equal(body.Total,1);assert.equal(body.Letters[0].Symbol,'فولاد');assert.equal(body.Letters[0].HasExcel,true);
});
test('parses XML CodalLetterHeaderDto response',()=>{
 const xml='<?xml version="1.0"?><SearchReportListDto><Total>1</Total><Page>1</Page><Letters><CodalLetterHeaderDto><TracingNo>123</TracingNo><Symbol>فولاد</Symbol><Title>صورت‌های مالی &amp; گزارش حسابرس</Title><PublishDateTime>1405/01/01 12:00:00</PublishDateTime><HasExcel>true</HasExcel><HasPdf>false</HasPdf></CodalLetterHeaderDto></Letters></SearchReportListDto>';
 const body=parse(xml,'application/xml');
 assert.equal(body.Total,1);assert.equal(body.Letters.length,1);assert.equal(body.Letters[0].TracingNo,'123');assert.equal(body.Letters[0].Title,'صورت‌های مالی & گزارش حسابرس');assert.equal(body.Letters[0].HasExcel,true);
});
test('parses namespaced XML and decodes numeric entities',()=>{
 const xml='<x:SearchReportListDto><x:Total>1</x:Total><x:CodalLetterHeaderDto><x:TracingNo>9</x:TracingNo><x:Symbol>ونوین</x:Symbol><x:Title>نماد &#160; بانکی</x:Title></x:CodalLetterHeaderDto></x:SearchReportListDto>';
 const body=parse(xml,'text/xml');
 assert.equal(body.Letters[0].Title,'نماد   بانکی');
});
test('rejects empty, malformed and unrelated responses',()=>{
 assert.throws(()=>parse('','application/json'),/خالی/);
 assert.throws(()=>parse('{bad','application/json'),/JSON/);
 assert.throws(()=>parse('<html>blocked</html>','text/html'),/ساختار پاسخ/);
 assert.throws(()=>parse('plain text','text/plain'),/نه JSON است و نه XML/);
});
