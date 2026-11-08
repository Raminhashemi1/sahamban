'use strict';
/* v150: conservative fundamental prerequisite for technical entry candidates.
   This is a screening gate, not a valuation, price target or trading recommendation. */
const {normalizeSymbol}=require('./tests/codal-search-quality.cjs');
const {checkFinancialEvidence,calculateEPS,calculateDPS,calculateFinancialRatios}=require('./fundamental-evidence.js');
function evaluateFundamentalGate(data,expectedSymbol,{marketPriceEvidence,asOfDate}={}){
 const checked=checkFinancialEvidence(data,expectedSymbol);
 if(checked.status!=='READY_FOR_REVIEW')
  return {status:'FUNDAMENTAL_REVIEW_BLOCKED',symbol:normalizeSymbol(expectedSymbol),
   reasons:checked.errors,financialEvidence:checked.status,entryEligible:false};
 if(data.audit_status!=='AUDITED')
  return {status:'FUNDAMENTAL_REVIEW_BLOCKED',symbol:normalizeSymbol(expectedSymbol),
   reasons:['AUDITED_STATEMENT_REQUIRED_FOR_ENTRY_REVIEW'],financialEvidence:checked.status,entryEligible:false};
 const eps=calculateEPS(data,expectedSymbol);
 if(eps.status!=='EPS_READY_FOR_REVIEW')
  return {status:'FUNDAMENTAL_REVIEW_BLOCKED',symbol:normalizeSymbol(expectedSymbol),
   reasons:eps.errors,financialEvidence:checked.status,entryEligible:false};
 if(!(eps.eps.valueRialPerShare>0))
  return {status:'FUNDAMENTAL_REVIEW_BLOCKED',symbol:normalizeSymbol(expectedSymbol),
   reasons:['NON_POSITIVE_EPS_BLOCKS_ENTRY_CANDIDATE'],financialEvidence:checked.status,
   epsStatus:eps.status,epsRialPerShare:eps.eps.valueRialPerShare,entryEligible:false};
 const ratios=calculateFinancialRatios(data,expectedSymbol,{marketPriceEvidence,asOfDate});
 const byName=Object.fromEntries(checked.fields.map(x=>[x.name,x]));
 let dps={status:'NOT_PROVIDED',valueRialPerShare:null,errors:[]};
 if(data.dividend_status!==undefined||byName.cash_dividend_approved_total||byName.dividend_eligible_shares){
  const result=calculateDPS(data,expectedSymbol);
  dps={status:result.status,valueRialPerShare:result.dps?.valueRialPerShare??null,errors:result.errors||[]};
 }
 return {status:'FUNDAMENTAL_REVIEW_READY',symbol:normalizeSymbol(expectedSymbol),
  financialEvidence:checked.status,auditStatus:data.audit_status,statementBasis:data.statement_basis,
  periodEnd:data.period_end,epsStatus:eps.status,epsRialPerShare:eps.eps.valueRialPerShare,
  epsSource:eps.eps.netIncomeSource,weightedAverageSharesSource:eps.eps.weightedAverageSharesSource,
  dpsStatus:dps.status,dpsRialPerShare:dps.valueRialPerShare,dpsErrors:dps.errors,
  accountingCheck:checked.accountingCheck,financialRatios:ratios.status==='FINANCIAL_RATIOS_READY_FOR_REVIEW'?ratios:null,
  ratioStatus:ratios.status,ratioErrors:ratios.errors||[],entryEligible:true,
  note:'A minimum evidence gate only: audited same-issuer statements and positive EPS are prerequisites. It does not establish fair value, growth, solvency, liquidity, valuation attractiveness or expected return.'};
}
module.exports={evaluateFundamentalGate};
