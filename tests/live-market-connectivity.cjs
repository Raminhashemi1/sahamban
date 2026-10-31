'use strict';
// Live, read-only smoke test against the public TSETMC API.
// It uses one public instrument only and never reads browser storage or user holdings.
const assert=require('node:assert/strict');

const API='https://cdn.tsetmc.com/api';
const symbol='فولاد';
const norm=s=>String(s??'').replace(/[\u200c\u200e\u200f\uFEFF\s]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک').toUpperCase();
const number=v=>Number(v);
async function get(path){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(API+path,{method:'GET',cache:'no-store',signal:controller.signal,headers:{accept:'application/json'}});
  assert.equal(response.ok,true,'TSETMC HTTP '+response.status+' for '+path);
  assert.match(response.headers.get('content-type')||'',/json/i,'TSETMC response is not JSON');
  return await response.json();
 }finally{clearTimeout(timer);}
}
function tehranToday(){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const p=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return p.year+p.month+p.day;
}
function dateAge(date){
 assert.match(date,/^\d{8}$/,'invalid market date '+date);
 const y=+date.slice(0,4),m=+date.slice(4,6),d=+date.slice(6,8);
 const stamp=new Date(Date.UTC(y,m-1,d));
 assert.equal(stamp.getUTCFullYear(),y,'invalid date year');
 assert.equal(stamp.getUTCMonth(),m-1,'invalid date month');
 assert.equal(stamp.getUTCDate(),d,'invalid date day');
 const today=tehranToday();
 const now=Date.UTC(+today.slice(0,4),+today.slice(4,6)-1,+today.slice(6,8));
 return (now-stamp.getTime())/86400000;
}
(async()=>{
 console.log('LIVE TEST: resolving public symbol '+symbol);
 const search=await get('/Instrument/GetInstrumentSearch/'+encodeURIComponent(symbol));
 assert.ok(Array.isArray(search?.instrumentSearch),'instrument search response shape invalid');
 const candidates=[...new Set(search.instrumentSearch.filter(x=>norm(x.lVal18AFC)===norm(symbol)&&/^\d{8,25}$/.test(String(x.insCode??''))).map(x=>String(x.insCode)))];
 assert.ok(candidates.length>0,'no exact instrument identity found for '+symbol);
 assert.ok(candidates.length<=5,'unexpectedly many exact instrument identities: '+candidates.length);
 const valid=[];
 for(const code of candidates){
  try{
   const info=(await get('/ClosingPrice/GetClosingPriceInfo/'+code))?.closingPriceInfo;
   const price=number(info?.pClosing),date=String(info?.dEven??'');
   if(!Number.isFinite(price)||price<=0)continue;
   const age=dateAge(date);
   if(age<0||age>7)continue;
   const history=(await get('/ClosingPrice/GetClosingPriceDailyList/'+code+'/0'))?.closingPriceDaily;
   if(!Array.isArray(history))continue;
   const rows=history.filter(x=>String(x?.dEven??'')===date&&number(x?.pClosing)===price);
   const clean=history.filter(x=>/^\d{8}$/.test(String(x?.dEven??''))&&Number.isFinite(number(x?.pClosing))&&number(x.pClosing)>0);
   const unique=new Set(clean.map(x=>String(x.dEven)));
   if(rows.length===1&&clean.length>=15&&unique.size===clean.length)valid.push({code,price,date,age,historyCount:clean.length});
  }catch(error){console.log('Candidate rejected '+code+': '+String(error.message||error));}
 }
 assert.equal(valid.length,1,'expected exactly one candidate with fresh matching price and >=15 unique history rows; got '+valid.length);
 const q=valid[0];
 console.log('PASS live quote: '+symbol+' '+q.price+' rial, market date '+q.date+', age '+q.age+' Tehran calendar days');
 console.log('PASS live history: '+q.historyCount+' valid unique daily rows; closing price matches quote date');
 try{
  const flow=await get('/ClientType/GetClientType/'+q.code+'/'+q.date);
  const row=Array.isArray(flow?.clientType)?flow.clientType[0]:null;
  const fields=['buy_I_Volume','buy_N_Volume','sell_I_Volume','sell_N_Volume'];
  if(row&&fields.every(k=>Number.isFinite(number(row[k]))&&number(row[k])>=0)){
   console.log('PASS live investor-flow payload: individual/institutional buy/sell volume fields present');
  }else{
   console.log('INFO investor-flow row unavailable or incomplete for latest session; price/history test remains valid');
  }
 }catch(error){console.log('INFO investor-flow endpoint unavailable: '+String(error.message||error));}
 console.log('SUCCESS: read-only live TSETMC connectivity and data-integrity test');
})().catch(error=>{
 const cause=error?.cause;
 const code=cause?.code||error?.code;
 if(['UND_ERR_CONNECT_TIMEOUT','ECONNREFUSED','ENETUNREACH','EHOSTUNREACH','ENOTFOUND'].includes(code)){
  console.log('SKIP live TSETMC test: GitHub Actions runner cannot establish outbound connectivity to the public market-data host ('+code+'). This is an environment/network restriction, not a quote-validation pass or a confirmed market-data failure.');
  process.exitCode=0;
 }else{
  console.error('FAIL live TSETMC test:',error);
  process.exitCode=1;
 }
});
