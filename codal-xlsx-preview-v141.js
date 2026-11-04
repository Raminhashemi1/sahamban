'use strict';
/* v141: local XLSX cell preview using browser-native deflate-raw; untrusted source, no ratios. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root?.document){root.SahambanCodalXlsxV141=api;api.mount(root);}
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 const MAX_FILE=15*1024*1024,MAX_TOTAL=6*1024*1024,MAX_ENTRY=3*1024*1024,MAX_ENTRIES=150;
 const err=code=>{throw new Error(code);};
 const decoder=new TextDecoder('utf-8',{fatal:true});
 const ascii=v=>String(v??'').replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));
 const normalize=v=>ascii(v).replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\s\u200c\u200e\u200f]/g,'').toLowerCase();
 function xmlDecode(s){
  return String(s).replace(/&(?:amp|lt|gt|quot|apos|#(x[0-9a-f]+|[0-9]+));/gi,(all,num)=>{
   if(!num)return {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[all]||all;
   const n=num[0].toLowerCase()==='x'?parseInt(num.slice(1),16):Number(num);
   return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'';
  });
 }
 const tag=(xml,name)=>{const m=xml.match(new RegExp('<(?:[A-Za-z_][\\w.-]*:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?'+name+'>','i'));return m?m[1]:'';};
 const attr=(head,name)=>{const m=head.match(new RegExp('(?:^|\\s)'+name+'="([^"]*)"','i'));return m?xmlDecode(m[1]):'';};
 function xmlText(xml){return xmlDecode([...xml.matchAll(/<(?:[A-Za-z_][\w.-]*:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?t>/gi)].map(m=>m[1]).join(''));}
 function parseXmlSheet(xml,strings,{limit=2000}={}){
  if(!/^\s*(?:<\?xml[^>]*>\s*)?<(?:[A-Za-z_][\w.-]*:)?worksheet(?:\s|>)/i.test(xml))err('INVALID_WORKSHEET_XML');
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))err('UNSUPPORTED_XML_DIRECTIVE');
  const found=[];let count=0;
  const rx=/<(?:[A-Za-z_][\w.-]*:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?c>)/gi;
  let match;
  while((match=rx.exec(xml))!==null){
   if(++count>20000)err('TOO_MANY_CELLS');
   const ref=attr(match[1],'r'),typ=attr(match[1],'t'),body=match[2]||'';
   if(!/^[A-Z]{1,3}[1-9][0-9]{0,6}$/.test(ref))continue;
   let value='';
   if(typ==='inlineStr')value=xmlText(tag(body,'is')||body);
   else if(typ==='s'){
    const v=tag(body,'v').trim();
    if(!/^(?:0|[1-9][0-9]{0,7})$/.test(v)||Number(v)>=strings.length)continue;
    value=strings[Number(v)];
   }else if(typ==='str')value=xmlDecode(tag(body,'v'));
   else if(typ==='b')value=tag(body,'v')==='1'?'TRUE':'FALSE';
   else if(typ==='e')continue;
   else {
    const v=tag(body,'v').trim();
    if(v && !/^-?(?:[0-9]+)(?:\.[0-9]+)?(?:[eE][-+]?[0-9]{1,3})?$/.test(v))continue;
    value=v; // raw numerical cell; no number-format/date/scale assumptions
   }
   if(value.length>500)continue;
   if(value.trim() && found.length<limit)found.push({cell:ref,text:value,kind:typ||'numeric',formula:!!/<(?:[A-Za-z_][\w.-]*:)?f(?:\s|>)/i.test(body)});
  }
  return {cells:found,scanned:count,truncated:count>found.length};
 }
 async function unpack(bytes,{inflate}={}){
  if(!(bytes instanceof Uint8Array)||bytes.byteLength<22||bytes.byteLength>MAX_FILE)err('INVALID_ZIP_SIZE');
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),len=bytes.length;
  const u16=i=>dv.getUint16(i,true),u32=i=>dv.getUint32(i,true);
  let eocd=-1;
  for(let i=len-22;i>=Math.max(0,len-65557);i--)if(u32(i)===0x06054b50){eocd=i;break;}
  if(eocd<0||eocd+22+u16(eocd+20)!==len)err('ZIP_DIRECTORY_INVALID');
  const n=u16(eocd+10),size=u32(eocd+12),off=u32(eocd+16);
  if(n===0||n>MAX_ENTRIES||n!==u16(eocd+8)||off+size>eocd)err('ZIP_ENTRIES_INVALID');
  const out=new Map();let p=off,total=0;
  for(let index=0;index<n;index++){
   if(p+46>off+size||u32(p)!==0x02014b50)err('ZIP_CENTRAL_INVALID');
   const flags=u16(p+8),method=u16(p+10),comp=u32(p+20),uncomp=u32(p+24);
   const nameLen=u16(p+28),extra=u16(p+30),comment=u16(p+32),loc=u32(p+42);
   if(p+46+nameLen+extra+comment>off+size)err('ZIP_CENTRAL_BOUNDS');
   const name=decoder.decode(bytes.subarray(p+46,p+46+nameLen));p+=46+nameLen+extra+comment;
   if(flags&1||![0,8].includes(method)||comp>MAX_FILE||uncomp>MAX_ENTRY||
      /(?:^\/|\\|\.\.)/.test(name)||!name||out.has(name))err('ZIP_ENTRY_UNSAFE');
   total+=uncomp;if(total>MAX_TOTAL)err('ZIP_EXPANSION_LIMIT');
   if(loc+30>off||u32(loc)!==0x04034b50)err('ZIP_LOCAL_INVALID');
   const lname=u16(loc+26),lextra=u16(loc+28);
   if(u16(loc+6)!==flags||u16(loc+8)!==method||loc+30+lname+lextra>off||
      decoder.decode(bytes.subarray(loc+30,loc+30+lname))!==name)err('ZIP_LOCAL_HEADER_MISMATCH');
   if(!(flags&8)&&(u32(loc+18)!==comp||u32(loc+22)!==uncomp))err('ZIP_LOCAL_SIZE_MISMATCH');
   const begin=loc+30+lname+lextra,end=begin+comp;
   if(end>off)err('ZIP_COMPRESSED_BOUNDS');
   if(!/^(?:xl\/worksheets\/sheet[1-9][0-9]*\.xml|xl\/sharedStrings\.xml|xl\/workbook\.xml|xl\/_rels\/workbook\.xml\.rels|\[Content_Types\]\.xml)$/.test(name))continue;
   let decoded;
   if(method===0)decoded=bytes.subarray(begin,end);
   else if(inflate)decoded=await inflate(bytes.subarray(begin,end));
   else{
    if(typeof DecompressionStream!=='function')err('RAW_DEFLATE_UNSUPPORTED');
    const stream=new Blob([bytes.subarray(begin,end)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const reader=stream.getReader(),chunks=[];let written=0;
    try{
     while(true){
      const next=await reader.read();
      if(next.done)break;
      written+=next.value.byteLength;
      if(written>uncomp||written>MAX_ENTRY||written>MAX_TOTAL)err('ZIP_DECOMPRESSION_LIMIT');
      chunks.push(next.value);
     }
    }finally{reader.releaseLock();}
    decoded=new Uint8Array(written);let cursor=0;
    for(const chunk of chunks){decoded.set(chunk,cursor);cursor+=chunk.byteLength;}
   }
   if(decoded.byteLength!==uncomp||decoded.byteLength>MAX_ENTRY)err('ZIP_UNCOMPRESSED_MISMATCH');
   out.set(name,decoder.decode(decoded));
  }
  if(p!==off+size)err('ZIP_CENTRAL_TRAILING');
  return out;
 }
 function sharedStrings(xml){
  if(!xml)return [];
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))err('UNSUPPORTED_XML_DIRECTIVE');
  const values=[];const rx=/<(?:[A-Za-z_][\w.-]*:)?si\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z_][\w.-]*:)?si>/gi;let m;
  while((m=rx.exec(xml))!==null){if(values.length>=20000)err('TOO_MANY_SHARED_STRINGS');values.push(xmlText(m[1]));}
  return values;
 }
 async function extract(file,opts={}){
  if(!file||!Number.isSafeInteger(file.size)||file.size<22||file.size>MAX_FILE||!/\.xlsx$/i.test(file.name||'')||typeof file.arrayBuffer!=='function')err('XLSX_FILE_REQUIRED');
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(bytes.length!==file.size)err('XLSX_CHANGED_DURING_READ');
  const entries=await unpack(bytes,opts);
  const book=entries.get('xl/workbook.xml')||'';
  if(!book||/<!DOCTYPE|<!ENTITY/i.test(book))err('INVALID_WORKBOOK');
  const strings=sharedStrings(entries.get('xl/sharedStrings.xml')||'');
  const sheetMeta=[];
  for(const m of book.matchAll(/<(?:[A-Za-z_][\w.-]*:)?sheet\b([^>]*?)(?:\/>|>)/gi)){
   const name=attr(m[1],'name');
   const id=(m[1].match(/(?:^|\s)r:id="([^"]+)"/i)||[])[1]||'';
   if(name)sheetMeta.push({name:name.slice(0,80),id});
  }
  const relXml=entries.get('xl/_rels/workbook.xml.rels')||'';
  if(/<!DOCTYPE|<!ENTITY/i.test(relXml))err('UNSUPPORTED_XML_DIRECTIVE');
  const relationships=new Map();
  for(const m of relXml.matchAll(/<(?:[A-Za-z_][\w.-]*:)?Relationship\b([^>]*?)(?:\/>|>)/gi)){
   const id=attr(m[1],'Id'),type=attr(m[1],'Type'),target=attr(m[1],'Target');
   if(!id||relationships.has(id))err('INVALID_WORKBOOK_RELATIONSHIPS');
   if(/\/worksheet$/i.test(type)){
    const path=target.startsWith('/xl/')?target.slice(1):'xl/'+target;
    if(!/^xl\/worksheets\/sheet[1-9][0-9]*\.xml$/.test(path))err('UNSAFE_WORKSHEET_TARGET');
    relationships.set(id,path);
   }
  }
  const sheets=[];let totalCells=0;
  for(let i=0;i<Math.min(20,sheetMeta.length||10);i++){
   const meta=sheetMeta[i];
   // Explicit workbook relationships are authoritative. Never assign a sheet's
   // values to another displayed name when its relationship cannot be resolved.
   const path=meta?.id?relationships.get(meta.id):'xl/worksheets/sheet'+(i+1)+'.xml';
   if(meta?.id&&!path)err('UNRESOLVED_WORKSHEET_RELATIONSHIP');
   const xml=entries.get(path);
   if(!xml){if(meta?.id)err('MISSING_WORKSHEET_TARGET');continue;}
   const parsed=parseXmlSheet(xml,strings,{limit:800});
   sheets.push({name:meta?.name||'Sheet '+(i+1),path,
    cells:parsed.cells,scanned:parsed.scanned,truncated:parsed.truncated});
   totalCells+=parsed.scanned;
  }
  if(!sheets.length)err('NO_SUPPORTED_WORKSHEETS');
  return {status:'LOCAL_XLSX_CONTENT_PREVIEW_UNVERIFIED',sheets,totalCells,originVerified:false,
   figuresVerified:false,tradingSignalsEnabled:false,financialEvidence:'INSUFFICIENT_EVIDENCE'};
 }
 function mount(win){
  const doc=win.document;
  const input=doc.getElementById('codalXlsxFileV141'),
   button=doc.getElementById('codalXlsxRunV141'),
   status=doc.getElementById('codalXlsxStatusV141'),
   list=doc.getElementById('codalXlsxCellsV141');
  if(!input||!button||!status||!list)return;
  let generation=0;
  input.addEventListener('change',()=>{generation++;list.replaceChildren();status.textContent='فایل تغییر کرد؛ پیش‌نمایش قبلی باطل شد.';});
  button.addEventListener('click',async()=>{
   const current=++generation;button.disabled=true;list.replaceChildren();status.textContent='در حال استخراج محلی سلول‌ها؛ فایلی ارسال نمی‌شود.';
   try{
    const result=await extract(input.files?.[0]);
    if(current!==generation)return;
    for(const sheet of result.sheets){
     const heading=doc.createElement('li');
     heading.textContent='کاربرگ: '+sheet.name+' | تعداد سلول خوانده‌شده: '+sheet.scanned+' | پیش‌نمایش: '+sheet.cells.length;
     list.append(heading);
     for(const cell of sheet.cells.slice(0,100)){
      const li=doc.createElement('li');li.textContent=cell.cell+' : '+cell.text+(cell.formula?' [مقدار ذخیره‌شده فرمول؛ محاسبه‌نشده]':'');list.append(li);
     }
    }
    status.textContent='محتوای '+result.sheets.length+' کاربرگ از فایل XLSX انتخاب‌شده خوانده شد. هنوز اصالت ناشر، واحدها، ارقام مالی و ارتباط فایل با اطلاعیه کدال تأیید نشده است؛ هیچ سیگنالی تولید نمی‌شود.';
   }catch(e){if(current===generation)status.textContent='خواندن XLSX ممکن نشد: '+String(e?.message||'UNKNOWN_ERROR')+'. داده مالی تأیید نشد.';}
   finally{if(current===generation)button.disabled=false;}
  });
 }
 return {extract,unpack,parseXmlSheet,sharedStrings,normalize,mount};
});
