'use strict';
// Exploratory only: do not turn an unverified third-party response into a portfolio quote.
const paths=[
 ['majid-stocks','https://api.majidapi.ir/bourse?action=stocks'],
 ['majid-last-date','https://api.majidapi.ir/bourse?action=lastTradingDay'],
 ['majid-symbol','https://api.majidapi.ir/bourse?action=search&symbol='+encodeURIComponent('فولاد')]
];
(async()=>{
 for(const [name,url] of paths){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
  try{
   const response=await fetch(url,{signal:controller.signal,cache:'no-store',headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const type=response.headers.get('content-type')||'';
   if(!type.toLowerCase().includes('json'))throw Error('non-JSON content-type '+type);
   const data=await response.json();
   const str=JSON.stringify(data);
   console.log('ALT-SOURCE OBSERVED '+name+' JSON bytes='+str.length+' rootkeys='+Object.keys(data||{}).slice(0,12).join(',')+'; NOT VERIFIED for prices, rial units, timestamp, license or CORS.');
  }catch(error){
   console.log('ALT-SOURCE UNREACHABLE '+name+' '+(error.name==='AbortError'?'timeout':error.message));
  }finally{clearTimeout(timer);}
 }
})();
