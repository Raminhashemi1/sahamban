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
 const MAX_FILE=5*1024*1024,MAX_ENTRIES=150,MAX_ENTRY=12*1024*1024,MAX_TOTAL=20*1024*1024;
 if(!file||file.size>MAX_FILE)throw Error('فایل اکسل بیش از حد مجاز است.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(bytes.length<22||bytes.length>MAX_FILE)throw Error('اندازه فایل اکسل معتبر نیست.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),decoder=new TextDecoder('utf-8',{fatal:true});
 const u16=(p)=>{if(p<0||p+2>bytes.length)throw Error('ساختار ZIP ناقص است.');return view.getUint16(p,true);};
 const u32=(p)=>{if(p<0||p+4>bytes.length)throw Error('ساختار ZIP ناقص است.');return view.getUint32(p,true);};
 let eocd=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
  if(u32(i)===0x06054b50){eocd=i;break;}
 }
 if(eocd<0)throw Error('ساختار فایل XLSX معتبر نیست.');
 if(u16(eocd+4)!==0||u16(eocd+6)!==0||u16(eocd+8)!==u16(eocd+10))throw Error('فایل ZIP چندبخشی پشتیبانی نمی‌شود.');
 const count=u16(eocd+10),centralSize=u32(eocd+12),offset=u32(eocd+16);
 if(count>MAX_ENTRIES||offset+centralSize>eocd||offset>=bytes.length)throw Error('فایل اکسل بسیار پیچیده یا نامعتبر است.');
 const entries=new Map();let ptr=offset,totalDeclared=0;
 const allowed=/^(?:xl\/worksheets\/sheet[1-9][0-9]*\.xml|xl\/sharedStrings\.xml|xl\/workbook\.xml|xl\/_rels\/workbook\.xml\.rels)$/;
 for(let i=0;i<count;i++){
  if(u32(ptr)!==0x02014b50)throw Error('فهرست XLSX آسیب دیده است.');
  const flags=u16(ptr+8),method=u16(ptr+10),compressed=u32(ptr+20),uncompressed=u32(ptr+24);
  const nameLen=u16(ptr+28),extraLen=u16(ptr+30),commentLen=u16(ptr+32),local=u32(ptr+42);
  const next=ptr+46+nameLen+extraLen+commentLen;
  if(next>offset+centralSize)throw Error('فهرست ZIP ناقص است.');
  if((flags&1)||!(method===0||method===8))throw Error('فایل رمزدار یا روش فشرده‌سازی پشتیبانی‌نشده است.');
  let name;try{name=decoder.decode(bytes.subarray(ptr+46,ptr+46+nameLen));}catch{throw Error('نام فایل داخلی XLSX معتبر نیست.');}
  if(name.includes('\\')||name.startsWith('/')||name.split('/').some(x=>x==='..'||x==='.')||name.length>180)throw Error('مسیر داخلی ناامن در XLSX شناسایی شد.');
  if(uncompressed>MAX_ENTRY)throw Error('یکی از بخش‌های اکسل بیش از حد بزرگ است.');
  totalDeclared+=uncompressed;if(totalDeclared>MAX_TOTAL)throw Error('حجم بازشده کل اکسل بیش از حد مجاز است.');
  if(allowed.test(name)){
   if(entries.has(name))throw Error('نام تکراری در ساختار XLSX شناسایی شد.');
   entries.set(name,{flags,method,compressed,uncompressed,local,name});
  }
  ptr=next;
 }
 if(ptr!==offset+centralSize)throw Error('اندازه فهرست ZIP ناسازگار است.');
 async function read(name){
  const e=entries.get(name);if(!e)return null;
  const p=e.local;
  if(u32(p)!==0x04034b50)throw Error('فایل XLSX آسیب دیده است.');
  const localFlags=u16(p+6),localMethod=u16(p+8),nameLen=u16(p+26),extraLen=u16(p+28);
  const begin=p+30+nameLen+extraLen,end=begin+e.compressed;
  if(localFlags!==e.flags||localMethod!==e.method||begin>end||end>offset)throw Error('سرآیند محلی ZIP با فهرست اصلی سازگار نیست.');
  let localName;try{localName=decoder.decode(bytes.subarray(p+30,p+30+nameLen));}catch{throw Error('نام محلی XLSX معتبر نیست.');}
  if(localName!==e.name)throw Error('نام فایل داخلی XLSX ناسازگار است.');
  if(!(e.flags&8)&&(u32(p+18)!==e.compressed||u32(p+22)!==e.uncompressed))throw Error('اندازه سرآیند محلی XLSX ناسازگار است.');
  let raw=bytes.slice(begin,end);
  if(e.method===8){
   if(typeof DecompressionStream==='undefined')throw Error('این مرورگر خواندن آفلاین اکسل را پشتیبانی نمی‌کند؛ خروجی CSV بگیرید.');
   const stream=new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
   const reader=stream.getReader(),chunks=[];let size=0;
   try{
    while(true){
     const part=await reader.read();if(part.done)break;
     size+=part.value.byteLength;
     if(size>e.uncompressed||size>MAX_ENTRY||size>MAX_TOTAL)throw Error('حجم بازشده اکسل از حد مجاز عبور کرد.');
     chunks.push(part.value);
    }
   }finally{reader.releaseLock();}
   raw=new Uint8Array(size);let cursor=0;for(const chunk of chunks){raw.set(chunk,cursor);cursor+=chunk.byteLength;}
  }
  if(raw.length!==e.uncompressed)throw Error('حجم داده XLSX صحیح نیست.');
  try{return decoder.decode(raw);}catch{throw Error('متن داخلی XLSX کدگذاری معتبر ندارد.');}
 }
 const parse=xml=>{
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('دستور XML ناامن در فایل اکسل شناسایی شد.');
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
 if(wb){
  const workbook=parse(wb),sheet=workbook.getElementsByTagName('sheet')[0];
  if(!sheet)throw Error('کاربرگ اصلی در فایل اکسل پیدا نشد.');
  const relId=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
  if(!rels||!relId)throw Error('ارتباط کاربرگ در فایل اکسل پیدا نشد.');
  const relationships=parse(rels),rel=Array.from(relationships.getElementsByTagName('Relationship')).find(x=>x.getAttribute('Id')===relId);
  const target=rel?.getAttribute('Target');
  if(!target||target.includes('..')||/^[a-z]+:/i.test(target)||target.includes('\\'))throw Error('مسیر کاربرگ در فایل اکسل ناامن یا نامعتبر است.');
  const cleaned=target.replace(/^\/+/,'');
  sheetName=cleaned.startsWith('xl/')?cleaned:'xl/'+cleaned;
  if(!allowed.test(sheetName))throw Error('مسیر کاربرگ در فایل اکسل پشتیبانی نمی‌شود.');
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
  else if(buy>Number.MAX_SAFE_INTEGER||current>Number.MAX_SAFE_INTEGER||quantity*buy>Number.MAX_SAFE_INTEGER||quantity*current>Number.MAX_SAFE_INTEGER)issue='مبلغ دارایی خارج از محدوده محاسبه مطمئن';
  else if(found.has(clean)){issue='ردیف تکراری — کنار گذاشته می‌شود';duplicate.add(clean)}
  else found.add(clean);
  if(issue)errors++;
  return {symbol,quantity,buy,current,issue,row:i+2};
 }).filter(Boolean);
 if(preview.length>100)throw Error('حداکثر ۱۰۰ ردیف پشتیبانی می‌شود.');
 // Reject an aggregate outside JS safe monetary bounds before it can be persisted.
 let totalBuy=0,totalCurrent=0;
 for(const p of preview){
  if(p.issue)continue;
  totalBuy+=p.quantity*p.buy;
  totalCurrent+=p.quantity*p.current;
  if(!Number.isFinite(totalBuy)||!Number.isFinite(totalCurrent)||totalBuy>Number.MAX_SAFE_INTEGER||totalCurrent>Number.MAX_SAFE_INTEGER)
   throw Error('جمع ارزش یا بهای خرید سبد خارج از محدوده محاسبه مطمئن است؛ هیچ داده‌ای ذخیره نشد.');
 }
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