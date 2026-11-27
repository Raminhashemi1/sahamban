'use strict';
/* v150: conservative fundamental prerequisite for technical entry candidates.
   This is a screening gate, not a valuation, price target or trading recommendation. */
(function(root,factory){
 const evidence=typeof module==='object'&&module.exports?require('./fundamental-evidence.js'):root?.SahambanFundamentalEvidenceV150;
 const capital=typeof module==='object'&&module.exports?require('./capital-adjustments.js'):root?.SahambanCapitalAdjustmentsV150;
 const api=factory(evidence,capital);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SahambanFundamentalGateV150=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(evidence,capital){
 const {normalizeSymbol,checkFinancialEvidence,calculateEPS,calculateDPS,calculateFinancialRatios}=evidence;
function evaluateFundamentalGate(data,expectedSymbol,{marketPriceEvidence,asOfDate,capitalActions,valuationShareBasis,dividendCapitalReconciliation}={}){
 const checked=checkFinancialEvidence(data,expectedSymbol);
 if(checked.status!=='READY_FOR_REVIEW')
  return {status:'FUNDAMENTAL_REVIEW_BLOCKED',symbol:normalizeSymbol(expectedSymbol),
   reasons:checked.errors,financialEvidence:checked.status,entryEligible:false};
 if(data.audit_status!=='AUDITED')
  return {status:'FUNDAMENTAL_REVIEW_BLOCKED',symbol:normalizeSymbol(expectedSymbol),
   reasons:['AUDITED_STATEMENT_REQUIRED_FOR_ENTRY_REVIEW'],financialEvidence:checked.status,entryEligible:false};
 let adjustedShareBasis=null,capitalActionErrors=[];
 if(capitalActions!==undefined){
  if(!Array.isArray(capitalActions)||!capitalActions.length||capitalActions.length>20||
   !evidence.validPublicationDate(data.period_start)){
   return {status:'FUNDAMENTAL_REVIEW_BLOCKED',symbol:normalizeSymbol(expectedSymbol),
    reasons:['INVALID_CAPITAL_ACTION_SEQUENCE_OR_PERIOD_START'],financialEvidence:checked.status,entryEligible:false};
  }
  const actionResults=capitalActions.map(action=>capital.calculateCapitalAdjustment(action,expectedSymbol));
  actionResults.forEach((result,index)=>{if(result.status!=='CAPITAL_ADJUSTMENT_READY_FOR_REVIEW')
   capitalActionErrors.push({index,errors:result.errors||['INVALID_CAPITAL_ACTION']});});
  if(capitalActionErrors.length){
   return {status:'FUNDAMENTAL_REVIEW_BLOCKED',symbol:normalizeSymbol(expectedSymbol),
    reasons:['CAPITAL_ACTION_EVIDENCE_INSUFFICIENT'],capitalActionErrors,financialEvidence:checked.status,entryEligible:false};
  }
  adjustedShareBasis=capital.calculateMultiActionWeightedAverageShares(actionResults,
   {periodStart:data.period_start,periodEnd:data.period_end});
  if(adjustedShareBasis.status!=='CAPITAL_ADJUSTED_WA_SHARES_READY_FOR_REVIEW'){
   return {status:'FUNDAMENTAL_REVIEW_BLOCKED',symbol:normalizeSymbol(expectedSymbol),
    reasons:adjustedShareBasis.errors,capitalActionErrors,financialEvidence:checked.status,entryEligible:false};
  }
 }
 const eps=calculateEPS(data,expectedSymbol,adjustedShareBasis||undefined);
 if(eps.status!=='EPS_READY_FOR_REVIEW')
  return {status:'FUNDAMENTAL_REVIEW_BLOCKED',symbol:normalizeSymbol(expectedSymbol),
   reasons:eps.errors,financialEvidence:checked.status,entryEligible:false};
 if(!(eps.eps.valueRialPerShare>0))
  return {status:'FUNDAMENTAL_REVIEW_BLOCKED',symbol:normalizeSymbol(expectedSymbol),
   reasons:['NON_POSITIVE_EPS_BLOCKS_ENTRY_CANDIDATE'],financialEvidence:checked.status,
   epsStatus:eps.status,epsRialPerShare:eps.eps.valueRialPerShare,entryEligible:false};
 const ratios=calculateFinancialRatios(data,expectedSymbol,{marketPriceEvidence,asOfDate,adjustedShareBasis:adjustedShareBasis||undefined,valuationShareBasis});
 const byName=Object.fromEntries(checked.fields.map(x=>[x.name,x]));
 let dps={status:'NOT_PROVIDED',valueRialPerShare:null,errors:[],capitalReconciliation:null};
 if(data.dividend_status!==undefined||byName.cash_dividend_approved_total||byName.dividend_eligible_shares){
  let result;
  if(data.dividend_status!=='APPROVED_BY_AGM'){
   result=calculateDPS(data,expectedSymbol);
  }else if(!dividendCapitalReconciliation||typeof dividendCapitalReconciliation!=='object'){
   result={status:'INSUFFICIENT_EVIDENCE',errors:['DPS_CAPITAL_ACTION_RECONCILIATION_REQUIRED'],dps:null};
  }else{
   result=capital.reviewDPSWithCapitalReconciliation(data,expectedSymbol,dividendCapitalReconciliation);
  }
  dps={status:result.status,valueRialPerShare:result.dps?.valueRialPerShare??null,
   errors:result.errors||[],capitalReconciliation:result.reconciliation??null};
 }
 return {status:'FUNDAMENTAL_REVIEW_READY',symbol:normalizeSymbol(expectedSymbol),
  financialEvidence:checked.status,auditStatus:data.audit_status,statementBasis:data.statement_basis,
  periodEnd:data.period_end,periodStart:data.period_start??null,epsStatus:eps.status,epsRialPerShare:eps.eps.valueRialPerShare,
  capitalAdjustmentCount:adjustedShareBasis?.actions?.length??0,capitalAdjustmentBasis:adjustedShareBasis,
  epsSource:eps.eps.netIncomeSource,weightedAverageSharesSource:eps.eps.weightedAverageSharesSource,
  dpsStatus:dps.status,dpsRialPerShare:dps.valueRialPerShare,dpsErrors:dps.errors,dpsCapitalReconciliation:dps.capitalReconciliation,
  accountingCheck:checked.accountingCheck,financialRatios:ratios.status==='FINANCIAL_RATIOS_READY_FOR_REVIEW'?ratios:null,
  ratioStatus:ratios.status,ratioErrors:ratios.errors||[],
  // Client-supplied fields and user attestations cannot prove CODAL origin. Fail closed.
  // An independent, trusted verification service is required before any entry review.
  originStatus:'UNVERIFIED_USER_SUPPLIED',entryEligible:false,
  entryBlockReasons:['CODAL_SOURCE_NOT_INDEPENDENTLY_VERIFIED'],
  note:'Review-only financial arithmetic. Neither a user-entered origin_verified flag, a file hash, nor a checked attestation proves official CODAL provenance. Entry review is blocked until independently verified source evidence exists. No valuation or investment recommendation is made.'};
}
return {evaluateFundamentalGate};
});
