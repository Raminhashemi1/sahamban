'use strict';
/* Read-only CSV diagnostic. Validates internal consistency; never attests provider or modifies prices. */
const fs=require('node:fs'),crypto=require('node:crypto');
const REQUIRED=['نماد','تاریخ شمسی','قیمت پایانی (ریال)','قیمت پایانی روز قبل (ریال)','قیمت پایانی تعدیل‌شده (ریال)','ضریب تعدیل','تعداد معاملات'];
function parseCsv(value){
 const t=value.replace(/^\uFEFF/,'');const records=[];let row=[],part='',quoted=false;
 for(let i=0;i<t.length;i++){
  const c=t[i];
  if(quoted){
   if(c==='"'&&t[i+1]==='"'){part+='"';i++;}
   else if(c==='"')quoted=false;
   else part+=c;
  }else if(c==='"'){if(part)throw Error('INVALID_CSV_QUOTE');quoted=true;}
  else if(c===','){row.push(part);part='';}
  else if(c==='\n'){row.push(part.replace(/\r$/,''));records.push(row);row=[];part='';}
  else part+=c;
 }
 if(quoted)throw Error('UNCLOSED_CSV_QUOTE');
 if(row.length||part){row.push(part.replace(/\r$/,''));records.push(row);}
 if(records.length<2)throw Error('EMPTY_CSV');
 const key=h=>h.replace(/[\u200c\u200e\u200f]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک').trim();
 const canonical=new Map(REQUIRED.map(h=>[key(h),h]));
 const headers=records.shift().map(h=>canonical.get(key(h))??h.trim());
 if(new Set(headers).size!==headers.length)throw Error('DUPLICATE_COLUMNS');
 for(const h of REQUIRED)if(!headers.includes(h))throw Error('MISSING_COLUMN: '+h);
 return records.map(values=>{
  if(values.length!==headers.length)throw Error('INVALID_CSV_ROW_WIDTH');
  return Object.fromEntries(headers.map((h,i)=>[h,values[i]]));
 });
}
const positive=v=>{
 if(typeof v!=='string'||!/^\d+(?:\.\d+)?$/.test(v)||!Number.isFinite(Number(v))||Number(v)<=0)throw Error('INVALID_POSITIVE_NUMBER');
 return Number(v);
};
function auditCsv(bytes,{symbol='غشهداب',date='1399-03-06'}={}){
 const rows=parseCsv(bytes.toString('utf8')),map=new Map();
 for(const r of rows){
  if(r['نماد']!==symbol)throw Error('SYMBOL_MISMATCH');
  const day=r['تاریخ شمسی'];
  if(!/^1[34]\d\d-\d\d-\d\d$/.test(day))throw Error('INVALID_DATE');
  if(map.has(day))throw Error('DUPLICATE_DATE');
  map.set(day,r);
 }
 const days=[...map.keys()].sort(),i=days.indexOf(date);
 if(i<0)throw Error('TARGET_DATE_NOT_FOUND');
 if(i===0||i===days.length-1)throw Error('INSUFFICIENT_ADJACENT_HISTORY');
 const target=map.get(date),prev=map.get(days[i-1]),next=map.get(days[i+1]);
 const close=positive(target['قیمت پایانی (ریال)']),yesterday=positive(target['قیمت پایانی روز قبل (ریال)']);
 const adjusted=positive(target['قیمت پایانی تعدیل‌شده (ریال)']),factor=positive(target['ضریب تعدیل']);
 const matchingPreviousClose=positive(prev['قیمت پایانی (ریال)'])===yesterday;
 const sameFactor=Math.abs(factor-positive(prev['ضریب تعدیل']))<1e-10&&Math.abs(factor-positive(next['ضریب تعدیل']))<1e-10;
 const consistentAdjustedPrice=Math.abs(adjusted-close*factor)<=0.011;
 return {
  status:matchingPreviousClose&&sameFactor&&consistentAdjustedPrice?'CSV_INTERNAL_CONSISTENCY_PASS':'CSV_INTERNAL_CONSISTENCY_REVIEW',
  source:'USER_SUPPLIED_CSV',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),
  rowCount:rows.length,symbol,date,previousDate:days[i-1],nextDate:days[i+1],
  closeIRR:close,previousCloseIRR:yesterday,adjustedCloseIRR:adjusted,cumulativeAdjustmentFactor:factor,
  rawReturnPct:(close/yesterday-1)*100,tradeCount:positive(target['تعداد معاملات']),
  checks:{matchingPreviousClose,sameFactorAcrossAdjacentTradingDays:sameFactor,consistentAdjustedCloseRounding:consistentAdjustedPrice},
  providerAuthenticated:false,corporateActionProven:false,capitalAdjustmentAllowed:false,historyMutated:false,tradingSignalsEnabled:false,
  note:'Internal CSV consistency only; event-specific adjustment factors and TSETMC provenance are not verified.'
 };
}
if(require.main===module){
 try{
  if(!process.argv[2])throw Error('USAGE: node tools/audit-gheshdab-price-csv.cjs history.csv');
  const bytes=fs.readFileSync(process.argv[2]);
  if(bytes.length>10_000_000)throw Error('CSV_TOO_LARGE');
  console.log(JSON.stringify(auditCsv(bytes),null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports={parseCsv,auditCsv};
