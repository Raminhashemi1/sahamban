'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const discovery=require('../external-screener-v130.js');
const ranking=require('../candidate-ranking-v133.js');
const sample=require('../market-sample-v131.js');

function rows(n=70){
 const out=[];
 for(let i=0;i<n;i++){
  const d=new Date(Date.UTC(2026,8,1+i,12));
  out.push({date:d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate(),close:1000+i,tradedValue:1000000});
 }
 return out;
}

test('external TSETMC pClosing history is tagged unknown and never labelled raw',()=>{
 const history=rows(60).map(x=>({dEven:x.date,pClosing:x.close,qTotCap:x.tradedValue}));
 const quote=discovery.parseHistory({closingPriceDaily:history},{symbol:'TEST',insCode:'123456789012345'});
 assert.equal(quote.historyPriceBasis,'UNKNOWN_NOT_ATTESTED');
 assert.equal(quote.historyPriceBasisEvidence,'NOT_ESTABLISHED');
 assert.equal(quote.capitalAdjustmentAllowed,false);
 assert.equal(quote.historicalPriceSource.provider,'TSETMC');
 assert.equal(quote.historicalPriceSource.priceField,'pClosing');
 assert.equal(quote.historicalPriceSource.dateCalendar,'GREGORIAN_YYYYMMDD');
});

test('bounded market sample suppresses signal, audit and holdout until basis is attested',async()=>{
 let auditCalls=0,holdoutCalls=0;
 globalThis.SahambanDiscoveryV130={parseHistory(_payload,c){
  return {symbol:c.symbol,insCode:c.insCode,history:rows(70),historyPriceBasis:'UNKNOWN_NOT_ATTESTED',historyPriceBasisEvidence:'NOT_ESTABLISHED',capitalAdjustmentAllowed:false};
 }};
 globalThis.SahambanDecisionV129={analyze(){return {code:'ENTRY_CANDIDATE',action:'candidate',reason:'candidate',score:90,stop:900,target:1200,riskPerShare:100};}};
 globalThis.SahambanSignalAuditV132={audit(){auditCalls++;return {};}};
 globalThis.SahambanHoldoutV134={evaluate(){holdoutCalls++;return {};}};
 const calls=[];
 const fetcher=async url=>{
  calls.push(url);
  const payload=calls.length===1
   ?{tradeTop:[{instrument:{insCode:'123456789012345',lVal18AFC:'TEST'}}]}
   :{closingPriceDaily:[]};
  return {ok:true,headers:{get:()=> 'application/json'},json:async()=>payload};
 };
 const out=await sample.sample({fetcher,today:'20261109',limit:1});
 assert.equal(calls.length,2);
 assert.equal(out.results[0].ok,true);
 assert.equal(out.results[0].report.code,'DATA_BASIS_UNVERIFIED');
 assert.equal(out.results[0].report.stop,null);
 assert.equal(out.results[0].report.target,null);
 assert.equal(out.results[0].historical.error.includes('مبنای تعدیل'),true);
 assert.equal(out.results[0].holdout.error.includes('مبنای تعدیل'),true);
 assert.equal(auditCalls,0);
 assert.equal(holdoutCalls,0);
 assert.equal(ranking.rank(out.results).ranked.length,0);
});

test('decision UI fails closed for missing and explicitly unknown history basis',()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','decision-support-ui-v129.js'),'utf8');
 assert.match(source,/function guardUnattestedHistoryBasis\(report,quote\)/);
 assert.match(source,/quote\?\.historyPriceBasisEvidence==='INDEPENDENTLY_ATTESTED'/);
 assert.match(source,/reports\.push\(guardUnattestedHistoryBasis\(report,q\)\)/);
 assert.match(source,/ارزیابی بازده متوقف شد/);
});

test('sample UI discloses the basis gate and ranking excludes unknown data',()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','market-sample-ui-v131.js'),'utf8');
 assert.match(source,/تأیید مستقل مبنای تعدیل تاریخچه الزامی‌اند/);
 const x={ok:true,symbol:'TEST',report:{code:'ENTRY_CANDIDATE',score:99,last:1000,stop:900},quote:{history:rows(70),historyPriceBasisEvidence:'NOT_ESTABLISHED'}};
 assert.equal(ranking.quality(x).eligible,false);
});

test('external screener labels unknown basis and suppresses its technical entry report',async()=>{
 globalThis.SahambanDecisionV129={analyze(){return {code:'ENTRY_CANDIDATE',action:'candidate',reason:'candidate',score:90,stop:900,target:1200,riskPerShare:100};}};
 const fetcher=async url=>{
  const payload=url.includes('/Instrument/GetInstrumentSearch/')
   ?{instrumentSearch:[{insCode:'123456789012345',lVal18AFC:'TEST'}]}
   :{closingPriceDaily:rows(70).map(x=>({dEven:x.date,pClosing:x.close,qTotCap:x.tradedValue}))};
  return {ok:true,headers:{get:()=> 'application/json'},json:async()=>payload};
 };
 const result=await discovery.screen('TEST',{fetcher,today:'20261109'});
 assert.equal(result[0].ok,true);
 assert.equal(result[0].quote.historyPriceBasis,'UNKNOWN_NOT_ATTESTED');
 assert.equal(result[0].report.code,'DATA_BASIS_UNVERIFIED');
 assert.equal(result[0].report.stop,null);
});
