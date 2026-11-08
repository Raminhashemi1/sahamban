'use strict';
const {normalizeSymbol,toAsciiDigits,validPublicationDate}=require('./tests/codal-search-quality.cjs');
const UNITS=new Set(['IRR','THOUSAND_IRR','MILLION_IRR']);
const SHARE_UNITS=new Set(['SHARES']);
const AUDITS=new Set(['AUDITED','UNAUDITED']);
const BASES=new Set(['STANDALONE','CONSOLIDATED']);
const METRICS=new Set(['revenue','operating_profit','net_income','total_assets','total_liabilities','equity','operating_cash_flow','shares_outstanding']);
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
  if(name==='shares_outstanding'?!SHARE_UNITS.has(fieldUnit):fieldUnit!==data.unit){
   errors.push('INVALID_FIELD_UNIT');continue;
  }
  if((name==='total_assets'||name==='total_liabilities')&&row.amount<0){
   errors.push('NEGATIVE_BALANCE_SHEET_TOTAL');continue;
  }
  if(name==='shares_outstanding'&&row.amount<=0){
   errors.push('INVALID_SHARES_OUTSTANDING');continue;
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
module.exports={safeReportUrl,checkFinancialEvidence};
