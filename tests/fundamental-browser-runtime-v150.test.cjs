'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
test('fundamental evidence and decision gate load as browser globals without CommonJS or network',()=>{
 const context=vm.createContext({});
 for(const path of ['fundamental-evidence.js','capital-adjustments.js','fundamental-decision-gate-v150.js']){
  new vm.Script(fs.readFileSync(path,'utf8'),{filename:path}).runInContext(context);
 }
 const gate=context.SahambanFundamentalGateV150;
 assert.equal(typeof gate.evaluateFundamentalGate,'function');
 const data={symbol:'ونوین',tracing_no:'12345',
  report_url:'https://www.codal.ir/Reports/Decision.aspx?LetterSerial=12345',
  publication_date:'1405/08/12',period_end:'1405/06/31',unit:'MILLION_IRR',
  audit_status:'AUDITED',statement_basis:'CONSOLIDATED',document_sha256:'a'.repeat(64),
  original_document_read:true,fields:{
   revenue:{amount:8000,source_row:'درآمد عملیاتی',source_page:3},
   operating_profit:{amount:1600,source_row:'سود عملیاتی',source_page:4},
   net_income:{amount:1900,source_row:'سود خالص',source_page:5},
   net_income_attributable_to_parent:{amount:2000,source_row:'سود قابل انتساب',source_page:5},
   total_assets:{amount:10000,source_row:'جمع دارایی',source_page:7},
   total_liabilities:{amount:6000,source_row:'جمع بدهی',source_page:7},
   equity:{amount:4000,source_row:'حقوق مالکانه',source_page:7},
   equity_attributable_to_parent:{amount:4000,source_row:'حقوق مالکانه قابل انتساب',source_page:7},
   operating_cash_flow:{amount:1000,source_row:'جریان نقد عملیاتی',source_page:9},
   shares_outstanding:{amount:100000000,unit:'SHARES',source_row:'تعداد سهام',source_page:2},
   weighted_average_shares:{amount:100000000,unit:'SHARES',source_row:'میانگین موزون سهام',source_page:2}
  }};
 const review=gate.evaluateFundamentalGate(data,'ونوین',{
  marketPriceEvidence:{status:'VERIFIED_MARKET_CLOSE',symbol:'ونوین',closeRialPerShare:1000,marketDate:'1405/08/11',source:'VERIFIED_HISTORICAL_QUOTE_EVENT'},
  asOfDate:'1405/08/12'
 });
 assert.equal(review.status,'FUNDAMENTAL_REVIEW_READY');
 assert.equal(review.epsRialPerShare,20);
 assert.equal(review.financialRatios.valuation.pe,50);
 assert.equal(review.financialRatios.ratios.operatingMarginPct,20);
});
test('browser global validation still rejects non-leap Esfand 30 and invalid CODAL host',()=>{
 const context=vm.createContext({});
 new vm.Script(fs.readFileSync('fundamental-evidence.js','utf8')).runInContext(context);
 const api=context.SahambanFundamentalEvidenceV150;
 assert.equal(api.validPublicationDate('1405/12/30'),false);
 assert.equal(api.validPublicationDate('1403/12/30'),true);
 assert.equal(api.safeReportUrl('https://codal.ir.attacker.test/Reports/X.aspx?a=1'),null);
});

test('fundamental intake is wired into the PWA and decision detail without persistent storage',()=>{
 const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
 const ui=fs.readFileSync('decision-support-ui-v129.js','utf8');
 for(const id of ['fundamentalReviewPanelV150','fundamentalEvidenceFileV150','fundamentalOriginalAttestationV150','fundamentalReviewRunV150','fundamentalReviewStatusV150','fundamentalReviewDetailV150'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.indexOf('fundamental-evidence.js?v=150.4')<html.indexOf('fundamental-decision-gate-v150.js?v=150.3'));
 assert.ok(html.indexOf('fundamental-decision-gate-v150.js?v=150.3')<html.indexOf('decision-support-ui-v129.js?v=129.15'));
 assert.ok(sw.includes('fundamental-evidence.js?v=150.4'));
 assert.ok(sw.includes('capital-adjustments.js?v=150.2'));
 assert.ok(ui.includes('period_start:doc.periodStart'));
 assert.ok(ui.includes("actionInput.value='';"));
 assert.ok(sw.includes('fundamental-decision-gate-v150.js?v=150.3'));
 assert.match(ui,/decisionPlan\(r,\{fundamentalReview:fundamental\}\)/);
 assert.match(ui,/VERIFIED_HISTORICAL_QUOTE_EVENT/);
 assert.doesNotMatch(ui,/localStorage|sessionStorage|sendBeacon|fetch\(/);
});

test('browser gate applies a verified corporate-action sequence to EPS and P/E',()=>{
 const context=vm.createContext({});
 for(const path of ['fundamental-evidence.js','capital-adjustments.js','fundamental-decision-gate-v150.js'])
  new vm.Script(fs.readFileSync(path,'utf8'),{filename:path}).runInContext(context);
 const data={symbol:'ونوین',tracing_no:'12345',report_url:'https://www.codal.ir/Reports/Decision.aspx?LetterSerial=12345',
  publication_date:'1405/08/12',period_start:'1405/01/01',period_end:'1405/06/31',
  unit:'MILLION_IRR',audit_status:'AUDITED',statement_basis:'CONSOLIDATED',
  document_sha256:'a'.repeat(64),original_document_read:true,fields:{
   net_income_attributable_to_parent:{amount:2000,source_row:'سود قابل انتساب',source_page:4},
   weighted_average_shares:{amount:100000000,unit:'SHARES',source_row:'میانگین موزون',source_page:5}
  }};
 const action={symbol:'ونوین',tracing_no:'54321',report_url:'https://www.codal.ir/Reports/Decision.aspx?LetterSerial=54321',
  effective_date:'1405/04/01',document_sha256:'b'.repeat(64),original_document_read:true,
  source_row:'مصوبه افزایش سرمایه',source_page:6,action_type:'BONUS_ISSUE',
  pre_action_shares:100000000,post_action_shares:150000000};
 const r=context.SahambanFundamentalGateV150.evaluateFundamentalGate(data,'ونوین',{capitalActions:[action]});
 assert.equal(r.status,'FUNDAMENTAL_REVIEW_READY');
 assert.equal(r.capitalAdjustmentCount,1);
 assert.equal(r.epsRialPerShare,2000*1000000/150000000);
 assert.equal(r.capitalAdjustmentBasis.status,'CAPITAL_ADJUSTED_WA_SHARES_READY_FOR_REVIEW');
});
