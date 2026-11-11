'use strict';
/* Independent arithmetic cross-check of PUBLICLY REPUBLISHED issuer decisions.
 * Not primary CODAL evidence, not an original-source digital signature, not a
 * basis to enable price adjustment/trading. Cash dividends and capital
 * reported in Rial and million Rial respectively. All operations BigInt. */
const {createHash}=require('node:crypto');
const INS='25514780181345713';
const NOMINAL_SHARE_RIAL=1000n;
const DENOMINATOR=1000000n;
const fail=reason=>Object.freeze({status:'NOT_PRIMARY_AUTHENTICATED',reason,
 sourceAuthenticated:false,issuerOriginalVerified:false,capitalActionsVerified:false,
 historyBasisAuthenticated:false,entryEligible:false,tradingSignalsEnabled:false,
 day3FinalAccepted:false});
function crosscheckPublicDps({instrument=INS,capitalMillionRial,dpsRial,
 dividendTotalMillionRial,issuerOriginalSha256=null,dividendSourceUrl}={}){
 if(instrument!==INS||!Number.isSafeInteger(capitalMillionRial)||capitalMillionRial<=0||
  !Number.isSafeInteger(dpsRial)||dpsRial<=0||
  !Number.isSafeInteger(dividendTotalMillionRial)||dividendTotalMillionRial<=0||
  !Number.isSafeInteger(earningsPerShareRial)||earningsPerShareRial<=0||
  !Number.isSafeInteger(payoutPermille)||payoutPermille<0||payoutPermille>1000||
  !Number.isSafeInteger(retainedProfitBeforeMillionRial)||retainedProfitBeforeMillionRial<0||
  !Number.isSafeInteger(retainedProfitAfterMillionRial)||retainedProfitAfterMillionRial<0)
  return fail('INVALID_INSTRUMENT_OR_AMOUNTS');
 if(typeof dividendSourceUrl!=='string'||!/^https:\/\/(?:t\.me|telegram\.me)\//.test(dividendSourceUrl))
  return fail('UNRECOGNIZED_REPUBLICATION_SOURCE');
 const capital=BigInt(capitalMillionRial),dps=BigInt(dpsRial),declared=BigInt(dividendTotalMillionRial);
 if((capital*DENOMINATOR)%NOMINAL_SHARE_RIAL!==0n)return fail('NON_INTEGRAL_SHARE_COUNT');
 const shares=capital*DENOMINATOR/NOMINAL_SHARE_RIAL;
 const calculatedRial=shares*dps;
 // Printed million-Rial decisions are rounded to their nearest million Rial.
 const rounded=(calculatedRial+DENOMINATOR/2n)/DENOMINATOR;
 if(rounded!==declared)return fail('DIVIDEND_TOTAL_MISMATCH');
 if(dps*1000n!==BigInt(earningsPerShareRial)*BigInt(payoutPermille))
  return fail('PAYOUT_RATIO_MISMATCH');
 if(BigInt(retainedProfitBeforeMillionRial)-declared!==BigInt(retainedProfitAfterMillionRial))
  return fail('RETAINED_PROFIT_RECONCILIATION_MISMATCH');
 // The primary-byte digest may be supplied later, but never treated as
 // attestation just because a caller supplied a syntactically valid hex.
 if(issuerOriginalSha256!==null&&!/^[a-f0-9]{64}$/.test(issuerOriginalSha256))
  return fail('INVALID_UNVERIFIED_PRIMARY_HASH');
 return Object.freeze({status:'SECONDARY_ARITHMETIC_CORROBORATED_ONLY',instrument,
  nominalShareRial:Number(NOMINAL_SHARE_RIAL),shareCount:shares.toString(),
  declaredDividendMillionRial:dividendTotalMillionRial,
  recomputedDividendMillionRial:Number(rounded),payoutPermille,
  retainedProfitReconciled:true,
  exactDividendRial:calculatedRial.toString(),
  republicationDigest:createHash('sha256').update(dividendSourceUrl).digest('hex'),
  sourceAuthenticated:false,issuerOriginalVerified:false,capitalActionsVerified:false,
  historyBasisAuthenticated:false,entryEligible:false,tradingSignalsEnabled:false,
  day3FinalAccepted:false});
}
module.exports=Object.freeze({crosscheckPublicDps});
