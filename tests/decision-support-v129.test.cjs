'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
globalThis.SahambanTechnicalV50=require('../technical-indicators-v50.js');
const api=require('../decision-support-v129.js');
function fundamentalReview(overrides={}){return {status:'FUNDAMENTAL_REVIEW_READY',symbol:'TEST',entryEligible:true,financialEvidence:'READY_FOR_REVIEW',auditStatus:'AUDITED',statementBasis:'CONSOLIDATED',periodEnd:'۱۴۰۵/۰۶/۳۱',epsStatus:'EPS_READY_FOR_REVIEW',epsRialPerShare:1250,dpsStatus:'DPS_READY_FOR_REVIEW',...overrides};}
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
 assert.equal(zero.limitedBy,'BOTH_LIMITS');
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

test('decision plan fails closed when historical price basis is missing or unverified',()=>{
 const input={symbol:'TEST',code:'ENTRY_CANDIDATE',marketDate:'20261104',last:1200,stop:1000,priorHigh:1100,priorLow:1000};
 for(const evidence of [undefined,'NOT_ESTABLISHED','UNKNOWN_NOT_ATTESTED']){
  const report={...input,historyPriceBasisEvidence:evidence};
  const p=api.decisionPlan(report,{fundamentalReview:fundamentalReview()});
  assert.equal(p.decision,'NO_ACTION');
  assert.equal(p.condition,'DATA_BASIS_UNVERIFIED');
  assert.equal(p.historicalPriceBasis,'UNKNOWN_NOT_ATTESTED');
 }
});
test('entry candidate is a date-stamped conditional review, never an automatic order',()=>{
 const p=api.decisionPlan({symbol:'TEST',code:'ENTRY_CANDIDATE',historyPriceBasisEvidence:'INDEPENDENTLY_ATTESTED',marketDate:'20261104',last:1200,stop:1000,priorHigh:1100,priorLow:1000},{fundamentalReview:fundamentalReview()});
 assert.equal(p.decision,'REVIEW_ENTRY');
 assert.equal(p.asOf,'20261104');
 assert.equal(p.automaticTrade,false);
 assert.match(p.when,/نقدشوندگی/);
 assert.match(p.invalidation,/باطل/);
 assert.match(p.evidence,/اعتبار بنیادی/);
});
test('entry review fails closed without valid risk level',()=>{
 const p=api.decisionPlan({symbol:'TEST',code:'ENTRY_CANDIDATE',historyPriceBasisEvidence:'INDEPENDENTLY_ATTESTED',marketDate:'20261104',last:1200,stop:null,priorHigh:1100,priorLow:1000},{fundamentalReview:fundamentalReview()});
 assert.equal(p.decision,'NO_ACTION');
});

test('technical entry candidate is blocked without audited same-symbol positive EPS evidence',()=>{
 const input={symbol:'TEST',code:'ENTRY_CANDIDATE',historyPriceBasisEvidence:'INDEPENDENTLY_ATTESTED',marketDate:'20261104',last:1200,stop:1000,priorHigh:1100,priorLow:1000};
 const missing=api.decisionPlan(input);
 assert.equal(missing.decision,'NO_ACTION');
 assert.equal(missing.condition,'FUNDAMENTAL_EVIDENCE_REQUIRED');
 assert.equal(missing.fundamentalGate,'BLOCKED');
 for(const review of [
  fundamentalReview({symbol:'OTHER'}),
  fundamentalReview({auditStatus:'UNAUDITED'}),
  fundamentalReview({epsRialPerShare:0}),
  fundamentalReview({epsRialPerShare:-5}),
  fundamentalReview({financialEvidence:'INSUFFICIENT_EVIDENCE'}),
  fundamentalReview({epsStatus:'INSUFFICIENT_EVIDENCE'})
 ]){
  const p=api.decisionPlan(input,{fundamentalReview:review});
  assert.equal(p.decision,'NO_ACTION');
  assert.equal(p.condition,'FUNDAMENTAL_EVIDENCE_REQUIRED');
 }
});
test('passing fundamental screen is disclosed but never upgrades technical candidate to a buy order',()=>{
 const p=api.decisionPlan({symbol:'TEST',code:'ENTRY_CANDIDATE',historyPriceBasisEvidence:'INDEPENDENTLY_ATTESTED',marketDate:'20261104',last:1200,stop:1000,priorHigh:1100,priorLow:1000},{fundamentalReview:fundamentalReview()});
 assert.equal(p.decision,'REVIEW_ENTRY');
 assert.equal(p.fundamentalGate,'PASSED_MINIMUM_SCREEN');
 assert.equal(p.fundamentalContext.epsRialPerShare,1250);
 assert.equal(p.automaticTrade,false);
});

test('risk exit and weak trend do not fabricate individualized sell instructions',()=>{
 const inputs={symbol:'TEST',historyPriceBasisEvidence:'INDEPENDENTLY_ATTESTED',marketDate:'20261104',last:900,priorHigh:1100,priorLow:1000};
 for(const [code,expected] of [['RISK_EXIT','REVIEW_EXIT_URGENT'],['EXIT_REVIEW','REVIEW_REDUCE'],['WAIT','NO_ACTION'],['AVOID','NO_ACTION']]){
  const p=api.decisionPlan({...inputs,code});
  assert.equal(p.decision,expected);
  assert.equal(p.automaticTrade,false);
  assert.ok(p.invalidation);
 }
 assert.throws(()=>api.decisionPlan({...inputs,code:'BUY_NOW'}),/معتبر/);
});
test('no entry explanation claims RSI alignment if rule permits an 80-point score',()=>{
 const fs=require('node:fs'),source=fs.readFileSync('decision-support-v129.js','utf8');
 assert.match(source,/امتیاز قواعد دست‌کم ۸۰/);
 assert.doesNotMatch(source,/روند، مومنتوم، RSI و شکست سقف ۲۰ جلسه هم‌راستا هستند/);
 const ui=fs.readFileSync('decision-support-ui-v129.js','utf8');
 assert.match(ui,/\.decisionPlan\(r,\{fundamentalReview:fundamental\}\)/);
 assert.match(ui,/شرط ابطال یا محدودیت/);
});

