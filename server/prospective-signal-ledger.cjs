'use strict';
/* Server-only prospective rule journal. Not deployed, not an official feed.
 * The operator must predeclare ALL symbols and verify official source data
 * independently. This cannot establish predictive skill without future data.
 */
const {createHash,randomUUID}=require('node:crypto');
const VERSION='decision-support-v129-fixed';
const CODES=new Set(['ENTRY_CANDIDATE','WAIT','AVOID','EXIT_REVIEW','RISK_EXIT']);
const SYMBOL=/^[\p{L}\p{N}_ .-]{1,35}$/u;
function realDay(x){
 if(typeof x!=='string'||!/^\d{8}$/.test(x))return false;
 const d=new Date(Date.UTC(+x.slice(0,4),+x.slice(4,6)-1,+x.slice(6)));
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10).replaceAll('-','')===x;
}
function time(x){
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x))throw Error('INVALID_SERVER_TIME');
 const t=Date.parse(x);if(!Number.isFinite(t)||new Date(t).toISOString()!==x)throw Error('INVALID_SERVER_TIME');return t;
}
function localDate(t){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(t)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return parts.year+parts.month+parts.day;
}
function historyOf(q,day){
 const h=q?.history;if(!Array.isArray(h)||h.length<60||h.length>2000)return null;
 let last='';
 for(const x of h){
  if(!realDay(x?.date)||x.date<=last||x.date>day||!Number.isSafeInteger(x.close)||x.close<=0)return null;
  last=x.date;
 }
 return last===day?h.map(x=>[x.date,x.close]):null;
}
async function recordProspectiveRun(db,{marketDate,sourceId,universe,snapshots,capturedAt,
 verifyMarketData,calculateDecision,makeId=randomUUID}={}){
 if(!db||typeof db.prepare!=='function'||typeof db.batch!=='function')throw Error('DB_UNAVAILABLE');
 if(!realDay(marketDate)||localDate(time(capturedAt))!==marketDate)throw Error('NOT_CAPTURED_ON_MARKET_DAY');
 if(typeof sourceId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(sourceId))throw Error('INVALID_SOURCE');
 if(!Array.isArray(universe)||!universe.length||universe.length>100||
   universe.some(s=>typeof s!=='string'||!SYMBOL.test(s)||s!==s.trim())||
   new Set(universe).size!==universe.length)throw Error('INVALID_UNIVERSE');
 if(!Array.isArray(snapshots)||snapshots.length!==universe.length)throw Error('INCOMPLETE_UNIVERSE');
 const bySymbol=new Map();
 for(const q of snapshots){
  if(!q||typeof q.symbol!=='string'||bySymbol.has(q.symbol)||!universe.includes(q.symbol))
   throw Error('INCOMPLETE_UNIVERSE');
  bySymbol.set(q.symbol,q);
 }
 if(bySymbol.size!==universe.length||typeof verifyMarketData!=='function'||
   typeof calculateDecision!=='function')throw Error('TRUSTED_PROVENANCE_REQUIRED');
 if(await verifyMarketData({marketDate,sourceId,universe:[...universe],snapshots})!==true)
  throw Error('MARKET_SOURCE_NOT_VERIFIED');
 const runId=makeId();
 if(typeof runId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(runId))throw Error('INVALID_RUN_ID');
 const rows=[];
 for(const symbol of universe){
  const q=bySymbol.get(symbol),hist=historyOf(q,marketDate);
  let r=null;
  if(hist)try{r=await calculateDecision(q,{today:marketDate,maxAgeDays:0});}catch(_){}
  if(!hist||!r||r.symbol!==symbol||r.marketDate!==marketDate||
     !CODES.has(r.code)||!Number.isSafeInteger(r.score)||r.score<0||r.score>100||
     r.last!==hist.at(-1)[1]){
   rows.push({symbol,status:'DATA_UNAVAILABLE',code:null,score:null,close:null,hash:null});
  }else{
   rows.push({symbol,status:'EVALUATED',code:r.code,score:r.score,close:r.last,
    hash:createHash('sha256').update(JSON.stringify(hist)).digest('hex')});
  }
 }
 const unavailable=rows.filter(r=>r.status==='DATA_UNAVAILABLE').length;
 const statements=[
  db.prepare('INSERT INTO prospective_signal_runs(id,market_date,rule_version,source_id,captured_at,universe_count,unavailable_count) VALUES(?,?,?,?,?,?,?)')
   .bind(runId,marketDate,VERSION,sourceId,capturedAt,universe.length,unavailable),
  ...rows.map(r=>db.prepare('INSERT INTO prospective_signal_events(run_id,symbol,status,signal_code,score,close_rial,history_digest) VALUES(?,?,?,?,?,?,?)')
   .bind(runId,r.symbol,r.status,r.code,r.score,r.close,r.hash))
 ];
 let saved;try{saved=await db.batch(statements);}catch(_){throw Error('ATOMIC_PROSPECTIVE_RECORD_FAILED');}
 if(!Array.isArray(saved)||saved.length!==statements.length||
    saved.some(x=>x?.success!==true||x?.meta?.changes!==1))throw Error('PROSPECTIVE_RECORD_NOT_CONFIRMED');
 return Object.freeze({runId,marketDate,ruleVersion:VERSION,universeCount:universe.length,
  evaluatedCount:universe.length-unavailable,unavailableCount:unavailable,
  predictiveSkillValidated:false});
}
module.exports=Object.freeze({recordProspectiveRun,VERSION});
