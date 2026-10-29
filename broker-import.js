'use strict';
/* Broker portfolio import: local-only, read-only, no broker credentials. */
(()=>{
const el=id=>document.getElementById(id);
const STORAGE='sahamban-broker-holdings-v1';
let matrix=[], headers=[], preview=[],ready=false;
const status=s=>{el('brokerStatus').textContent=s;};
function publishVisibleSymbols(items){
 const symbols=[...new Set(items.filter(p=>p&&typeof p.symbol==='string').map(p=>p.symbol.trim()).filter(Boolean))];
 if(symbols.length)window.dispatchEvent(new CustomEvent('sahamban:portfolio-symbols-v50',{detail:{symbols}}));
}
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
// Read modern .xlsx (OOXML) inside the browser without third-party code or uploads.
async function unzipXlsx(file){
 const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);
 const decoder=new TextDecoder('utf-8');
 let eocd=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}
 if(eocd<0)throw Error('ساختار فایل XLSX معتبر نیست.');
 const count=view.getUint16(eocd+10,true),offset=view.getUint32(eocd+16,true);
 if(count>1500||offset>=bytes.length)throw Error('فایل اکسل بسیار پیچیده یا نامعتبر است.');
 const entries=new Map();let ptr=offset;
 for(let i=0;i<count;i++){
  if(view.getUint32(ptr,true)!==0x02014b50)throw Error('فهرست XLSX آسیب دیده است.');
  const method=view.getUint16(ptr+10,true),compressed=view.getUint32(ptr+20,true),uncompressed=view.getUint32(ptr+24,true);
  const nameLen=view.getUint16(ptr+28,true),extraLen=view.getUint16(ptr+30,true),commentLen=view.getUint16(ptr+32,true);
  const local=view.getUint32(ptr+42,true);
  const name=decoder.decode(bytes.subarray(ptr+46,ptr+46+nameLen));
  if(!name.includes('..')&&uncompressed<=12*1024*1024)entries.set(name,{method,compressed,uncompressed,local});
  ptr+=46+nameLen+extraLen+commentLen;
 }
 async function read(name){
  const e=entries.get(name);if(!e)return null;
  const p=e.local;if(view.getUint32(p,true)!==0x04034b50)throw Error('فایل XLSX آسیب دیده است.');
  const header=30+view.getUint16(p+26,true)+view.getUint16(p+28,true),begin=p+header;
  if(begin+e.compressed>bytes.length)throw Error('داده XLSX ناقص است.');
  let raw=bytes.slice(begin,begin+e.compressed);
  if(e.method===8){
   if(typeof DecompressionStream==='undefined')throw Error('این مرورگر خواندن آفلاین اکسل را پشتیبانی نمی‌کند؛ خروجی CSV بگیرید.');
   const stream=new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
   raw=new Uint8Array(await new Response(stream).arrayBuffer());
  }else if(e.method!==0)throw Error('روش فشرده‌سازی این اکسل پشتیبانی نمی‌شود.');
  if(raw.length!==e.uncompressed)throw Error('حجم داده XLSX صحیح نیست.');
  return decoder.decode(raw);
 }
 const parse=xml=>{
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length)throw Error('ساختار XML فایل اکسل معتبر نیست.');
  return doc;
 };
 const sharedXml=await read('xl/sharedStrings.xml'),shared=[];
 if(sharedXml){
  const doc=parse(sharedXml);
  for(const si of Array.from(doc.getElementsByTagName('si'))){
   shared.push(Array.from(si.getElementsByTagName('t')).map(x=>x.textContent).join(''));
   if(shared.length>20000)throw Error('فهرست متن‌های اکسل بیش از حد بزرگ است.');
  }
 }
 let sheetName='xl/worksheets/sheet1.xml';
 const wb=await read('xl/workbook.xml'),rels=await read('xl/_rels/workbook.xml.rels');
 if(wb&&rels){
  const workbook=parse(wb),relationships=parse(rels);
  const sheet=workbook.getElementsByTagName('sheet')[0];
  const relId=sheet?.getAttribute('r:id')||sheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
  const rel=Array.from(relationships.getElementsByTagName('Relationship')).find(x=>x.getAttribute('Id')===relId);
  const target=rel?.getAttribute('Target');
  if(target){const cleaned=target.replace(/^\/+/,'');if(!cleaned.includes('..'))sheetName=cleaned.startsWith('xl/')?cleaned:'xl/'+cleaned;}
 }
 const sheetXml=await read(sheetName);
 if(!sheetXml)throw Error('برگه اول فایل اکسل پیدا نشد.');
 const doc=parse(sheetXml),matrix=[];
 for(const row of Array.from(doc.getElementsByTagName('row'))){
  const values=[];let position=0;
  for(const c of Array.from(row.getElementsByTagName('c'))){
   const reference=c.getAttribute('r')||'',letters=(reference.match(/^[A-Z]+/i)||[])[0];
   if(letters){let column=0;for(const ch of letters.toUpperCase())column=column*26+ch.charCodeAt(0)-64;position=column-1;}
   if(position>500)throw Error('تعداد ستون‌ها بیش از حد است.');
   const t=c.getAttribute('t'),v=c.getElementsByTagName('v')[0]?.textContent??'';
   let value=t==='s'?shared[Number(v)]??'':t==='inlineStr'?Array.from(c.getElementsByTagName('t')).map(x=>x.textContent).join(''):v;
   if(t==='n'||(!t&&v!==''))value=Number(v);
   values[position]=value;position++;
  }
  if(values.some(v=>String(v??'').trim()))matrix.push(values);
  if(matrix.length>1001)throw Error('فایل بیش از حد بزرگ است.');
 }
 return matrix;
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
function rowText(tr,values){for(const v of values){const td=document.createElement('td');td.style.padding='6px';td.style.borderBottom='1px solid #34546d';td.textContent=typeof v==='number'?new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(v):String(v).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)]);tr.append(td)}}
function previewRows(){
 const ids=['brokerSymbolCol','brokerQtyCol','brokerBuyCol','brokerCurrentCol'].map(id=>el(id).value);
 if(ids.some(x=>x==='')||new Set(ids).size!==4)throw Error('چهار ستون متفاوت انتخاب کنید.');
 const factor=el('brokerUnit').value==='rial'?1:10;
 const duplicate=new Set(),found=new Set();let errors=0;
 preview=matrix.slice(1).map((row,i)=>{
  const symbol=String(row[+ids[0]]??'').trim();
  const quantity=num(row[+ids[1]]),buy=num(row[+ids[2]])*factor,current=num(row[+ids[3]])*factor;
  if(!symbol&&row.every(x=>String(x??'').trim()===''))return null;
  const clean=normal(symbol);let issue='';
  if(!symbol||symbol.length>35||/[\r\n,;\t]/.test(symbol))issue='نماد نامعتبر';
  else if(!Number.isSafeInteger(quantity)||quantity<=0||!Number.isFinite(buy)||buy<=0||!Number.isFinite(current)||current<=0)issue='تعداد یا قیمت نامعتبر';
  else if(found.has(clean)){issue='ردیف تکراری — کنار گذاشته می‌شود';duplicate.add(clean)}
  else found.add(clean);
  if(issue)errors++;
  return {symbol,quantity,buy,current,issue,row:i+2};
 }).filter(Boolean);
 if(preview.length>100)throw Error('حداکثر ۱۰۰ ردیف پشتیبانی می‌شود.');
 if(!preview.length)throw Error('هیچ دارایی معتبری پیدا نشد.');
 // First valid occurrence is preserved; later repetitions and zero-price entries are excluded.
 const body=el('brokerRows');body.replaceChildren();
 for(const p of preview){const tr=document.createElement('tr');rowText(tr,[p.symbol,p.quantity,p.buy,p.current,p.issue||'آماده']);body.append(tr);}
 publishVisibleSymbols(preview.filter(p=>!p.issue));
 const invalid=preview.filter(x=>x.issue).length;
 el('brokerReviewStatus').textContent=preview.length+' ردیف پیدا شد؛ '+invalid+' ردیف تکراری یا نامعتبر از ذخیره کنار گذاشته می‌شود. '+(invalid?'فقط ردیف‌های سالم را پس از بررسی تأیید کنید؛ ردیف‌های کنارگذاشته‌شده در همین جدول مشخص‌اند.':'قیمت‌ها به ریال نمایش داده شده‌اند.');
 el('brokerApply').disabled=preview.every(x=>x.issue);
 el('brokerRisk').disabled=true;
 el('brokerReview').hidden=false;ready=preview.some(x=>!x.issue);
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
  }else if(/\.xlsx$/i.test(f.name)){
   matrix=await unzipXlsx(f);
  }else throw Error('فقط فایل Excel یا CSV انتخاب کنید.');
  matrix=matrix.filter(r=>Array.isArray(r)&&r.some(x=>String(x??'').trim()!==''));
  if(matrix.length<2||matrix.length>1001)throw Error('فایل خالی یا بسیار بزرگ است.');
  headers=matrix[0].map((x,i)=>String(x||'ستون '+(i+1)));
  for(const [key,id] of [['symbol','brokerSymbolCol'],['qty','brokerQtyCol'],['buy','brokerBuyCol'],['current','brokerCurrentCol']])selectColumn(id,groups[key]);
  el('brokerMapping').hidden=false;status('فایل خوانده شد. ستون‌ها را بررسی و «نمایش پیش‌نمایش» را بزنید.');
 }catch(e){status('خواندن فایل ناموفق: '+e.message);}
});
el('brokerPreview').addEventListener('click',()=>{try{previewRows();status('پیش‌نمایش آماده است؛ هنوز چیزی ذخیره نشده.')}catch(e){ready=false;el('brokerReview').hidden=true;status(e.message)}});
for(const id of ['brokerUnit','brokerSymbolCol','brokerQtyCol','brokerBuyCol','brokerCurrentCol'])el(id).addEventListener('change',()=>{ready=false;el('brokerReview').hidden=true;status('تنظیمات ستون یا واحد قیمت تغییر کرد؛ پیش‌نمایش را دوباره بسازید.');});
el('brokerApply').addEventListener('click',()=>{
 if(!ready){status('هیچ ردیف سالمی برای ذخیره وجود ندارد.');return;}
 const holdings=preview.filter(p=>!p.issue).map(({symbol,quantity,buy,current})=>({symbol,quantity,buy,current}));
 try{
  const previous=localStorage.getItem(STORAGE);
  if(previous){
   if(!window.confirm('دارایی‌های واردشده قبلی روی این دستگاه وجود دارند. آن نسخه پشتیبان می‌شود و سپس با '+holdings.length+' سهم جدید جایگزین می‌شود. ادامه می‌دهید؟'))return;
   localStorage.setItem(STORAGE+'-previous',previous);
  }
  localStorage.setItem(STORAGE,JSON.stringify({version:2,created:new Date().toISOString(),holdings}));
  preview=holdings.map(p=>({...p,issue:''}));publishVisibleSymbols(preview);status(holdings.length+' سهم سالم در بخش دارایی‌های واردشده ذخیره شد. ردیف‌های تکراری یا نامعتبر ذخیره نشدند؛ سبد تحلیل ریسک و صدای هشدار دست‌نخورده‌اند.');
  el('brokerRisk').disabled=false;
 }catch(e){status('ذخیره محلی انجام نشد: '+e.message);}
});
el('brokerLoad').addEventListener('click',()=>{
 try{
  const obj=JSON.parse(localStorage.getItem(STORAGE)||'null');
  if(!obj||!Array.isArray(obj.holdings))throw Error('هنوز دارایی واردشده‌ای ذخیره نشده.');
  preview=obj.holdings.map(p=>({...p,buy:obj.version===1?p.buy*10:p.buy,current:obj.version===1?p.current*10:p.current,issue:''}));ready=true;
  const body=el('brokerRows');body.replaceChildren();
  for(const p of preview){const tr=document.createElement('tr');rowText(tr,[p.symbol,p.quantity,p.buy,p.current,'ذخیره‌شده']);body.append(tr);}
  publishVisibleSymbols(preview);
  el('brokerReview').hidden=false;el('brokerReviewStatus').textContent=preview.length+' سهم از حافظه این دستگاه بارگذاری شد.';
  el('brokerApply').disabled=false;el('brokerRisk').disabled=false;status('دارایی‌های ذخیره‌شده نمایش داده شدند.');
 }catch(e){status(e.message);}
});
el('brokerExportBackup').addEventListener('click',()=>{
 try{
  const raw=localStorage.getItem(STORAGE);
  if(!raw)throw Error('ابتدا دارایی‌های کارگزاری را ذخیره کنید.');
  const data=JSON.parse(raw);
  if(!data||![1,2].includes(data.version)||!Array.isArray(data.holdings)||!data.holdings.length)throw Error('ساختار فایل ذخیره‌شده نامعتبر است.');
  const payload=JSON.stringify({format:'sahamban-broker-holdings',exportedAt:new Date().toISOString(),...data},null,2);
  const url=URL.createObjectURL(new Blob([payload],{type:'application/json;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='sahamban-broker-holdings-backup.json';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  status('نسخه پشتیبان دارایی‌های کارگزاری آماده دریافت است. اطلاعات روی گوشی تغییر نکردند.');
 }catch(e){status('پشتیبان‌گیری انجام نشد: '+e.message);}
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