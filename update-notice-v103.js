'use strict';
/* v103 update notices concern app shell only; no portfolio data is inspected. */
(()=>{
 if(!('serviceWorker' in navigator))return;
 const banner=document.createElement('aside');
 banner.id='sb103UpdateNotice';
 banner.className='sb103-update-notice';
 banner.hidden=true;
 banner.setAttribute('role','status');
 banner.setAttribute('aria-live','polite');
 const message=document.createElement('p');
 message.textContent='نسخه جدید سهام‌بان آماده است. برای دریافت فایل‌های جدید، صفحه را تازه‌سازی کنید. پیش از این کار، تغییرات ذخیره‌نشده را بررسی کنید.';
 const reload=document.createElement('button');
 reload.type='button';
 reload.textContent='تازه‌سازی صفحه';
 const dismiss=document.createElement('button');
 dismiss.type='button';
 dismiss.className='secondary';
 dismiss.textContent='بعداً';
 banner.append(message,reload,dismiss);
 document.body.append(banner);
 let dismissed=false;
 const show=()=>{if(!dismissed)banner.hidden=false;};
 reload.addEventListener('click',()=>location.reload());
 dismiss.addEventListener('click',()=>{dismissed=true;banner.hidden=true;});
 const initial=navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(initial&&navigator.serviceWorker.controller!==initial)show();
 });
 navigator.serviceWorker.ready.then(reg=>{
  if(reg.waiting&&initial)show();
  reg.addEventListener('updatefound',()=>{
   const worker=reg.installing;
   if(worker)worker.addEventListener('statechange',()=>{
    if(worker.state==='installed'&&navigator.serviceWorker.controller)show();
   });
  });
  let lastCheck=0;
  const check=()=>{
   if(document.visibilityState!=='visible'||!navigator.onLine)return;
   const now=Date.now();
   if(now-lastCheck<600000)return;
   lastCheck=now;
   reg.update().catch(()=>{});
  };
  document.addEventListener('visibilitychange',check);
  window.addEventListener('pageshow',check);
 }).catch(()=>{});
})();