test('local decision audit export contains evidence, all assessed symbols and no trade orders',()=>{
 const rows=[api.analyze({symbol:'آزمایشی۱',history:history()},{today:'20261103'}),
             api.analyze({symbol:'آزمایشی۲',history:history()},{today:'20261103'})];
 const out=api.exportAudit(rows,{generatedAt:'2026-11-04T17:00:00.000Z'});
 assert.equal(out.schema,'sahamban-decision-audit-v1');
 assert.equal(out.generatedAt,'2026-11-04T17:00:00.000Z');
 assert.equal(out.results.length,2);
 assert.deepEqual(out.results.map(x=>x.symbol),['آزمایشی۱','آزمایشی۲']);
 assert.ok(out.results.every(x=>x.indicators.length===5&&x.automatedOrder===false&&x.requiresIndependentVerification===true));
 assert.equal(out.noTradingOrders,true);
 assert.match(out.evidenceScope,/not an independent live quote/);
 assert.equal(JSON.stringify(out).includes('brokerToken'),false);
});
test('local audit refuses malformed timestamps and forged analyses',()=>{
 const valid=api.analyze({symbol:'TEST',history:history()},{today:'20261103'});
 assert.throws(()=>api.exportAudit([valid],{generatedAt:'not-a-date'}),/زمان/);
 assert.throws(()=>api.exportAudit([valid],{generatedAt:'2026-02-30T17:00:00Z'}),/زمان/);
 assert.throws(()=>api.exportAudit([valid],{generatedAt:'2026-11-04T17:00:00\\Z'}),/زمان/);
 assert.throws(()=>api.exportAudit([{...valid,score:101}],{generatedAt:'2026-11-04T17:00:00Z'}),/ردیف/);
});
test('export button requires completed analysis and never writes holdings',()=>{
 const fs=require('node:fs');
 const html=fs.readFileSync('index.html','utf8');
 const ui=fs.readFileSync('decision-support-ui-v129.js','utf8');
 assert.match(html,/id="decisionExportV129"[^>]*disabled/);
 assert.match(ui,/exportAudit\(reports/);
 assert.match(ui,/URL.createObjectURL/);
 assert.match(ui,/URL.revokeObjectURL/);
 assert.match(ui,/exportButton.disabled=true/);
 assert.doesNotMatch(ui,/localStorage|sessionStorage/);
});

test('fresh market history invalidates visible earlier buy and sell conclusions',()=>{
 const fs=require('node:fs');
 const ui=fs.readFileSync('decision-support-ui-v129.js','utf8');
 assert.match(ui,/reports=\[\];fundamentalReviews\.clear\(\);[\s\S]*?table\.replaceChildren\(\);detail\.replaceChildren\(\);select\.replaceChildren\(\)/);
 assert.match(ui,/گزارش قبلی معتبر نیست/);
 assert.match(ui,/if\(exportButton\)exportButton\.disabled=true/);
});

test('equal cash and risk share caps are disclosed without implying one sole constraint',()=>{
 const same=api.sizePosition({capital:10000,riskPercent:5,entry:5000,stop:4750});
 assert.equal(same.quantity,2);
 assert.equal(same.limitedBy,'BOTH_LIMITS');
 assert.equal(same.estimatedCost,10000);
 assert.equal(same.maxLoss,500);
});

test('professional UI discloses passive comparison limits without overstating its evidence',()=>{
 const fs=require('node:fs');
 const ui=fs.readFileSync('decision-support-ui-v129.js','utf8');
 assert.match(ui,/passiveComparison/);
 assert.match(ui,/زمان حضور در بازار هم‌ارز نیستند/);
 const sample=fs.readFileSync('market-sample-ui-v131.js','utf8');
 assert.match(sample,/passiveComparison/);
 assert.match(sample,/اثبات برتری معاملاتی نیست/);
});

test('holdout UI communicates Wilson uncertainty as descriptive, not forecast confidence',()=>{
 const fs=require('node:fs');
 const professional=fs.readFileSync('decision-support-ui-v129.js','utf8');
 const sample=fs.readFileSync('market-sample-ui-v131.js','utf8');
 assert.match(professional,/positiveRateUncertainty/);
 assert.match(professional,/Wilson/);
 assert.match(professional,/احتمال موفقیت آینده/);
 assert.match(sample,/positiveRateUncertainty/);
 assert.match(sample,/مستقل نیستند/);
});

test('fundamental entry gate normalizes Arabic and Persian issuer letter variants',()=>{
 const input={symbol:'نوين',code:'ENTRY_CANDIDATE',historyPriceBasisEvidence:'INDEPENDENTLY_ATTESTED',marketDate:'20261104',last:1200,stop:1000,priorHigh:1100,priorLow:1000};
 const p=api.decisionPlan(input,{fundamentalReview:fundamentalReview({symbol:'نوین'})});
 assert.equal(p.decision,'REVIEW_ENTRY');
});
