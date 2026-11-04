'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
globalThis.SahambanTechnicalV50=require('../technical-indicators-v50.js');
const api=require('../decision-support-v129.js');
function history(n=100){const end=new Date(Date.UTC(2026,10,3));return Array.from({length:n},(_,i)=>{const d=new Date(end);d.setUTCDate(d.getUTCDate()-(n-1-i));const date=d.toISOString().slice(0,10).replaceAll('-','');const close=1000+i*2+Math.sin(i*1.7)*18;return {date,close,tradedValue:100000+i*1000};});}
test('decision engine uses verified history and emits bounded, explainable scores',()=>{const q={symbol:'TEST',history:history()};const r=api.analyze(q,{today:'20261103'});assert.equal(r.symbol,'TEST');assert.ok(r.score>=0&&r.score<=100);assert.equal(r.reasons.length,5);assert.ok(['ENTRY_CANDIDATE','WAIT','AVOID','EXIT_REVIEW','RISK_EXIT'].includes(r.code));assert.ok(r.marketDate==='20261103');});
test('decision engine rejects stale history instead of generating a signal',()=>{assert.throws(()=>api.analyze({symbol:'TEST',history:history().map(x=>({...x,date:new Date(Date.UTC(+x.date.slice(0,4),+x.date.slice(4,6)-1,+x.date.slice(6,8)-33)).toISOString().slice(0,10).replaceAll('-','')}))},{today:'20261103'}),/قدیمی/);});
test('decision engine rejects insufficient history and invalid ordering',()=>{assert.throws(()=>api.analyze({symbol:'TEST',history:history(40)},{today:'20261103'}),/۶۰/);const h=history();h[20].date=h[19].date;assert.throws(()=>api.analyze({symbol:'TEST',history:h},{today:'20261103'}),/مرتب/);});
test('position sizing is risk-budget based and bounded to 5 percent',()=>{const x=api.sizePosition({capital:100000000,riskPercent:1,entry:1200,stop:1100});assert.equal(x.riskBudget,1000000);assert.equal(x.quantity,10000);assert.equal(x.quantity*(1200-1100),1000000);assert.throws(()=>api.sizePosition({capital:1e8,riskPercent:6,entry:1200,stop:1100}),/حداکثر/);assert.throws(()=>api.sizePosition({capital:1e8,riskPercent:1,entry:1000,stop:1100}),/حد ضرر/);});

test('position size never requires more cash than available',()=>{
 const result=api.sizePosition({capital:100000,riskPercent:5,entry:90000,stop:89999});
 assert.equal(result.quantity,1);
 assert.equal(result.estimatedCost,90000);
 assert.equal(result.maxLoss,1);
 assert.equal(result.limitedBy,'AVAILABLE_CASH');
});
test('position size never exceeds actual loss budget, including zero-affordable holdings',()=>{
 const r=api.sizePosition({capital:100000,riskPercent:1,entry:3000,stop:2500});
 assert.equal(r.quantity,2);
 assert.equal(r.maxLoss,1000);
 assert.equal(r.estimatedCost,6000);
 assert.equal(r.limitedBy,'RISK_BUDGET');
 const zero=api.sizePosition({capital:1000,riskPercent:1,entry:2000,stop:1000});
 assert.equal(zero.quantity,0);
 assert.equal(zero.maxLoss,0);
 assert.equal(zero.limitedBy,'AVAILABLE_CASH');
});
test('rejects fractional rial amounts and unsafe precision',()=>{
 assert.throws(()=>api.sizePosition({capital:10000.5,riskPercent:1,entry:1000,stop:900}),/دقت امن/);
 assert.throws(()=>api.sizePosition({capital:100000,riskPercent:1,entry:9007199254740992,stop:1}),/دقت امن/);
});

test('decision UI distinguishes historical diagnostic from proven buy/sell skill',()=>{
 const fs=require('node:fs');
 const ui=fs.readFileSync('decision-support-ui-v129.js','utf8');
 assert.match(ui,/SahambanHoldoutV134\.evaluate/);
 assert.match(ui,/اعتبار مستقل پیشنهاد: اثبات‌نشده/);
 assert.match(ui,/توان پیش‌بینی یا قابلیت اجرای معامله را اثبات نمی‌کند/);
 assert.match(ui,/خرید خودکار انجام نمی‌شود/);
});
