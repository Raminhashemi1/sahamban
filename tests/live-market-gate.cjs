'use strict';
// Real-source release gate. NEVER use mocked prices or report a blocked source as success.
const base='https://cdn.tsetmc.com/api';
const symbol='فولاد';
const normalize=s=>String(s??'').replace(/[\u200c\s]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک');
async function get(path){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetch(base+path,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('HTTP '+response.status+' '+path);
  if(!(response.headers.get('content-type')||'').includes('json'))throw Error('non-JSON response '+path);
  return await response.json();
 }finally{clearTimeout(timer);}
}
function validateDate(raw){
 const s=String(raw??'');
 if(!/^\d{8}$/.test(s))throw Error('invalid Gregorian date '+s);
 const d=new Date(Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8)));
 if(d.getUTCFullYear()!==+s.slice(0,4)||d.getUTCMonth()!==+s.slice(4,6)-1||d.getUTCDate()!==+s.slice(6,8))throw Error('calendar-invalid date '+s);
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
 const age=(Date.UTC(parts.year,parts.month-1,parts.day)-d.getTime())/86400000;
 if(age<0||age>7)throw Error('old or future dated market quote '+s+', calendarDays='+age);
 return s;
}
(async()=>{
 try{
  const search=await get('/Instrument/GetInstrumentSearch/'+encodeURIComponent(symbol));
  const matches=(search?.instrumentSearch||[]).filter(x=>normalize(x.lVal18AFC)===symbol&&/^[0-9]{8,25}$/.test(String(x.insCode??'')));
  const unique=[...new Set(matches.map(x=>String(x.insCode)))];
  if(!unique.length||unique.length>5)throw Error('unverified or excessive ticker candidates; count='+unique.length);
  const verified=[];
  for(const code of unique){
   try{
    const quote=(await get('/ClosingPrice/GetClosingPriceInfo/'+code))?.closingPriceInfo;
    const price=Number(quote?.pClosing),date=validateDate(quote?.dEven);
    if(!Number.isFinite(price)||price<=0)throw Error('invalid closing price');
    const history=(await get('/ClosingPrice/GetClosingPriceDailyList/'+code+'/0'))?.closingPriceDaily;
    if(!Array.isArray(history))throw Error('history array missing');
    const matching=history.filter(x=>String(x.dEven)===date);
    if(matching.length!==1||Number(matching[0].pClosing)!==price)throw Error('closing price does not match daily history');
    verified.push({code,price,date});
   }catch(error){console.warn('Candidate '+code+' rejected: '+String(error?.message||error));}
  }
  if(verified.length!==1)throw Error('verified live ticker count must be exactly one, got '+verified.length);
  const {code,price,date}=verified[0];
  console.log('REAL-MARKET GATE PASS: symbol='+symbol+', insCode='+code+', rialClosing='+price+', gregorianMarketDate='+date);
 }catch(error){
  console.error('REAL-MARKET GATE BLOCKED: '+(error?.name==='AbortError'?'network timeout':String(error?.message||error)));
  console.error('STOP: Live-price integration is unverified. Do not merge/deploy this PR as live-market-ready.');
  process.exitCode=1;
 }
})();
