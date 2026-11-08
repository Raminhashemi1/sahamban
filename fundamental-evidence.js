'use strict';
const {normalizeSymbol,toAsciiDigits,validPublicationDate}=require('./tests/codal-search-quality.cjs');
const UNITS=new Set(['IRR','THOUSAND_IRR','MILLION_IRR']);
const SHARE_UNITS=new Set(['SHARES']);
const AUDITS=new Set(['AUDITED','UNAUDITED']);
const BASES=new Set(['STANDALONE','CONSOLIDATED']);
const METRICS=new Set(['revenue','operating_profit','net_income','net_income_attributable_to_parent','total_assets','total_liabilities','equity','operating_cash_flow','shares_outstanding','weighted_average_shares','cash_dividend_approved_total','dividend_eligible_shares']);
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
function calculateEPS(data,expectedSymbol){
 const checked=checkFinancialEvidence(data,expectedSymbol);
 if(checked.status!=='READY_FOR_REVIEW')return {status:'INSUFFICIENT_EVIDENCE',errors:checked.errors,eps:null};
 const byName=Object.fromEntries(checked.fields.map(x=>[x.name,x]));
 const income=byName.net_income_attributable_to_parent,shares=byName.weighted_average_shares;
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
module.exports={safeReportUrl,checkFinancialEvidence,calculateEPS,calculateDPS};
