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
  console.log('INTEGRATION PASS: TSETMC search and quote endpoints reachable from GitHub Actions; exact ticker فولاد, price='+price+' rial, marketDate='+date+', calendarAgeDays='+age+'. This does not verify browser CORS or access from the phone browser.');
 }catch(error){
  console.log('INTEGRATION BLOCKED/UNVERIFIED: '+(error.name==='AbortError'?'request timed out':error.message)+'. This is not a passing live-data test; browser CORS and phone-network access remain unverified.');
 }

(async()=>{
 const url='https://webgw.tse.ir/InstrumentProvider/api/v1/MarketWatch/MarketWatchCash/fa';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch(url,{signal:controller.signal,cache:'no-store',headers:{
   accept:'application/json, text/plain, */*',
   'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
   referer:'https://www.tse.ir/',
   origin:'https://www.tse.ir'
  }});
  if(!response.ok)throw Error('HTTP '+response.status);
  const type=response.headers.get('content-type')||'';
  if(!type.toLowerCase().includes('json'))throw Error('response is not JSON');
  const data=await response.json();
  if(!Array.isArray(data?.Items))throw Error('MarketWatchCash Items array missing');
  console.log('OFFICIAL GATEWAY PASS: webgw.tse.ir returned '+data.Items.length+' market-watch rows. Sample field names: '+Object.keys(data.Items[0]||{}).slice(0,20).join(', ')+'. This runner cannot establish browser CORS or phone access.');
 }catch(error){
  console.log('OFFICIAL GATEWAY BLOCKED/UNVERIFIED: '+(error.name==='AbortError'?'request timed out':error.message)+'. No alternative source has been approved for production.');
 }finally{clearTimeout(timer);}
})();
})();
