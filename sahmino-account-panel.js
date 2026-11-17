(function(){
'use strict';
const $=id=>document.getElementById(id);
const panel=$('sahminoAccountPanel');if(!panel)return;
const configuredApi=String(window.SAHMINO_API_BASE||'').trim();
let api='';
if(configuredApi){
 try{
  const parsed=new URL(configuredApi);
  if(parsed.protocol==='https:'&&parsed.username===''&&parsed.password===''&&
     parsed.pathname==='/'&&parsed.search===''&&parsed.hash==='')api=parsed.origin;
 }catch(_){}
}
let challengeId=null;
const planIds={'30':'SAHMINO_PRO_30D','60':'SAHMINO_PRO_60D','90':'SAHMINO_PRO_90D','180':'SAHMINO_PRO_180D','365':'SAHMINO_PRO_365D'};
const rial=n=>new Intl.NumberFormat('fa-IR').format(n)+' ریال';
const date=s=>{if(!s)return '—';const d=new Date(s);return Number.isNaN(d.getTime())?'نامشخص':d.toLocaleString('fa-IR');};
function message(s){$('sahminoAccountMessage').textContent=s;}
async function call(path,options={}){
 if(!api)throw Error(configuredApi?'نشانی API سهمینو نامعتبر است؛ فقط مبدأ HTTPS بدون مسیر، پرس‌وجو یا اطلاعات ورود مجاز است.':'نشانی API سهمینو هنوز در پیکربندی انتشار ثبت نشده است.');
 const response=await fetch(api+path,{...options,credentials:'include',cache:'no-store',headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});
 let data;try{data=await response.json();}catch(_){throw Error('پاسخ نامعتبر از سرور دریافت شد.');}
 if(!response.ok)throw Error(data.error||data.reason||('خطای سرور: '+response.status));
 return data;
}
function showLoggedIn(on){$('sahminoOtpLogin').hidden=on;$('sahminoAccountDetails').hidden=!on;}
async function refresh(){
 message('در حال دریافت وضعیت حساب و سفارش‌ها…');
 try{
  const session=await call('/api/v1/auth/session');
  if(!session.authenticated){showLoggedIn(false);message('برای مشاهده اشتراک، با شماره همراه وارد شوید.');return;}
  const data=await call('/api/v1/me/prepaid-overview');
  showLoggedIn(true);
  const labels={ACTIVE:'اشتراک فعال',EXPIRED:'اشتراک منقضی شده',NO_SUBSCRIPTION:'اشتراک فعالی ندارید'};
  $('sahminoEntitlementStatus').textContent=labels[data.reason]||'وضعیت: '+data.reason;
  $('sahminoPaidUntil').textContent=data.paidUntil?'اعتبار تا: '+date(data.paidUntil)+' — زمان باقی‌مانده: '+new Intl.NumberFormat('fa-IR').format(Math.ceil((data.remainingSeconds||0)/86400))+' روز':'تاریخ پایان اعتبار: —';
  const list=$('sahminoOrderHistory');list.replaceChildren();
  for(const order of (Array.isArray(data.orders)?data.orders:[])){
   const li=document.createElement('li');
   li.textContent=order.planId+' | '+rial(order.amountRial)+' | '+({PENDING:'در انتظار پرداخت',SETTLED:'پرداخت تأییدشده',CANCELLED:'لغوشده',EXPIRED:'منقضی',REVIEW_REQUIRED:'نیازمند بررسی'}[order.state]||order.state)+' | '+date(order.createdAt)+' | شناسه: '+order.orderId;
   list.appendChild(li);
  }
  if(!list.children.length){const li=document.createElement('li');li.textContent='هنوز سفارشی ثبت نشده است.';list.appendChild(li);}
  message('اطلاعات حساب از سرور دریافت شد.');
 }catch(e){showLoggedIn(false);message(e.message);}
}
$('sahminoOtpRequest').addEventListener('click',async()=>{
 try{const phone=$('sahminoPhone').value.trim();const data=await call('/api/v1/auth/otp/request',{method:'POST',body:JSON.stringify({phone})});challengeId=data.challengeId;message('کد ورود ارسال شد. اعتبار کد: '+data.expiresInSeconds+' ثانیه.');}
 catch(e){message(e.message);}
});
$('sahminoOtpVerify').addEventListener('click',async()=>{
 try{if(!challengeId)throw Error('ابتدا درخواست دریافت کد را ثبت کنید.');await call('/api/v1/auth/otp/verify',{method:'POST',body:JSON.stringify({challengeId,code:$('sahminoOtpCode').value.trim()})});challengeId=null;await refresh();}
 catch(e){message(e.message);}
});
$('sahminoRefreshAccount').addEventListener('click',refresh);
$('sahminoLogout').addEventListener('click',async()=>{
 try{await call('/api/v1/auth/logout',{method:'POST',headers:{'X-Sahmino-CSRF':'1'}});showLoggedIn(false);message('از حساب خارج شدید.');}
 catch(e){message(e.message);}
});
$('sahminoCreatePendingOrder').addEventListener('click',async()=>{
 try{
  const selected=document.querySelector('input[name="sahminoPlanDays"]:checked');
  if(!selected||!planIds[selected.value])throw Error('یک طرح معتبر انتخاب کنید.');
  const existing=await call('/api/v1/me/prepaid-orders');
  if(existing.pending&&existing.order){
   message('برای شما یک سفارش در انتظار وجود دارد: '+rial(existing.order.amountRial)+' — شناسه: '+existing.order.id+'. هنوز پرداختی انجام نشده است.');
   return;
  }
  const created=await call('/api/v1/me/prepaid-orders',{method:'POST',headers:{'X-Sahmino-CSRF':'1'},body:JSON.stringify({planId:planIds[selected.value]})});
  if(created.reason!=='PENDING_ORDER_CREATED'||!created.order||typeof created.order.id!=='string')throw Error('سفارش معلق از سرور تأیید نشد.');
  await refresh();
  message('درخواست سفارش '+rial(created.order.amountRial)+' با شناسه '+created.order.id+' ثبت شد. این سفارش پرداخت نیست و تا تأیید پرداخت، اشتراکی فعال نمی‌شود.');
 }catch(e){message(e.message);}
});
refresh();
})();