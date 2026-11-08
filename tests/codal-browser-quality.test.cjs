'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('market-connectivity-test.html','utf8');
const start=html.indexOf(' function codalValidMetadata(');
const end=html.indexOf("\n const button=document.getElementById('codal-run');",start);
assert.ok(start>=0&&end>start,'Codal browser metadata validator is present');
const context={};vm.createContext(context);
vm.runInContext(html.slice(start,end)+'\nthis.check=codalValidMetadata;',context);
const check=context.check;
const item=(change={})=>({Symbol:'ونوين',Title:'صورت‌های مالی',TracingNo:'۱۲۳',PublishDateTime:'۱۴۰۵/۰۸/۱۲ ۱۱:۲۰:۰۰',...change});
const body=(letters)=>({Total:letters.length,Page:1,Letters:letters});
test('browser accepts exact issuer after Arabic/Persian normalization',()=>{
 const r=check(body([item()]),'ونوین');
 assert.equal(r.status,'SEARCH_METADATA_VALIDATED');assert.equal(r.items.length,1);
});
test('browser rejects unrelated symbol, absent tracing and bad date',()=>{
 for(const overrides of [{Symbol:'فولاد'},{TracingNo:''},{PublishDateTime:'۱۴۰۵/۱۳/۱۲'}]){
  const r=check(body([item(overrides)]),'ونوین');
  assert.notEqual(r.status,'SEARCH_METADATA_VALIDATED');
 }
});
test('browser prevents repeated tracing numbers from inflating matching letters',()=>{
 const r=check(body([item(),item()]),'ونوین');
 assert.equal(r.items.length,1);assert.equal(r.rejected[0],'DUPLICATE_TRACING');
});
test('browser treats empty responses as unverified',()=>{
 assert.equal(check(body([]),'ونوین').status,'UNVERIFIED_EMPTY_SEARCH');
});

test('browser accepts Esfand 30 only in Persian leap years',()=>{
 assert.equal(check(body([item({PublishDateTime:'۱۴۰۳/۱۲/۳۰'})]),'ونوین').status,'SEARCH_METADATA_VALIDATED');
 assert.notEqual(check(body([item({PublishDateTime:'۱۴۰۵/۱۲/۳۰'})]),'ونوین').status,'SEARCH_METADATA_VALIDATED');
 assert.equal(check(body([item({PublishDateTime:'۱۴۰۵/۱۲/۲۹'})]),'ونوین').status,'SEARCH_METADATA_VALIDATED');
});
test('browser validator covers the 1399 to 1400 leap-year boundary',()=>{
 assert.equal(check(body([item({PublishDateTime:'۱۳۹۹/۱۲/۳۰'})]),'ونوین').status,'SEARCH_METADATA_VALIDATED');
 assert.notEqual(check(body([item({PublishDateTime:'۱۴۰۰/۱۲/۳۰'})]),'ونوین').status,'SEARCH_METADATA_VALIDATED');
});
test('browser rejects impossible CODAL publication clock times',()=>{
 for(const value of ['۱۴۰۵/۰۸/۱۲ ۲۴:۰۰','۱۴۰۵/۰۸/۱۲ ۱۲:۶۰','۱۴۰۵/۰۸/۱۲ ۱۲:۳۰:۶۰'])assert.notEqual(check(body([item({PublishDateTime:value})]),'ونوین').status,'SEARCH_METADATA_VALIDATED');
 assert.equal(check(body([item({PublishDateTime:'۱۴۰۵/۰۸/۱۲ ۲۳:۵۹:۵۹'})]),'ونوین').status,'SEARCH_METADATA_VALIDATED');
});
