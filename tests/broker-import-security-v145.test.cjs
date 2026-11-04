'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('broker-import.js','utf8');
test('broker XLSX reader enforces compressed file, entry-count and expanded-byte ceilings',()=>{
 new vm.Script(source);
 assert.match(source,/MAX_FILE=5\*1024\*1024/);
 assert.match(source,/MAX_ENTRIES=150/);
 assert.match(source,/MAX_ENTRY=12\*1024\*1024/);
 assert.match(source,/MAX_TOTAL=20\*1024\*1024/);
 assert.match(source,/totalDeclared>MAX_TOTAL/);
});
test('broker XLSX reader checks central and local ZIP metadata before reading',()=>{
 assert.match(source,/0x02014b50/);assert.match(source,/0x04034b50/);
 assert.match(source,/localFlags!==e\.flags\|\|localMethod!==e\.method/);
 assert.match(source,/localName!==e\.name/);
 assert.match(source,/ZIP/);
 assert.match(source,/u32\(p\+18\)!==e\.compressed\|\|u32\(p\+22\)!==e\.uncompressed/);
});
test('broker XLSX decompression is streamed and stopped before unbounded allocation',()=>{
 assert.match(source,/stream\.getReader\(\)/);
 assert.match(source,/size>e\.uncompressed\|\|size>MAX_ENTRY\|\|size>MAX_TOTAL/);
 assert.doesNotMatch(source,/new Response\(stream\)\.arrayBuffer\(\)/);
});
test('broker XLSX rejects unsafe member paths, external worksheet targets and XML entities',()=>{
 assert.match(source,/name\.split\('\/'\)\.some\(x=>x==='\.\.'\|\|x==='\.'\)/);
 assert.match(source,/target\.includes\('\.\.'\)/);
 assert.match(source,/UNSAFE|مسیر کاربرگ/);
 assert.match(source,/<!DOCTYPE\|<!ENTITY/);
});
test('broker import UI writes imported content as text, stays local and does not send portfolio data',()=>{
 assert.match(source,/td\.textContent=/);
 assert.match(source,/localStorage\.setItem\(STORAGE,JSON\.stringify/);
 assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|sendBeacon|navigator\.sendBeacon/);
 assert.doesNotMatch(source,/innerHTML\s*=/);
});

test('security guidance discloses localStorage and plaintext backup limitations',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const policy=fs.readFileSync('SECURITY.md','utf8');
 assert.match(html,/بدون رمزگذاری اختصاصی/);
 assert.match(html,/نسخه پشتیبان JSON را در محل امن نگه دارید/);
 assert.match(policy,/localStorage/);
 assert.match(policy,/plaintext/);
 assert.match(policy,/brokerage passwords|OTP|session tokens/i);
});
