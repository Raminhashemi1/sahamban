'use strict';
(function(root,factory){
 const validation=typeof module==='object'&&module.exports?require('./tests/codal-search-quality.cjs'):{
  normalizeSymbol:value=>String(value??'').replace(/[\s\u200c\u200e\u200f\ufeff]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک').toUpperCase(),
  toAsciiDigits:value=>String(value??'').replace(/[۰-۹]/g,ch=>String(ch.charCodeAt(0)-1776)).replace(/[٠-٩]/g,ch=>String(ch.charCodeAt(0)-1632)),
  validPublicationDate:value=>{
   const s=String(value??'').replace(/[۰-۹]/g,ch=>String(ch.charCodeAt(0)-1776)).replace(/[٠-٩]/g,ch=>String(ch.charCodeAt(0)-1632)).trim();
   const m=s.match(/^(13\d\d|14\d\d)[/\-](\d\d?)[/\-](\d\d?)(?:\s+(\d\d?):(\d\d)(?::(\d\d))?)?$/);
   if(!m||Number(m[2])<1||Number(m[2])>12||Number(m[3])<1||Number(m[3])>(Number(m[2])<=6?31:30)||
    (m[4]!==undefined&&(Number(m[4])>23||Number(m[5])>59||(m[6]!==undefined&&Number(m[6])>59))))return false;
   if(Number(m[2])===12&&Number(m[3])===30){
    try{const fmt=new Intl.DateTimeFormat('en-u-ca-persian-nu-latn',{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'});
     for(let d=18;d<=22;d++){const p=Object.fromEntries(fmt.formatToParts(new Date(Date.UTC(Number(m[1])+622,2,d))).map(x=>[x.type,x.value]));
      if(p.year===String(Number(m[1]))&&p.month==='12'&&p.day==='30')return true;}
    }catch{}return false;
   }return true;
  }
 };
 const api=factory(validation);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SahambanFundamentalEvidenceV150=api;
})(typeof globalThis!=='undefined'?globalThis:null,function({normalizeSymbol,toAsciiDigits,validPublicationDate}){

const UNITS=new Set(['IRR','THOUSAND_IRR','MILLION_IRR']);
const SHARE_UNITS=new Set(['SHARES']);
const AUDITS=new Set(['AUDITED','UNAUDITED']);
const BASES=new Set(['STANDALONE','CONSOLIDATED']);
const METRICS=new Set(['revenue','operating_profit','net_income','net_income_attributable_to_parent','total_assets','total_liabilities','equity','equity_attributable_to_parent','operating_cash_flow','shares_outstanding','weighted_average_shares','cash_dividend_approved_total','dividend_eligible_shares']);
function safeReportUrl(raw){
 if(typeof raw!=='string'||raw.length>2048||!raw.trim()||raw.startsWith('//')||/[\s\\\u0000-\u001f\u007f]/.test(raw))return null;
 if(!raw.startsWith('/')&&!/^https:\/\//i.test(raw))return null;
 try{
  const u=new URL(raw,'https://www.codal.ir');
  if(u.protocol!=='https:'||!['codal.ir','www.codal.ir'].includes(u.hostname.toLowerCase())||u.username||u.password||u.port||!u.searchParams.size)return null;
  if(!/^\/Reports\//i.test(u.pathname)&&!/^\/DownloadFile\.aspx$/i.test(u.pathname))return null;
  return u.href;
 }catch{return null;}
}
function day(value){
 const s=toAsciiDigits(value).trim();
 if(!validPublicationDate(s))return null;
 const m=s.match(/^(1[34]\d\d)[/\-](\d\d?)[/\-](\d\d?)/);
 return m?[m[1],m[2].padStart(2,'0'),m[3].padStart(2,'0')].join('/'):null;
}
function checkFinancialEvidence(data,expectedSymbol){
 const errors=[];
 if(!data||typeof data!=='object'||Array.isArray(data))return {status:'INSUFFICIENT_EVIDENCE',errors:['MISSING_DOCUMENT'],fields:[]};
 if(!normalizeSymbol(expectedSymbol)||normalizeSymbol(data.symbol)!==normalizeSymbol(expectedSymbol))errors.push('SYMBOL_MISMATCH');
 const tracing=toAsciiDigits(data.tracing_no).trim();
 if(!/^\d{1,20}$/.test(tracing)||BigInt(tracing||'0')<=0n)errors.push('INVALID_TRACING');
 const url=safeReportUrl(data.report_url);
 if(!url)errors.push('INVALID_REPORT_URL');
 else {
  const reportSerial=new URL(url).searchParams.get('LetterSerial');
  if(!reportSerial||toAsciiDigits(reportSerial).trim()!==tracing)errors.push('REPORT_TRACING_MISMATCH');
 }
 const pub=day(data.publication_date),end=day(data.period_end);
 if(!pub||!end)errors.push('INVALID_DATES');
 if(pub&&end&&end>pub)errors.push('PERIOD_AFTER_PUBLICATION');
 if(!UNITS.has(data.unit))errors.push('INVALID_UNIT');
 if(!AUDITS.has(data.audit_status))errors.push('INVALID_AUDIT_STATUS');
 if(!BASES.has(data.statement_basis))errors.push('INVALID_STATEMENT_BASIS');
 if(!/^[a-f0-9]{64}$/i.test(String(data.document_sha256??'')))errors.push('MISSING_OR_INVALID_SHA256');
 if(data.original_document_read!==true)errors.push('ORIGINAL_DOCUMENT_NOT_READ');
 if(!data.fields||typeof data.fields!=='object'||Array.isArray(data.fields)||!Object.keys(data.fields).length)errors.push('MISSING_FIELDS');
 const fields=[];
 for(const [name,row] of Object.entries(data.fields||{})){
  if(!METRICS.has(name)){errors.push('UNSUPPORTED_METRIC');continue;}
  if(!row||typeof row.amount!=='number'||!Number.isFinite(row.amount)||
     typeof row.source_row!=='string'||!row.source_row.trim()||row.source_row.length>240||
     !Number.isInteger(row.source_page)||row.source_page<1||row.source_page>99999){
   errors.push('UNTRACEABLE_FIELD');continue;
  }
  const fieldUnit=row.unit??(name==='shares_outstanding'?'SHARES':data.unit);
  const isShareMetric=name==='shares_outstanding'||name==='weighted_average_shares'||name==='dividend_eligible_shares';
  if(isShareMetric?!SHARE_UNITS.has(fieldUnit):fieldUnit!==data.unit){
   errors.push('INVALID_FIELD_UNIT');continue;
  }
  if((name==='total_assets'||name==='total_liabilities')&&row.amount<0){
   errors.push('NEGATIVE_BALANCE_SHEET_TOTAL');continue;
  }
  if(name==='cash_dividend_approved_total'&&row.amount<0){
   errors.push('NEGATIVE_FINANCIAL_AMOUNT');continue;
  }
  if((name==='shares_outstanding'||name==='weighted_average_shares'||name==='dividend_eligible_shares')&&row.amount<=0){
   errors.push(name==='shares_outstanding'?'INVALID_SHARES_OUTSTANDING':'INVALID_WEIGHTED_AVERAGE_SHARES');continue;
  }
  fields.push({name,amount:row.amount,unit:fieldUnit,source_row:row.source_row,source_page:row.source_page});
 }
 const byName=Object.fromEntries(fields.map(x=>[x.name,x.amount]));
 let accountingCheck=null;
 if(['total_assets','total_liabilities','equity'].every(k=>Object.hasOwn(byName,k))){
  const assets=byName.total_assets,liabilities=byName.total_liabilities,equity=byName.equity;
  const difference=assets-(liabilities+equity);
  const tolerance=Math.max(2,Math.abs(assets)*0.001);
  accountingCheck={status:Math.abs(difference)<=tolerance?'PASS_WITH_ROUNDING_TOLERANCE':'MISMATCH',
   difference,tolerance,formula:'total_assets = total_liabilities + equity'};
  if(accountingCheck.status==='MISMATCH')errors.push('BALANCE_SHEET_EQUATION_MISMATCH');
 }
 return {status:errors.length?'INSUFFICIENT_EVIDENCE':'READY_FOR_REVIEW',
   errors,fields:errors.length?[]:fields,accountingCheck,
   note:'READY_FOR_REVIEW does not authenticate the published report or authorize trading signals. Balance-sheet checks are arithmetic consistency checks only.'};
}
function calculateEPS(data,expectedSymbol,adjustedShareBasis){
 const checked=checkFinancialEvidence(data,expectedSymbol);
 if(checked.status!=='READY_FOR_REVIEW')return {status:'INSUFFICIENT_EVIDENCE',errors:checked.errors,eps:null};
 const byName=Object.fromEntries(checked.fields.map(x=>[x.name,x]));
 const income=byName.net_income_attributable_to_parent;
 let shares=byName.weighted_average_shares,shareBasisType='REPORTED_WEIGHTED_AVERAGE_SHARES';
 if(adjustedShareBasis!==undefined){
  const source=adjustedShareBasis?.source;
  const validBasis=adjustedShareBasis?.status==='CAPITAL_ADJUSTED_WA_SHARES_READY_FOR_REVIEW'&&
   normalizeSymbol(adjustedShareBasis.symbol)===normalizeSymbol(expectedSymbol)&&
   adjustedShareBasis.periodEnd===data.period_end&&adjustedShareBasis.unit==='SHARES'&&
   Number.isFinite(adjustedShareBasis.weightedAverageShares)&&adjustedShareBasis.weightedAverageShares>0&&
   source&&typeof source.row==='string'&&source.row.trim()&&Number.isInteger(source.page)&&source.page>0;
  if(!validBasis)return {status:'INSUFFICIENT_EVIDENCE',errors:['INVALID_OR_MISMATCHED_CAPITAL_ADJUSTED_SHARE_BASIS'],eps:null};
  shares={amount:adjustedShareBasis.weightedAverageShares,unit:'SHARES',
   source_row:'Restated weighted-average shares: '+source.row,source_page:source.page};
  shareBasisType=Array.isArray(adjustedShareBasis.actions)?'CAPITAL_ACTION_SEQUENCE_RESTATED_WEIGHTED_AVERAGE_SHARES':'CAPITAL_ACTION_RESTATED_WEIGHTED_AVERAGE_SHARES';
 }
 if(!income||!shares)return {status:'INSUFFICIENT_EVIDENCE',errors:['EPS_REQUIRES_PARENT_ATTRIBUTABLE_NET_INCOME_AND_WEIGHTED_AVERAGE_SHARES'],eps:null};
 if(shares.unit!=='SHARES'||!Number.isFinite(shares.amount)||shares.amount<=0)
  return {status:'INSUFFICIENT_EVIDENCE',errors:['INVALID_WEIGHTED_AVERAGE_SHARES'],eps:null};
 const scale={IRR:1,THOUSAND_IRR:1000,MILLION_IRR:1000000}[income.unit];
 if(!scale||income.unit!==data.unit)return {status:'INSUFFICIENT_EVIDENCE',errors:['EPS_UNIT_MISMATCH'],eps:null};
 const numerator=income.amount*scale;
 if(!Number.isFinite(numerator))return {status:'INSUFFICIENT_EVIDENCE',errors:['EPS_NUMERATOR_OUT_OF_RANGE'],eps:null};
 const eps=numerator/shares.amount;
 if(!Number.isFinite(eps))return {status:'INSUFFICIENT_EVIDENCE',errors:['EPS_RESULT_OUT_OF_RANGE'],eps:null};
 return {status:'EPS_READY_FOR_REVIEW',eps:{valueRialPerShare:eps,currency:'IRR',periodEnd:data.period_end,
  statementBasis:data.statement_basis,netIncomeSource:{row:income.source_row,page:income.source_page},
  weightedAverageSharesSource:{row:shares.source_row,page:shares.source_page},
  shareBasisType,
  capitalAdjustmentPeriodEnd:adjustedShareBasis?.periodEnd??null,
  capitalAdjustmentCount:Array.isArray(adjustedShareBasis?.actions)?adjustedShareBasis.actions.length:(adjustedShareBasis?1:0),
  capitalAdjustmentSources:Array.isArray(adjustedShareBasis?.sources)?adjustedShareBasis.sources:null,
  formula:'net_income_attributable_to_parent_in_IRR / weighted_average_shares'},
  note:'EPS is an arithmetic derivation from user-supplied, traceable rows; it is not independently verified against CODAL and is not a trading signal.'};
}

function calculateDPS(data,expectedSymbol){
 const checked=checkFinancialEvidence(data,expectedSymbol);
 if(checked.status!=='READY_FOR_REVIEW')return {status:'INSUFFICIENT_EVIDENCE',errors:checked.errors,dps:null};
 const errors=[];
 if(data.dividend_status!=='APPROVED_BY_AGM')errors.push('DIVIDEND_NOT_APPROVED_BY_AGM');
 const recordDate=day(data.dividend_record_date);
 if(!recordDate)errors.push('INVALID_DIVIDEND_RECORD_DATE');
 const sourceOk=(row,page)=>typeof row==='string'&&row.trim().length>0&&row.length<=240&&Number.isInteger(page)&&page>0&&page<=99999;
 if(!sourceOk(data.dividend_approval_source_row,data.dividend_approval_source_page)||
    !sourceOk(data.dividend_record_date_source_row,data.dividend_record_date_source_page))
  errors.push('UNTRACEABLE_DIVIDEND_APPROVAL_OR_RECORD_DATE');
 const byName=Object.fromEntries(checked.fields.map(x=>[x.name,x]));
 const total=byName.cash_dividend_approved_total,shares=byName.dividend_eligible_shares;
 if(!total||!shares)errors.push('DPS_REQUIRES_APPROVED_CASH_DIVIDEND_TOTAL_AND_RECORD_DATE_ELIGIBLE_SHARES');
 if(errors.length)return {status:'INSUFFICIENT_EVIDENCE',errors,dps:null};
 const scale={IRR:1,THOUSAND_IRR:1000,MILLION_IRR:1000000}[total.unit];
 if(!scale||total.unit!==data.unit||shares.unit!=='SHARES')
  return {status:'INSUFFICIENT_EVIDENCE',errors:['DPS_UNIT_MISMATCH'],dps:null};
 const totalRial=total.amount*scale;
 if(!Number.isFinite(totalRial))return {status:'INSUFFICIENT_EVIDENCE',errors:['DPS_NUMERATOR_OUT_OF_RANGE'],dps:null};
 const dps=totalRial/shares.amount;
 if(!Number.isFinite(dps))return {status:'INSUFFICIENT_EVIDENCE',errors:['DPS_RESULT_OUT_OF_RANGE'],dps:null};
 return {status:'DPS_READY_FOR_REVIEW',dps:{valueRialPerShare:dps,currency:'IRR',recordDate:data.dividend_record_date,
  dividendStatus:data.dividend_status,
  approvalSource:{row:data.dividend_approval_source_row,page:data.dividend_approval_source_page},
  recordDateSource:{row:data.dividend_record_date_source_row,page:data.dividend_record_date_source_page},
  totalDividendSource:{row:total.source_row,page:total.source_page},
  eligibleSharesSource:{row:shares.source_row,page:shares.source_page},
  formula:'AGM_approved_cash_dividend_total_in_IRR / shares_entitled_on_record_date'},
  note:'DPS is a gross arithmetic derivation from AGM-approved total cash dividends and record-date eligible shares. It is not independently verified against CODAL, does not include investor-specific tax or withholding, and is not a trading signal.'};
}

function calculateFinancialRatios(data,expectedSymbol,{marketPriceEvidence,asOfDate,maxMarketAgeDays=7}={}){
 const checked=checkFinancialEvidence(data,expectedSymbol);
 if(checked.status!=='READY_FOR_REVIEW')return {status:'INSUFFICIENT_EVIDENCE',errors:checked.errors,ratios:null,flags:[]};
 const fields=Object.fromEntries(checked.fields.map(x=>[x.name,x]));
 const scale={IRR:1,THOUSAND_IRR:1000,MILLION_IRR:1000000}[data.unit];
 const amount=name=>fields[name]?fields[name].amount*scale:null;
 const revenue=amount('revenue'),operatingProfit=amount('operating_profit');
 const netIncome=amount('net_income')??amount('net_income_attributable_to_parent');
 const parentIncome=amount('net_income_attributable_to_parent');
 const assets=amount('total_assets'),liabilities=amount('total_liabilities'),equity=amount('equity');
 const returnEquity=amount('equity_attributable_to_parent')??(data.statement_basis==='STANDALONE'?equity:null);
 const operatingCashFlow=amount('operating_cash_flow');
 const shares=fields.shares_outstanding?.amount??null;
 const ratios={},flags=[];
 const ratio=(n,d)=>Number.isFinite(n)&&Number.isFinite(d)&&d!==0&&Number.isFinite(n/d)?n/d:null;
 const pct=(n,d)=>{const x=ratio(n,d);return x===null?null:x*100;};
 if(revenue!==null&&revenue>0){
  if(operatingProfit!==null)ratios.operatingMarginPct=pct(operatingProfit,revenue);
  if(netIncome!==null)ratios.netMarginPct=pct(netIncome,revenue);
  if(shares)ratios.salesPerShareRial=ratio(revenue,shares);
 }else if(revenue!==null)flags.push('NON_POSITIVE_REVENUE');
 if(parentIncome!==null&&returnEquity!==null){
  if(returnEquity>0)ratios.roePct=pct(parentIncome,returnEquity);
  else flags.push('NON_POSITIVE_PARENT_EQUITY_ROE_UNAVAILABLE');
 }else if(parentIncome!==null)flags.push('ROE_REQUIRES_PARENT_ATTRIBUTABLE_EQUITY_FOR_CONSOLIDATED_STATEMENTS');
 if(netIncome!==null&&assets!==null&&assets>0)ratios.roaPct=pct(netIncome,assets);
 if(liabilities!==null&&assets!==null&&assets>0)ratios.liabilitiesToAssetsPct=pct(liabilities,assets);
 if(liabilities!==null&&equity!==null){
  if(equity>0)ratios.liabilitiesToEquity=ratio(liabilities,equity);
  else flags.push('LEVERAGE_RATIO_UNAVAILABLE_NON_POSITIVE_EQUITY');
 }
 if(operatingCashFlow!==null&&netIncome!==null){
  if(netIncome>0){
   ratios.operatingCashFlowToNetIncome=ratio(operatingCashFlow,netIncome);
   if(ratios.operatingCashFlowToNetIncome<0)flags.push('NEGATIVE_OPERATING_CASH_FLOW_WITH_POSITIVE_EARNINGS');
   else if(ratios.operatingCashFlowToNetIncome<0.8)flags.push('LOW_OPERATING_CASH_FLOW_CONVERSION');
  }else flags.push('CASH_CONVERSION_NOT_INTERPRETABLE_WITH_NON_POSITIVE_EARNINGS');
 }
 if(operatingProfit!==null&&operatingProfit<0)flags.push('NEGATIVE_OPERATING_PROFIT');
 if(netIncome!==null&&netIncome<0)flags.push('NEGATIVE_NET_INCOME');
 if(ratios.liabilitiesToEquity!==undefined&&ratios.liabilitiesToEquity>2)flags.push('HIGH_LIABILITIES_TO_EQUITY_REVIEW');
 let valuation={status:'NOT_PROVIDED',pe:null,pb:null,ps:null,marketDate:null};
 if(marketPriceEvidence!==undefined){
  const price=marketPriceEvidence;
  const marketOrdinal=value=>{
   const s=toAsciiDigits(value).trim();
   const g=s.match(/^(\\d{4})(\\d{2})(\\d{2})$/);
   if(g){
    const d=new Date(Date.UTC(Number(g[1]),Number(g[2])-1,Number(g[3])));
    if(d.getUTCFullYear()!==Number(g[1])||d.getUTCMonth()+1!==Number(g[2])||d.getUTCDate()!==Number(g[3]))return null;
    return Math.floor(d.getTime()/86400000);
   }
   const normalized=day(s);if(!normalized)return null;
   const [year,month,dayNum]=normalized.split('/').map(Number);
   try{
    const fmt=new Intl.DateTimeFormat('en-u-ca-persian-nu-latn',{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'});
    let start=null;
    for(let d=19;d<=22;d++){
     const candidate=new Date(Date.UTC(year+621,2,d));
     const parts=Object.fromEntries(fmt.formatToParts(candidate).map(p=>[p.type,p.value]));
     if(parts.year===String(year)&&parts.month==='1'&&parts.day==='1'){start=candidate;break;}
    }
    if(!start)return null;
    const offset=(month<=6?(month-1)*31:month<=11?186+(month-7)*30:336)+dayNum-1;
    return Math.floor(start.getTime()/86400000)+offset;
   }catch{return null;}
  };
  const sourceOk=price&&price.status==='VERIFIED_MARKET_CLOSE'&&
   normalizeSymbol(price.symbol)===normalizeSymbol(expectedSymbol)&&
   Number.isFinite(price.closeRialPerShare)&&price.closeRialPerShare>0&&
   marketOrdinal(price.marketDate)!==null&&typeof price.source==='string'&&price.source.trim().length>0;
  const age=asOfDate?(()=>{const a=marketOrdinal(price.marketDate),b=marketOrdinal(asOfDate);return a!==null&&b!==null&&a<=b?b-a:null;})():null;
  if(!sourceOk||!asOfDate||marketOrdinal(asOfDate)===null||age===null||age>maxMarketAgeDays){
   valuation={status:'INSUFFICIENT_MARKET_PRICE_EVIDENCE',pe:null,pb:null,ps:null,marketDate:price?.marketDate??null};
   flags.push('VALUATION_MULTIPLES_WITHHELD_STALE_OR_UNVERIFIED_PRICE');
  }else{
   const eps=calculateEPS(data,expectedSymbol);
   const bookValuePerShare=returnEquity!==null&&shares?returnEquity/shares:null;
   const salesPerShare= revenue!==null&&shares?revenue/shares:null;
   valuation={status:'VALUATION_MULTIPLES_READY_FOR_REVIEW',
    pe:eps.status==='EPS_READY_FOR_REVIEW'&&eps.eps.valueRialPerShare>0?price.closeRialPerShare/eps.eps.valueRialPerShare:null,
    pb:bookValuePerShare!==null&&bookValuePerShare>0?price.closeRialPerShare/bookValuePerShare:null,
    ps:salesPerShare!==null&&salesPerShare>0?price.closeRialPerShare/salesPerShare:null,
    marketPriceRialPerShare:price.closeRialPerShare,marketDate:price.marketDate,source:price.source,
    note:'P/E, P/B and P/S are arithmetic multiples, not intrinsic value estimates or buy/sell thresholds.'};
   if(valuation.pe===null)flags.push('PE_UNAVAILABLE_NON_POSITIVE_OR_UNSUPPORTED_EPS');
   if(valuation.pb===null)flags.push('PB_UNAVAILABLE_NON_POSITIVE_BOOK_VALUE');
   if(valuation.ps===null)flags.push('PS_UNAVAILABLE_NON_POSITIVE_SALES_PER_SHARE');
  }
 }
 return {status:'FINANCIAL_RATIOS_READY_FOR_REVIEW',symbol:normalizeSymbol(expectedSymbol),
  periodEnd:data.period_end,statementBasis:data.statement_basis,unit:'PERCENT_OR_MULTIPLE',
  ratios,valuation,flags,
  sources:checked.fields.map(x=>({metric:x.name,row:x.source_row,page:x.source_page})),
  note:'Ratios are calculated from one supplied reporting period and source rows. ROE/ROA are not annualized; ratios are not normalized for seasonality, exceptional items, group structure or accounting policy. Flags are review prompts, not ratings.'};
}
 
return {normalizeSymbol,safeReportUrl,checkFinancialEvidence,calculateEPS,calculateDPS,calculateFinancialRatios};
});
