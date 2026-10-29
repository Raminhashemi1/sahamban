'use strict';
// Best-effort live endpoint probe. A blocked probe is reported, never mislabeled as a passing test.
const base='https://cdn.tsetmc.com/api';
async function json(path){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch(base+path,{signal:controller.signal,cache:'no-store',headers:{accept:'application/json'}});
  if(!response.ok)throw Error('HTTP '+response.status);
  const type=response.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('json'))throw Error('response is not JSON; possible proxy or access restriction');
  return await response.json();
 }finally{clearTimeout(timer);}
}
(async()=>{
 try{
  const search=await json('/Instrument/GetInstrumentSearch/'+encodeURIComponent('فولاد'));
  const rows=search?.instrumentSearch;
  if(!Array.isArray(rows))throw Error('instrumentSearch field missing');
  const exact=rows.filter(x=>String(x.lVal18AFC||'').replace(/\s/g,'')==='فولاد'&&/^\d{8,25}$/.test(String(x.insCode||'')));
  if(exact.length!==1)throw Error('expected one exact فولاد ticker, received '+exact.length);
  const code=String(exact[0].insCode);
  const quote=await json('/ClosingPrice/GetClosingPriceInfo/'+code);
  const info=quote?.closingPriceInfo;
  const price=Number(info?.pClosing),date=String(info?.dEven??'');
  if(!Number.isFinite(price)||price<=0||!/^\d{8}$/.test(date))throw Error('quote missing valid closing price or YYYYMMDD market date');
  const y=+date.slice(0,4),m=+date.slice(4,6),d=+date.slice(6,8),dt=new Date(Date.UTC(y,m-1,d));
  if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)throw Error('invalid market date '+date);
  const now=new Date(),age=Math.floor((Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())-dt.getTime())/86400000);
  if(age<0||age>7)throw Error('quote is stale or future-dated; market date='+date+', ageDays='+age);
  console.log('INTEGRATION PASS: TSETMC search and quote endpoints reachable from GitHub Actions; exact ticker فولاد, price='+price+' rial, marketDate='+date+', calendarAgeDays='+age+'. This does not verify browser CORS or access from the user's phone.');
 }catch(error){
  console.log('INTEGRATION BLOCKED/UNVERIFIED: '+(error.name==='AbortError'?'request timed out':error.message)+'. This is not a passing live-data test; browser CORS and phone-network access remain unverified.');
 }
})();
