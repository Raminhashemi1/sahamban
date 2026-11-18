'use strict';
/*
 * v1: Native Android pilot saves JSON via an origin-scoped WebMessageListener and
 * Android's user-approved ACTION_CREATE_DOCUMENT picker. Plain browsers retain
 * the existing blob download request, with no claim of confirmed persistence.
 */
(function(root, factory) {
 const api=factory();
 if(typeof module==='object'&&module.exports) module.exports=api;
 if(root&&root.document) root.SahambanBackupExportClient=api;
})(typeof window==='undefined'?null:window, function() {
 const PROTOCOL='sahamban-backup-export-v1';
 const RESPONSE='sahamban-backup-result-v1';
 const MAX_BYTES=256*1024;
 const NAMES=new Set(['sahamban-local-backup-v1.json','sahamban-portfolio-backup.json']);
 let count=0;

 function save(win, filename, json) {
  if(!NAMES.has(filename)||typeof json!=='string')
   return Promise.reject(Error('نام یا محتوای پشتیبان معتبر نیست.'));
  if(new TextEncoder().encode(json).length>MAX_BYTES)
   return Promise.reject(Error('حجم پشتیبان بیش از حد مجاز است.'));
  const native=win.SahambanBackupExport;
  if(native&&typeof native.postMessage==='function'
      &&typeof native.addEventListener==='function'
      &&typeof native.removeEventListener==='function') {
   const requestId='sb-'+(++count);
   return new Promise(resolve=>{
    let settled=false,timer=null;
    const schedule=typeof win.setTimeout==='function'?win.setTimeout.bind(win):setTimeout;
    const cancel=typeof win.clearTimeout==='function'?win.clearTimeout.bind(win):clearTimeout;
    function finish(status) {
     if(settled)return;
     settled=true;
     if(timer!==null)cancel(timer);
     native.removeEventListener('message',handle);
     resolve({status});
    }
    function handle(event) {
     let result;
     try{result=JSON.parse(event.data);}catch{return;}
     if(result.protocol!==RESPONSE||result.requestId!==requestId)return;
     finish(['saved','cancelled','rejected','failed'].includes(result.status)?result.status:'failed');
    }
    native.addEventListener('message',handle);
    timer=schedule(()=>finish('timeout'),300000);
    try{
     native.postMessage(JSON.stringify({protocol:PROTOCOL,requestId,name:filename,content:json}));
    }catch{
     finish('failed');
    }
   });
  }
  // An outdated Android System WebView must never silently claim blob export worked.
  if(String(win.navigator?.userAgent||'').includes('SahambanPilotWebView/1'))
   return Promise.resolve({status:'unsupported'});
  const url=win.URL.createObjectURL(new win.Blob([json],{type:'application/json;charset=utf-8'}));
  const anchor=win.document.createElement('a');
  anchor.href=url;anchor.download=filename;
  win.document.body.appendChild(anchor);
  try{anchor.click();}finally{
   anchor.remove();
   // Give the browser enough time to consume the download URL.
   win.setTimeout(()=>win.URL.revokeObjectURL(url),60000);
  }
  return Promise.resolve({status:'requested'});
 }

 function message(result, filename) {
  if(result.status==='saved')return 'اندروید پایان نوشتن فایل '+filename+' را گزارش کرد. وجود فایل را در دستگاه بررسی کنید و با اطلاعات ساختگی بازیابی آزمایشی انجام دهید.';
  if(result.status==='cancelled')return 'انتخاب محل ذخیره لغو شد؛ هیچ پشتیبان تأییدشده‌ای ایجاد نشده است.';
  if(result.status==='unsupported')return 'این نسخه Android WebView قابلیت ذخیره امن پشتیبان را ندارد؛ از داده واقعی استفاده نکنید و ابتدا WebView را به‌روز کنید.';
  if(result.status==='timeout')return 'در پنج دقیقه پاسخی از اندروید نرسید؛ ذخیره‌شدن فایل تأیید نشده است. ابتدا انتخابگر را ببندید و پوشه مقصد را بررسی کنید.';
  if(result.status==='failed'||result.status==='rejected')return 'اندروید نتوانست فایل پشتیبان را با اطمینان ذخیره کند؛ اطلاعات موجود را حذف نکنید.';
  return 'درخواست دانلود فایل '+filename+' به مرورگر ارسال شد، اما ذخیره‌شدن فایل تأیید نشده است. فایل را پیدا کنید و بازیابی آزمایشی انجام دهید.';
 }
 return {save,message,MAX_BYTES};
});
