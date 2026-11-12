'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {auditCsv}=require('../tools/audit-gheshdab-price-csv.cjs');
const h=['نماد','تاریخ شمسی','قیمت پایانی (ریال)','قیمت پایانی روز قبل (ریال)','قیمت پایانی تعدیل‌شده (ریال)','ضریب تعدیل','تعداد معاملات'];
const f='0.1135760990';
const rows=[
 ['غشهداب','1399-03-03','34076','32454','3870.22',f,'1211'],
 ['غشهداب','1399-03-06','34770','34076','3949.04',f,'16243'],
 ['غشهداب','1399-03-07','35890','34770','4076.25',f,'6368']
];
const csv=(data=rows)=>Buffer.from('\uFEFF'+[h,...data].map(x=>x.join(',')).join('\r\n'));
test('June price basis passes synthetic source arithmetic without granting authenticity',()=>{
 const r=auditCsv(csv());
 assert.equal(r.status,'CSV_INTERNAL_CONSISTENCY_PASS');
 assert.ok(Math.abs(r.rawReturnPct-2.0366240169)<1e-8);
 assert.equal(r.previousCloseIRR,34076);
 assert.equal(r.closeIRR,34770);
 assert.equal(r.adjustedCloseIRR,3949.04);
 assert.equal(r.tradeCount,16243);
 for(const k of ['providerAuthenticated','corporateActionProven','capitalAdjustmentAllowed','historyMutated','tradingSignalsEnabled'])assert.equal(r[k],false);
});
test('mismatched prior closing price or cumulative factor remains review-only',()=>{
 const p=rows.map(x=>x.slice());p[1][3]='34077';
 assert.equal(auditCsv(csv(p)).checks.matchingPreviousClose,false);
 const q=rows.map(x=>x.slice());q[1][5]='0.2000000000';
 assert.equal(auditCsv(csv(q)).status,'CSV_INTERNAL_CONSISTENCY_REVIEW');
});
test('rejects mixed symbols and duplicate or missing dates',()=>{
 const a=rows.map(x=>x.slice());a[0][0]='فولاد';
 assert.throws(()=>auditCsv(csv(a)),/SYMBOL_MISMATCH/);
 assert.throws(()=>auditCsv(csv(rows.slice(0,1))),/TARGET_DATE_NOT_FOUND/);
 assert.throws(()=>auditCsv(csv([...rows,rows[1]])),/DUPLICATE_DATE/);
});

test('Persian header ZWNJ variations are accepted but normalized duplicates are rejected',()=>{
 const actualHeaders=h.map(name=>name.replace('تعدیل‌شده','تعدیلشده'));
 const genuineStyle=Buffer.from('\uFEFF'+[actualHeaders,...rows].map(r=>r.join(',')).join('\r\n'));
 const result=auditCsv(genuineStyle);
 assert.equal(result.status,'CSV_INTERNAL_CONSISTENCY_PASS');
 assert.equal(result.closeIRR,34770);
 const duplicated=Buffer.from('\uFEFF'+[[...h,'قیمت پایانی تعدیل\u200cشده (ریال)'],...rows.map(r=>[...r,'1'])].map(r=>r.join(',')).join('\r\n'));
 assert.throws(()=>auditCsv(duplicated),/DUPLICATE_COLUMNS/);
});

test('day four: reject fractional and unsafe trade counts rather than treating them as prices',()=>{
 const fractional=rows.map(x=>x.slice());fractional[1][6]='16243.5';
 assert.throws(()=>auditCsv(csv(fractional)),/INVALID_POSITIVE_INTEGER/);
 const unsafe=rows.map(x=>x.slice());unsafe[1][6]='9007199254740992';
 assert.throws(()=>auditCsv(csv(unsafe)),/INVALID_POSITIVE_INTEGER/);
});
test('day four: reject text appended after a quoted CSV field',()=>{
 const malformed=csv().toString('utf8').replace('"غشهداب"','"غشهداب"oops');
 // Build a quoted field explicitly because the synthetic source uses unquoted symbols.
 const bad=csv().toString('utf8').replace('غشهداب,1399-03-03','"غشهداب"oops,1399-03-03');
 assert.throws(()=>auditCsv(Buffer.from(bad)),/INVALID_CSV_QUOTE_TRAILING_TEXT/);
});
