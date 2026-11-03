'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const match=app.match(/function marketDateCheck\(raw\)\{[\s\S]*?\n\}/);
assert.ok(match,'marketDateCheck must exist in app.js');
function checkAt(instant,marketDate){
 class FixedDate extends Date { constructor(...args){super(...(args.length?args:[instant]));} }
 const sandbox={Date:FixedDate,Intl,Number,String,Math,fmt:n=>String(n)};
 vm.createContext(sandbox);
 vm.runInContext(match[0]+';this.marketDateCheck=marketDateCheck;',sandbox);
 return sandbox.marketDateCheck(marketDate);
}
test('market freshness uses Tehran calendar date across UTC midnight',()=>{
 const atTehranNov3=new Date('2026-11-02T21:00:00.000Z'); // 00:30 on Nov 3 in Tehran
 const result=checkAt(atTehranNov3,'20261103');
 assert.equal(result.ok,true);
 assert.match(result.text,/فاصله تقویمی: 0 روز/);
});
test('prior Tehran market date is aged by Tehran day, not UTC day',()=>{
 const atTehranNov4=new Date('2026-11-03T21:00:00.000Z'); // 00:30 on Nov 4 in Tehran
 const result=checkAt(atTehranNov4,'20261103');
 assert.equal(result.ok,true);
 assert.match(result.text,/فاصله تقویمی: 1 روز/);
});
test('future Tehran dates and dates older than seven days are rejected',()=>{
 assert.equal(checkAt(new Date('2026-11-02T21:00:00.000Z'),'20261104').ok,false);
 assert.equal(checkAt(new Date('2026-11-20T08:00:00.000Z'),'20261101').ok,false);
});
