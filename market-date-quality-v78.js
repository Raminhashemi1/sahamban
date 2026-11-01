'use strict';
/* v78: Read-only, opt-in market-date quality report. No network, storage or exported holdings. */
(()=>{
 const parent=document.getElementById('portfolioDiagnosticV74');
 if(!parent)return;
 const block=document.createElement('p');
 block.id='marketDateQualityV78';
 block.setAttribute('aria-live','polite');
 parent.append(block);
 let status='not-run';
 const show=()=>{block.textContent='اعتبار زمانی قیمت‌های سبد: '+({
  'not-run':'آزمایش نشده',
  'in-progress':'در حال دریافت',
  'current':'همه تاریخ‌های معتبر مربوط به امروز تهران هستند؛ زمان آخرین معامله همچنان مستقل است',
  'prior-session':'همه تاریخ‌ها معتبرند، اما حداقل یک قیمت مربوط به روزهای قبل است؛ ممکن است بازار تعطیل بوده باشد',
  'invalid':'تاریخ یک یا چند قیمت نامعتبر، در آینده یا بیش از ۷ روز قدیمی است',
  'failed':'دریافت کامل قیمت‌های سبد تأیید نشد'
 }[status]||'نامشخص');};
 const dayStamp=raw=>{
  const s=String(raw??'');
  if(!/^\d{8}$/.test(s))return null;
  const y=+s.slice(0,4),m=+s.slice(4,6),d=+s.slice(6,8),dt=Date.UTC(y,m-1,d),day=new Date(dt);
  return day.getUTCFullYear()===y&&day.getUTCMonth()===m-1&&day.getUTCDate()===d?dt:null;
 };
 const today=()=>{
  const fields=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
  return Date.UTC(fields.year,fields.month-1,fields.day);
 };
 window.addEventListener('sahamban:portfolio-refresh-status-v76',e=>{
  if(e?.detail?.status==='started')status='in-progress';
  if(e?.detail?.status==='failed')status='failed';
  show();
 });
 window.addEventListener('sahamban:verified-portfolio-concentration-v68',e=>{
  if(status!=='in-progress')return;
  const rows=e?.detail?.positions;
  if(!Array.isArray(rows)||rows.length<1||rows.length>100){status='invalid';show();return;}
  const now=today();
  let old=false,invalid=false;
  for(const row of rows){
   const time=dayStamp(row?.marketDate),age=time===null?NaN:Math.floor((now-time)/86400000);
   if(!Number.isInteger(age)||age<0||age>7){invalid=true;break;}
   if(age>0)old=true;
  }
  status=invalid?'invalid':old?'prior-session':'current';
  show();
 });
 show();
})();
