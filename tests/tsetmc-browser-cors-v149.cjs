'use strict';
// Read-only browser-origin CORS probe for the existing public TSETMC endpoints.
// One public issuer only; no personal portfolio or localStorage is accessed.
const fs=require('node:fs');
const {chromium}=require('playwright');
const PAGE='https://raminhashemi1.github.io/sahamban/market-connectivity-test.html';
const API='https://cdn.tsetmc.com/api';
const SYMBOL='فولاد';
const report={checkedAt:new Date().toISOString(),page:PAGE,source:API,symbol:SYMBOL,scope:'Read-only CORS/network diagnostic using existing application endpoints; no holdings or storage access.',status:'RUNNING',checks:[]};
const norm=s=>String(s??'').replace(/[\s\u200c\u200e\u200f\ufeff]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک').toUpperCase();
async function nodeGet(url){
 const response=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
 const contentType=response.headers.get('content-type')||'';
 const body=await response.json();
 return {httpStatus:response.status,contentType,ok:response.ok,body};
}
function finish(status,extra={}){
 report.status=status;Object.assign(report,extra);
 fs.mkdirSync('test-artifacts',{recursive:true});
 fs.writeFileSync('test-artifacts/tsetmc-browser-cors-v149.json',JSON.stringify(report,null,2)+'\n');
 console.log('TSETMC_BROWSER_STATUS: '+status);
}
async function main(){
 let browser;
 try{
  const searchUrl=API+'/Instrument/GetInstrumentSearch/'+encodeURIComponent(SYMBOL);
  let nodeSearch;
  try{nodeSearch=await nodeGet(searchUrl);}
  catch(error){report.nodeSearch={status:'UNVERIFIED_NETWORK',errorName:error?.name||null,code:error?.cause?.code||error?.code||null};}
  if(nodeSearch)report.nodeSearch={httpStatus:nodeSearch.httpStatus,contentType:nodeSearch.contentType,ok:nodeSearch.ok};
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
  const page=await context.newPage(),consoleErrors=[],failedRequests=[];
  page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text().slice(0,300));});
  page.on('requestfailed',req=>{if(req.url().includes('tsetmc.com'))failedRequests.push({url:req.url(),failure:req.failure()?.errorText||'unknown'});});
  const nav=await page.goto(PAGE,{waitUntil:'domcontentloaded',timeout:30000}).catch(error=>({error:String(error.message||error)}));
  if(!nav||nav.error){
   finish('UNVERIFIED_PAGE_ORIGIN_UNAVAILABLE',{navigationError:nav?.error||'NO_RESPONSE',nodeSearch:report.nodeSearch});
   return;
  }
  const browserSearch=await page.evaluate(async url=>{
   try{
    const response=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
    const contentType=response.headers.get('content-type')||'';
    const body=await response.json();
    return {httpStatus:response.status,contentType,ok:response.ok,
     instrumentSearchIsArray:Array.isArray(body?.instrumentSearch),
     exactCandidates:Array.isArray(body?.instrumentSearch)?body.instrumentSearch.filter(x=>
      String(x?.lVal18AFC||'').replace(/[\s\u200c\u200e\u200f\ufeff]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک').toUpperCase()==='فولاد').map(x=>String(x.insCode||'')).filter(x=>/^\d{8,25}$/.test(x)).slice(0,5):[]};
   }catch(error){return {errorName:error?.name||null,errorMessage:String(error?.message||error).slice(0,200)};}
  },searchUrl);
  report.browserSearch=browserSearch;
  report.consoleErrors=consoleErrors;
  report.failedRequests=failedRequests;
  if(browserSearch.errorMessage){
   const cors=consoleErrors.some(x=>/cors|cross-origin|access-control-allow-origin/i.test(x));
   const nodeOk=nodeSearch?.ok===true;
   finish(cors&&nodeOk?'UNVERIFIED_CORS_BLOCKED':nodeOk?'UNVERIFIED_BROWSER_POLICY_OR_NETWORK':'UNVERIFIED_NETWORK',{
    corsConsoleEvidence:cors,nodeSearch:report.nodeSearch
   });
   return;
  }
  if(!browserSearch.ok||!browserSearch.instrumentSearchIsArray){
   finish('UNVERIFIED_UPSTREAM_RESPONSE',{nodeSearch:report.nodeSearch});
   return;
  }
  const code=browserSearch.exactCandidates[0];
  if(!code){
   finish('UNVERIFIED_NO_EXACT_INSTRUMENT',{nodeSearch:report.nodeSearch});
   return;
  }
  const quoteUrl=API+'/ClosingPrice/GetClosingPriceInfo/'+code;
  const browserQuote=await page.evaluate(async url=>{
   try{
    const response=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
    const body=await response.json();
    const info=body?.closingPriceInfo;
    return {httpStatus:response.status,ok:response.ok,hasClosingPriceInfo:!!info,
     closingPrice:Number(info?.pClosing??info?.pc)||null,marketDate:String(info?.dEven??info?.date??'')||null};
   }catch(error){return {errorName:error?.name||null,errorMessage:String(error?.message||error).slice(0,200)};}
  },quoteUrl);
  report.browserQuote=browserQuote;
  let nodeQuote;
  try{const q=await nodeGet(quoteUrl);nodeQuote={httpStatus:q.httpStatus,ok:q.ok,hasClosingPriceInfo:!!q.body?.closingPriceInfo};}
  catch(error){nodeQuote={status:'UNVERIFIED_NETWORK',errorName:error?.name||null,code:error?.cause?.code||error?.code||null};}
  report.nodeQuote=nodeQuote;
  const quoteCors=Boolean(browserQuote.errorMessage&&consoleErrors.some(x=>/cors|cross-origin|access-control-allow-origin/i.test(x)));
  if(browserQuote.errorMessage){
   finish(quoteCors&&nodeQuote.ok?'UNVERIFIED_CORS_BLOCKED':'UNVERIFIED_BROWSER_NETWORK',{corsConsoleEvidence:quoteCors});
   return;
  }
  const historyUrl=API+'/ClosingPrice/GetClosingPriceDailyList/'+code+'/0';
  const browserHistory=await page.evaluate(async url=>{
   try{
    const response=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
    const body=await response.json(),rows=body?.closingPriceDaily;
    const valid=Array.isArray(rows)?rows.filter(x=>/^\d{8}$/.test(String(x?.dEven??''))&&Number.isFinite(Number(x?.pClosing))&&Number(x.pClosing)>0):[];
    return {httpStatus:response.status,ok:response.ok,rows:valid.length,latestDate:valid.map(x=>String(x.dEven)).sort().at(-1)||null,
     latestPrice:Number(valid.slice().sort((a,b)=>String(a.dEven).localeCompare(String(b.dEven))).at(-1)?.pClosing)||null};
   }catch(error){return {errorName:error?.name||null,errorMessage:String(error?.message||error).slice(0,200)};}
  },historyUrl);
  report.browserHistory=browserHistory;
  let nodeHistory;
  try{const h=await nodeGet(historyUrl);const rows=h.body?.closingPriceDaily;nodeHistory={httpStatus:h.httpStatus,ok:h.ok,rows:Array.isArray(rows)?rows.length:0};}
  catch(error){nodeHistory={status:'UNVERIFIED_NETWORK',errorName:error?.name||null,code:error?.cause?.code||error?.code||null};}
  report.nodeHistory=nodeHistory;
  if(browserHistory.errorMessage){
   const historyCors=consoleErrors.some(x=>/cors|cross-origin|access-control-allow-origin/i.test(x));
   finish(historyCors&&nodeHistory.ok?'UNVERIFIED_CORS_BLOCKED':'UNVERIFIED_BROWSER_NETWORK',{corsConsoleEvidence:historyCors});
   return;
  }
  const historyLag=Boolean(browserQuote.marketDate&&browserHistory.latestDate&&browserHistory.latestDate<browserQuote.marketDate);
  finish(historyLag?'UNVERIFIED_HISTORY_NOT_PUBLISHED':'CORS_FETCH_PASSED',{
   instrumentCode:code,searchHttpStatus:browserSearch.httpStatus,quoteHttpStatus:browserQuote.httpStatus,
   quotePayloadPresent:browserQuote.hasClosingPriceInfo,quoteDate:browserQuote.marketDate,
   historyHttpStatus:browserHistory.httpStatus,historyRows:browserHistory.rows,
   latestHistoryDate:browserHistory.latestDate,
   note:historyLag?'Browser CORS works, but the daily-history endpoint has not yet published the quote date. Do not treat the quote as history-verified.':'Browser-origin fetch completed; freshness and same-day history/price agreement still require separate validation.'
  });
 }catch(error){
  finish('UNVERIFIED_DIAGNOSTIC_ERROR',{errorName:error?.name||null,errorMessage:String(error?.message||error).slice(0,200)});
 }finally{await browser?.close();}
}
main().catch(error=>{finish('UNVERIFIED_DIAGNOSTIC_ERROR',{errorMessage:String(error?.message||error).slice(0,200)});});
