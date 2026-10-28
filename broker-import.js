'use strict';
/* Broker portfolio import: local-only, read-only, no broker credentials. */
(()=>{
const el=id=>document.getElementById(id);
const STORAGE='sahamban-broker-holdings-v1';
let matrix=[], headers=[], preview=[],ready=false;
const status=s=>{el('brokerStatus').textContent=s;};
function normal(v){return String(v??'').replace(/[\u200c\u200f\u200e]/g,'').replace(/ي/g,'ی').replace(/ك/g,'ک').trim().toLowerCase();}
function num(v){
 if(typeof v==='number')return v;
 const s=String(v??'').trim().replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[٬,\s]/g,'').replace(/٫/g,'.');
 return s===''?NaN:Number(s);
}
function csv(text){
 const out=[];let row=[],cell='',quote=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++;}else quote=!quote;}
  else if(!quote&&(c===','||c===';'||c==='\t')){row.push(cell);cell='';}
  else if(!quote&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))out.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(quote)throw Error('نقل‌قول ناقص در CSV');
 row.push(cell);if(row.some(x=>x.trim()))out.push(row);
 return out;
}
function loadXlsx(){
 if(window.XLSX)return Promise.resolve(window.XLSX);
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  script.onload=()=>window.XLSX?resolve(window.XLSX):reject(Error('کتابخانه خواندن اکسل بارگیری نشد'));
  script.onerror=()=>reject(Error('اتصال لازم برای خواندن اکسل برقرار نشد. می‌توانید CSV بگیرید.'));
  document.head.appendChild(script);
 });
}
const groups={
 symbol:['نام نماد','نماد','symbol','ticker','نام سهم','نام شرکت'],
 qty:['تعداد دارایی','تعداد سهام','تعداد','quantity','qty','موجودی','تعداد کل'],
 buy:['قیمت میانگین خرید در آخرین دوره با لحاظ کارمزد','قیمت میانگین کل خرید با لحاظ کارمزد','میانگین خرید','قیمت خرید','avg buy','buy price','average cost'],
 current:['قیمت پایانی','آخرین قیمت','قیمت فعلی','قیمت روز','closing price','current price','last price']
};
function selectColumn(id,aliases){
 const s=el(id);s.replaceChildren();
 const blank=document.createElement('option');blank.value='';blank.textContent='انتخاب ستون';s.append(blank);
 headers.forEach((h,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=(i+1)+' — '+h;s.append(o)});
 const exact=aliases.map(normal);
 let idx=headers.findIndex(h=>exact.includes(normal(h)));
 if(idx<0)idx=headers.findIndex(h=>exact.some(a=>a.length>3&&normal(h).includes(a)));
 if(idx>=0)s.value=String(idx);
}
function rowText(tr,values){for(const v of values){const td=document.createElement('td');td.style.padding='6px';td.style.borderBottom='1px solid #34546d';td.textContent=String(v);tr.append(td)}}
function previewRows(){
 const ids=['brokerSymbolCol','brokerQtyCol','brokerBuyCol','brokerCurrentCol'].map(id=>el(id).value);
 if(ids.some(x=>x==='')||new Set(ids).size!==4)throw Error('چهار ستون متفاوت انتخاب کنید.');
 const factor=el('brokerUnit').value==='rial'?10:1;
 const duplicate=new Set(),found=new Set();let errors=0;
 preview=matrix.slice(1).map((row,i)=>{
  const symbol=String(row[+ids[0]]??'').trim();
  const quantity=num(row[+ids[1]]),buy=num(row[+ids[2]])/factor,current=num(row[+ids[3]])/factor;
  if(!symbol&&row.every(x=>String(x??'').trim()===''))return null;
  const clean=normal(symbol);let issue='';
  if(!symbol||symbol.length>35||/[\r\n,;\t]/.test(symbol))issue='نماد نامعتبر';
  else if(found.has(clean)){issue='نماد تکراری — نیازمند بررسی';duplicate.add(clean)}
  else if(!Number.isSafeInteger(quantity)||quantity<=0||!Number.isFinite(buy)||buy<=0||!Number.isFinite(current)||current<=0)issue='تعداد یا قیمت نامعتبر';
  found.add(clean);if(issue)errors++;
  return {symbol,quantity,buy,current,issue,row:i+2};
 }).filter(Boolean);
 if(preview.length>100)throw Error('حداکثر ۱۰۰ ردیف پشتیبانی می‌شود.');
 if(!preview.length)throw Error('هیچ دارایی معتبری پیدا نشد.');
 for(const p of preview)if(duplicate.has(normal(p.symbol)))p.issue='نماد تکراری — نیازمند بررسی';
 const body=el('brokerRows');body.replaceChildren();
 for(const p of preview){const tr=document.createElement('tr');rowText(tr,[p.symbol,p.quantity,p.buy,p.current,p.issue||'آماده']);body.append(tr);}
 const invalid=preview.filter(x=>x.issue).length;
 el('brokerReviewStatus').textContent=preview.length+' ردیف پیدا شد؛ '+invalid+' ردیف نیازمند بررسی است. '+(invalid?'تا رفع موردهای تکراری یا نامعتبر، ذخیره انجام نمی‌شود.':'قیمت‌ها به تومان نمایش داده شده‌اند.');
 el('brokerApply').disabled=invalid>0;
 el('brokerRisk').disabled=true;
 el('brokerReview').hidden=false;ready=invalid===0;
}
el('brokerFile').addEventListener('change',async()=>{
 ready=false;preview=[];el('brokerReview').hidden=true;el('brokerMapping').hidden=true;
 const f=el('brokerFile').files?.[0];if(!f)return;
 if(f.size>5*1024*1024){status('فایل بیش از ۵ مگابایت است.');return;}
 try{
  status('در حال خواندن فایل فقط داخل مرورگر...');
  if(/\.csv$/i.test(f.name)){
   let data=await f.text();matrix=csv(data.replace(/^\uFEFF/,''));
   if(matrix[0]?.length===1&&data.includes(';'))matrix=csv(data.replace(/;/g,','));
  }else if(/\.xlsx?$/i.test(f.name)){
   const XLSX=await loadXlsx();const workbook=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:false});
   const sheet=workbook.Sheets[workbook.SheetNames[0]];
   matrix=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true});
  }else throw Error('فقط فایل Excel یا CSV انتخاب کنید.');
  matrix=matrix.filter(r=>Array.isArray(r)&&r.some(x=>String(x??'').trim()!==''));
  if(matrix.length<2||matrix.length>1001)throw Error('فایل خالی یا بسیار بزرگ است.');
  headers=matrix[0].map((x,i)=>String(x||'ستون '+(i+1)));
  for(const [key,id] of [['symbol','brokerSymbolCol'],['qty','brokerQtyCol'],['buy','brokerBuyCol'],['current','brokerCurrentCol']])selectColumn(id,groups[key]);
  el('brokerMapping').hidden=false;status('فایل خوانده شد. ستون‌ها را بررسی و «نمایش پیش‌نمایش» را بزنید.');
 }catch(e){status('خواندن فایل ناموفق: '+e.message);}
});
el('brokerPreview').addEventListener('click',()=>{try{previewRows();status('پیش‌نمایش آماده است؛ هنوز چیزی ذخیره نشده.')}catch(e){ready=false;el('brokerReview').hidden=true;status(e.message)}});
el('brokerApply').addEventListener('click',()=>{
 if(!ready||preview.some(p=>p.issue)){status('ابتدا خطاهای پیش‌نمایش را اصلاح کنید.');return;}
 const holdings=preview.map(({symbol,quantity,buy,current})=>({symbol,quantity,buy,current}));
 try{
  localStorage.setItem(STORAGE,JSON.stringify({version:1,created:new Date().toISOString(),holdings}));
  status(holdings.length+' سهم در بخش دارایی‌های واردشده روی این دستگاه ذخیره شد. سبد تحلیل ریسک و صدای هشدار دست‌نخورده‌اند.');
  el('brokerRisk').disabled=false;
 }catch(e){status('ذخیره محلی انجام نشد: '+e.message);}
});
el('brokerLoad').addEventListener('click',()=>{
 try{
  const obj=JSON.parse(localStorage.getItem(STORAGE)||'null');
  if(!obj||!Array.isArray(obj.holdings))throw Error('هنوز دارایی واردشده‌ای ذخیره نشده.');
  preview=obj.holdings.map(p=>({...p,issue:''}));ready=true;
  const body=el('brokerRows');body.replaceChildren();
  for(const p of preview){const tr=document.createElement('tr');rowText(tr,[p.symbol,p.quantity,p.buy,p.current,'ذخیره‌شده']);body.append(tr);}
  el('brokerReview').hidden=false;el('brokerReviewStatus').textContent=preview.length+' سهم از حافظه این دستگاه بارگذاری شد.';
  el('brokerApply').disabled=false;el('brokerRisk').disabled=false;status('دارایی‌های ذخیره‌شده نمایش داده شدند.');
 }catch(e){status(e.message);}
});
el('brokerRisk').addEventListener('click',()=>{
 if(!preview.length){status('ابتدا دارایی‌ها را وارد کنید.');return;}
 const existing=new Map();
 try{
  for(const p of parsePortfolio(el('portfolioData').value))existing.set(normal(p.symbol),p);
 }catch(e){/* sample or incomplete portfolio: no automatic risk guesses */}
 const missing=preview.filter(p=>!existing.has(normal(p.symbol)));
 if(missing.length){status('برای '+missing.length+' نماد هنوز حد ضرر و حد سود مشخص نشده. ابتدا از فرم افزودن سهم در بخش تحلیل ریسک حدود واقعی هر نماد را ثبت کنید؛ هیچ عدد فرضی اعمال نمی‌شود.');el('portfolioSection').scrollIntoView({behavior:'smooth'});return;}
 if(!window.confirm('اطلاعات تعداد و قیمت خرید/فعلی این '+preview.length+' نماد در کادر تحلیل ریسک با حفظ حدود موجود به‌روزرسانی شود؟ نسخه ذخیره‌شده روی گوشی تغییر نخواهد کرد.'))return;
 const combined=[...existing.values()].map(p=>{const match=preview.find(x=>normal(x.symbol)===normal(p.symbol));if(!match)return p;return {...p,qty:match.quantity,buy:match.buy,current:match.current};});
 try{
  const lines=combined.map(p=>[p.symbol,p.qty,p.buy,p.current,p.stop,p.target].join(',')).join('\n');
  parsePortfolio(lines);el('portfolioData').value=lines;el('portfolioData').dispatchEvent(new Event('input',{bubbles:true}));
  status('کادر تحلیل ریسک به‌روزرسانی شد؛ برای ذخیره دائمی دکمه «ذخیره سبد روی گوشی» را جداگانه بزنید.');
 }catch(e){status('انتقال امن انجام نشد: '+e.message);}
});
})();