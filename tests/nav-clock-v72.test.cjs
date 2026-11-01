'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const pilot=fs.readFileSync('portfolio-pilot-v61.js','utf8');
const audit=fs.readFileSync('fund-nav-source-audit-v71.js','utf8');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const start=pilot.indexOf(' function parseFundNavClock('),end=pilot.indexOf(' async function verifiedCode(',start);
assert.ok(start>=0&&end>start,'NAV clock parser must be available for executable tests');
const parse=vm.runInNewContext(pilot.slice(start,end)+';parseFundNavClock',{Number,String,Error});
test('v72 accepts valid optional HHMMSS and zero-padded clock',()=>{
 assert.equal(parse(null),'');assert.equal(parse(undefined),'');assert.equal(parse(''),'');
 assert.equal(parse(93005),'09:30:05');assert.equal(parse('123456'),'12:34:56');assert.equal(parse('000000'),'00:00:00');
});
test('v72 rejects malformed, out-of-range and numeric-looking invalid clocks',()=>{
 for(const x of ['abc','12:30:00',' 1 234 ','236060','246000','1234567',-1,Infinity,{},'\\d123'])assert.throws(()=>parse(x),/ساعت NAV معتبر نیست/);
});
test('v72 connects clock parsing and verified source to the audit event',()=>{
 assert.ok(pilot.includes('const navClock=parseFundNavClock(fund.hEven);'));
 assert.ok(pilot.includes('fundNavTime:q.fundNavTime'));
 assert.ok(pilot.includes('lastTradeTime:q.lastTradeTime'));
 assert.match(audit,/ساعت آخرین معامله/);
 assert.match(audit,/هم‌زمانی مؤثر برای معامله را تضمین نمی‌کند/);
});
test('v72 bumps cache version for refreshed NAV source and pilot script',()=>{
 assert.ok(html.includes('portfolio-pilot-v61.js?v=61.12'));
 assert.ok(html.includes('fund-nav-source-audit-v71.js?v=71.2'));
 assert.ok(sw.includes('portfolio-pilot-v61.js?v=61.12'));
 assert.ok(sw.includes('fund-nav-source-audit-v71.js?v=71.2'));
 assert.ok(sw.includes('sahamban-static-v89-0'));
});
