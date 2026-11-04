'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('market-connectivity-test.html','utf8');
const start=html.indexOf(' function codalReportUrl(');
const end=html.indexOf("\n const button=document.getElementById('codal-run');",start);
assert.ok(start>=0 && end>start,'Codal report link validator must be available');
const ctx={URL};vm.createContext(ctx);
vm.runInContext(html.slice(start,end)+'\nthis.safeLink=codalReportUrl;',ctx);
const safeLink=ctx.safeLink;
test('accepts Codal original report relative and explicit HTTPS urls',()=>{
 assert.equal(safeLink('/Reports/Decision.aspx?LetterSerial=123'),
  'https://www.codal.ir/Reports/Decision.aspx?LetterSerial=123');
 assert.equal(safeLink('https://codal.ir/Reports/Decision.aspx?LetterSerial=123'),
  'https://codal.ir/Reports/Decision.aspx?LetterSerial=123');
 assert.equal(safeLink('/DownloadFile.aspx?fileId=123'),
  'https://www.codal.ir/DownloadFile.aspx?fileId=123');
});
test('rejects external impostor domains, protocol-relative and non-HTTPS urls',()=>{
 for(const url of [
  'https://codal.ir.evil.example/Reports/Decision.aspx?x=1',
  'https://evil.example/Reports/Decision.aspx?x=1',
  '//evil.example/Reports/Decision.aspx?x=1',
  'http://codal.ir/Reports/Decision.aspx?x=1',
  'javascript:alert(1)',
  'data:text/html,test',
  'https://user:pass@codal.ir/Reports/Decision.aspx?x=1'
 ])assert.equal(safeLink(url),null,url);
});
test('rejects unrelated paths, credentials, whitespace and backslashes',()=>{
 for(const url of [
  '/some-other-path?next=1','/Reports/Decision.aspx','',
  'https://codal.ir/Reports/Decision.aspx?x=1\nunsafe',
  'https://codal.ir\\@evil.example/Reports/Decision.aspx?x=1',
  ' https://www.codal.ir/Reports/Decision.aspx?x=1 okay'
 ])assert.equal(safeLink(url),null,url);
});
test('link rendering does not use innerHTML and uses noopener',()=>{
 assert.match(html,/a\.rel='noopener noreferrer nofollow'/);
 assert.match(html,/a\.href=reportUrl/);
 assert.match(html,/a\.textContent='مشاهده اصل اطلاعیه/);
 assert.doesNotMatch(html,/innerHTML\s*=/);
});
