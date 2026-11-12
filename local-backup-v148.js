'use strict';
/* v148 — local-only portfolio/settings backup. No broker credentials, no network. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.document)api.mount(root);
})(typeof window==='undefined'?null:window,function(){
 const FORMAT='sahamban-local-backup',SCHEMA=1,MAX_FILE=256*1024;
 const KEYS=[
  'sahamban-broker-holdings-v1',
  'sahamban-broker-holdings-v1-previous',
  'sahamban-portfolio-local-v1',
  'sahamban-v1',
  'sahamban-watchlist-v6'
 ];
 const MAX={};
 MAX[KEYS[0]]=75000;MAX[KEYS[1]]=75000;MAX[KEYS[2]]=32000;
 MAX[KEYS[3]]=1200;MAX[KEYS[4]]=15000;
 const parse=(raw)=>{if(typeof raw!=='string')throw Error('داده ذخیره‌شده متنی نیست.');return JSON.parse(raw);};
 const normalize=s=>s.replace(/[\u200c\u200e\u200f\s]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک').toUpperCase();
 const finiteMoney=n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=Number.MAX_SAFE_INTEGER;
 const portfolioNum=v=>Number(String(v).trim().replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/٬/g,'').replace(/٫/g,'.'));
 function validateHoldings(data){
  if(!data||![1,2].includes(data.version)||!Array.isArray(data.holdings)||data.holdings.length<1||data.holdings.length>100)throw Error('ساختار دارایی‌های کارگزاری معتبر نیست.');
  const factor=data.version===1?10:1,seen=new Set();let cost=0,value=0;
  for(const p of data.holdings){
   if(!p||typeof p.symbol!=='string'||!p.symbol.trim()||p.symbol.length>35||
      /[\r\n,;\t]/.test(p.symbol)||seen.has(normalize(p.symbol))||
      !Number.isSafeInteger(p.quantity)||p.quantity<=0||
      !finiteMoney(p.buy)||!finiteMoney(p.current)||p.buy*factor>Number.MAX_SAFE_INTEGER||p.current*factor>Number.MAX_SAFE_INTEGER)
     throw Error('نماد، تعداد یا قیمت دارایی ذخیره‌شده نامعتبر است.');
   seen.add(normalize(p.symbol));
   cost+=p.quantity*p.buy*factor;value+=p.quantity*p.current*factor;
   if(!Number.isFinite(cost)||!Number.isFinite(value)||cost>Number.MAX_SAFE_INTEGER||value>Number.MAX_SAFE_INTEGER)throw Error('جمع ارزش سبد خارج از محدوده محاسبه امن است.');
  }
 }
 function validatePortfolio(data){
  if(!data||![1,2].includes(data.version)||typeof data.data!=='string'||data.data.length>25000)throw Error('ساختار سبد ریسک معتبر نیست.');
  const rows=data.data.trim().split(/\r?\n/).filter(Boolean);
  if(rows.length<1||rows.length>100)throw Error('تعداد سهم در گزارش ریسک نامعتبر است.');
  const names=new Set(),factor=data.version===1?10:1;let sumCost=0,sumValue=0;
  for(const row of rows){
   const cells=row.split(/[,،;\t]/).map(x=>x.trim());
   if(cells.length!==6||!cells[0]||cells[0].length>35||names.has(normalize(cells[0])))throw Error('نماد تکراری یا سطر نامعتبر در سبد ریسک.');
   names.add(normalize(cells[0]));
   const n=cells.slice(1).map(portfolioNum);
   if(!Number.isSafeInteger(n[0])||n[0]<=0||n.slice(1).some(v=>!Number.isFinite(v)||v<=0||v*factor>Number.MAX_SAFE_INTEGER)||
    n[3]>=n[2]||n[4]<=n[2])throw Error('مقادیر سبد ریسک نامعتبر است.');
   sumCost+=n[0]*n[1]*factor;sumValue+=n[0]*n[2]*factor;
   if(!Number.isFinite(sumCost)||!Number.isFinite(sumValue)||sumCost>Number.MAX_SAFE_INTEGER||sumValue>Number.MAX_SAFE_INTEGER)throw Error('جمع مبلغ سبد ریسک خارج از محدوده امن است.');
  }
  for(const field of ['capital','riskCap','stress'])if(typeof data[field]!=='string'||data[field].length>60)throw Error('تنظیمات سبد ریسک نامعتبر است.');
  const concentration=data.concentration??'30';
  if(typeof concentration!=='string'||concentration.length>60)throw Error('سقف تمرکز نامعتبر است.');
  const risk=portfolioNum(data.riskCap),stress=portfolioNum(data.stress),cap=portfolioNum(concentration),capital=data.capital?portfolioNum(data.capital):null;
  if(!(risk>0&&risk<=100&&stress>=0&&stress<=100&&cap>=1&&cap<=100)||
     (capital!==null&&(!Number.isSafeInteger(capital)||capital<=0)))throw Error('محدودیت‌های ریسک نامعتبر است.');
 }
 function validateAlert(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('تنظیمات هشدار نامعتبر است.');
  for(const k of ['symbol','aStop','aTarget']){
   if(data[k]!==undefined&&(typeof data[k]!=='string'||data[k].length>80))throw Error('فیلد هشدار نامعتبر است.');
  }
 }
 function validateWatchlist(data){
  if(!Array.isArray(data)||data.length>20)throw Error('فهرست نمادهای تحت‌نظر نامعتبر است.');
  const seen=new Set();
  for(const p of data){
   if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.length>35||
     typeof p.code!=='string'||!/^[0-9]{8,25}$/.test(p.code)||seen.has(p.code)||
     !finiteMoney(p.stop)||!finiteMoney(p.target)||p.target<=p.stop)throw Error('رکورد فهرست نمادهای تحت‌نظر نامعتبر است.');
   seen.add(p.code);
  }
 }
 function validateOne(key,raw){
  if(!KEYS.includes(key)||typeof raw!=='string'||raw.length>MAX[key])throw Error('کلید یا حجم داده قابل پذیرش نیست.');
  const data=parse(raw);
  if(key===KEYS[0]||key===KEYS[1])validateHoldings(data);
  else if(key===KEYS[2])validatePortfolio(data);
  else if(key===KEYS[3])validateAlert(data);
  else if(key===KEYS[4])validateWatchlist(data);
  return raw;
 }
 function createSnapshot(storage){
  const items={};
  for(const key of KEYS){const raw=storage.getItem(key);if(raw!==null)items[key]=validateOne(key,raw);}
  if(!Object.keys(items).length)throw Error('هیچ داده پشتیبانی‌شده‌ای برای خروجی وجود ندارد.');
  const snapshot={format:FORMAT,schema:SCHEMA,createdAt:new Date().toISOString(),items};
  if(JSON.stringify(snapshot).length>MAX_FILE)throw Error('فایل پشتیبان از حد مجاز بزرگ‌تر است.');
  return snapshot;
 }
 function inspectSnapshot(data){
  if(!data||data.format!==FORMAT||data.schema!==SCHEMA||!data.items||typeof data.items!=='object'||
    Array.isArray(data.items))throw Error('قالب یا نسخه پشتیبان پشتیبانی نمی‌شود.');
  if(JSON.stringify(data).length>MAX_FILE)throw Error('فایل پشتیبان از حد مجاز بزرگ‌تر است.');
  const keys=Object.keys(data.items);
  if(!keys.length||keys.some(k=>!KEYS.includes(k)))throw Error('کلید ناشناخته در فایل پشتیبان شناسایی شد.');
  for(const key of keys)validateOne(key,data.items[key]);
  return {keys,count:keys.length};
 }
 function restoreSnapshot(storage,snapshot){
  const inspected=inspectSnapshot(snapshot);
  // Preserve existing unrelated keys. Roll back each touched key on errors.
  const original=new Map();
  for(const key of inspected.keys)original.set(key,storage.getItem(key));
  const attempted=[];
  try{
   for(const key of inspected.keys){
    // Register the write *before* calling setItem: an implementation may mutate
    // storage then throw, and the failed key must be included in rollback.
    attempted.push(key);
    storage.setItem(key,snapshot.items[key]);
    if(storage.getItem(key)!==snapshot.items[key])throw Error('تأیید نوشتن داده در مرورگر ناموفق بود.');
   }
  }catch(error){
   let rollbackFailed=false;
   for(const key of attempted.reverse()){
    try{
     const previous=original.get(key);
     if(previous===null)storage.removeItem(key);else storage.setItem(key,previous);
     if(storage.getItem(key)!==previous)rollbackFailed=true;
    }catch{rollbackFailed=true;}
   }
   throw Error(rollbackFailed?'بازیابی ناقص بود؛ بازگردانی خودکار موفق نشد. نسخه پشتیبان خارجی را حفظ کنید.':'بازیابی انجام نشد؛ تغییرات به وضعیت قبلی برگشت.');
  }
  return inspected.count;
 }
 function mount(win){
  const doc=win.document,byId=id=>doc.getElementById(id),status=s=>{byId('sb148Status').textContent=s;};
  let pending=null,generation=0;
  byId('sb148Export').addEventListener('click',()=>{
   try{
    const snapshot=createSnapshot(win.localStorage),encoded=JSON.stringify(snapshot,null,2);
    const url=win.URL.createObjectURL(new Blob([encoded],{type:'application/json;charset=utf-8'}));
    const a=doc.createElement('a');a.href=url;a.download='sahamban-local-backup-v1.json';doc.body.append(a);a.click();a.remove();
    win.setTimeout(()=>win.URL.revokeObjectURL(url),1000);
    status('درخواست دانلود پشتیبان ارسال شد، اما ذخیره‌شدن فایل تأیید نشده است. وجود فایل sahamban-local-backup-v1.json را در دستگاه بررسی کنید و پیش از حذف داده‌ها، بازیابی آزمایشی انجام دهید. فایل JSON رمزگذاری نشده است؛ شامل '+Object.keys(snapshot.items).length+' بخش ذخیره‌شده، بدون صدای ضبط‌شده.');
   }catch(e){status('پشتیبان‌گیری ناموفق: '+e.message);}
  });
  byId('sb148File').addEventListener('change',async()=>{
   const stamp=++generation;pending=null;byId('sb148Restore').disabled=true;
   const file=byId('sb148File').files?.[0];if(!file){status('فایلی انتخاب نشده است.');return;}
   if(file.size>MAX_FILE){status('فایل پشتیبان بزرگ‌تر از حد مجاز است.');return;}
   try{
    const raw=await file.text();if(stamp!==generation)return;
    const parsed=JSON.parse(raw),summary=inspectSnapshot(parsed);
    pending=parsed;byId('sb148Restore').disabled=false;
    status('فایل معتبر است: '+summary.count+' بخش؛ هیچ چیزی هنوز جایگزین نشده. برای اعمال، دکمه بازیابی را بزنید.');
   }catch(e){if(stamp===generation)status('فایل پذیرفته نشد: '+e.message);}
  });
  byId('sb148Restore').addEventListener('click',()=>{
   if(!pending){status('ابتدا یک فایل معتبر انتخاب کنید.');return;}
   const data=pending;pending=null;++generation;byId('sb148Restore').disabled=true;
   if(!win.confirm('داده‌های موجود مربوط به بخش‌های داخل فایل، روی همین مرورگر جایگزین شوند؟ ابتدا از وضعیت فعلی پشتیبان بگیرید.')){status('بازیابی لغو شد؛ اطلاعات تغییر نکرد.');return;}
   try{
    const count=restoreSnapshot(win.localStorage,data);
    status(count+' بخش در همین مرورگر بازیابی شد. برای نمایش تنظیمات بازیابی‌شده، صفحه را یک بار بارگذاری مجدد کنید.');
   }catch(e){status(e.message);}
  });
 }
 return {FORMAT,SCHEMA,KEYS,createSnapshot,inspectSnapshot,restoreSnapshot,validateOne,mount};
});
