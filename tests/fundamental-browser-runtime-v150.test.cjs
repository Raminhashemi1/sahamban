'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
test('fundamental evidence and decision gate load as browser globals without CommonJS or network',()=>{
 const context=vm.createContext({});
 for(const path of ['fundamental-evidence.js','fundamental-decision-gate-v150.js']){
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
