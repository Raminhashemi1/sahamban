'use strict';
const symbols=['ذوب','دی','لکما','چکاپا','آبادا','وملل','فروژ'];
const base='https://cdn.tsetmc.com/api';
async function get(path){
 const r=await fetch(base+path,{headers:{'user-agent':'Sahamban-diagnostic/1.0'},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('HTTP '+r.status+' '+path);
 return r.json();
}
(async()=>{
 for(const symbol of symbols){
  try{
   const search=await get('/Instrument/GetInstrumentSearch/'+encodeURIComponent(symbol));
   const rows=(search.instrumentSearch||[]).filter(x=>String(x.lVal18AFC||'').replace(/[\\u200c\\u200e\\u200f\\uFEFF\\s]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک').toUpperCase()===symbol);
   const results=await Promise.all(rows.slice(0,10).map(async c=>{
    const [info,history]=await Promise.allSettled([
     get('/Instrument/GetInstrumentInfo/'+c.insCode),
     get('/ClosingPrice/GetClosingPriceDailyList/'+c.insCode+'/0')
    ]);
    const id=info.status==='fulfilled'?(info.value.instrumentInfo||info.value):{};
    const daily=history.status==='fulfilled'?(history.value.closingPriceDaily||[]):[];
    const valid=daily.filter(x=>/^\\d{8}$/.test(String(x.dEven))&&Number(x.pClosing)>0).sort((a,b)=>String(a.dEven).localeCompare(String(b.dEven)));
    return {insCode:String(c.insCode),name:c.lVal18AFC,display:c.lVal30,cIsin:id.cIsin||c.cIsin,instrumentID:id.instrumentID||c.instrumentID,flow:id.flow??c.flow,flowTitle:id.flowTitle||c.flowTitle,yVal:id.yVal??c.yVal,yMarNSC:id.yMarNSC||c.yMarNSC,historyCount:valid.length,first:valid[0]?.dEven,last:valid.at(-1)?.dEven,lastClose:valid.at(-1)?.pClosing,error:history.status==='rejected'?String(history.reason):null};
   }));
   console.log(JSON.stringify({symbol,candidateCount:rows.length,candidates:results}));
  }catch(e){console.log(JSON.stringify({symbol,error:String(e)}));}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
