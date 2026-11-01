'use strict';
/* v91: discoverable in-module guidance; zero holdings reads and zero network. */
(()=>{
 const steps={
 livePortfolioSection:['فایل سبد را از «ورود دارایی‌ها» اضافه کنید.','«دریافت قیمت همه نمادها و محاسبه» را بزنید.','ارزش سبد، تاریخ قیمت و وضعیت NAV را بررسی کنید.'],
 brokerImportSection:['فایل CSV یا Excel کارگزاری را انتخاب کنید.','واحد پول، نمادها، تعداد و بهای خرید را بررسی کنید.','فقط پس از اطمینان اطلاعات را اعمال کنید؛ اطلاعات حساس وارد نکنید.'],
 portfolioSection:['اطلاعات دارایی و قیمت‌های تأییدشده را آماده کنید.','خلاصه عملکرد و تمرکز را مشاهده کنید.','افت‌های فرضی را سناریو بدانید، نه پیش‌بینی قیمت.'],
 technicalAnalysisV50:['قیمت‌های جاری را در «سبد من» دریافت کنید.','تاریخچه تأییدشده نمادها را جداگانه دریافت کنید.','پس از انتخاب نماد، شاخص‌ها را با توجه به اعتبار داده بخوانید.'],
 marketSection:['نام نماد موردنظر را وارد کنید.','شناسه رسمی نماد را از نتایج انتخاب کنید.','تاریخ و منبع پاسخ را قبل از استفاده بررسی کنید.'],
 positionSizeSectionV87:['سرمایه و درصد ریسک هر معامله را تعیین کنید.','قیمت خرید، حد ضرر و سقف بودجه را وارد کنید.','«محاسبه» را بزنید؛ هزینه‌های معامله در خروجی لحاظ نشده‌اند.'],
 watchlistSection:['نمادهای موردنظر را به فهرست اضافه کنید.','قیمت یا محدوده هشدار را تنظیم کنید.','برای بررسی دستی دوباره به صفحه مراجعه کنید؛ پایش همیشگی فعال نیست.'],
 manualAlertsSectionV87:['نماد، قیمت و مرزهای هشدار را وارد کنید.','دکمه بررسی قیمت را بزنید.','در صورت نیاز صدا را آزمایش کنید؛ هشدار پس‌زمینه فعال نیست.'],
 professionalRiskV49:['اطلاعات واقعی دارایی و قیمت معتبر را فراهم کنید.','وضعیت اعتبار داده را قبل از تحلیل کنترل کنید.','شاخص‌های تمرکز و تنش را به‌عنوان ابزار آموزشی بخوانید.'],
 historicalSectionV87:['قیمت‌ها یا فایل تاریخچه معتبر را وارد کنید.','برای تحلیل، حداقل تعداد داده لازم را تکمیل کنید.','خروجی روند را همراه با محدودیت‌های داده تفسیر کنید.']
 };
 const host=document.querySelector('main');
 if(!host)return;
 for(const [id,lines] of Object.entries(steps)){
  const section=document.getElementById(id);if(!section||!host.contains(section))continue;
  const heading=section.querySelector('h2');if(!heading)continue;
  const panel=document.createElement('details');
  panel.className='sb91-guide';
  const summary=document.createElement('summary');
  summary.textContent='راهنمای سریع این بخش';
  summary.setAttribute('aria-label','نمایش راهنمای سریع '+heading.textContent.trim());
  const ordered=document.createElement('ol');
  for(const line of lines){const item=document.createElement('li');item.textContent=line;ordered.append(item);}
  const note=document.createElement('p');
  note.className='sb91-guide-note';
  note.textContent='این راهنما آموزشی است؛ نمایش قیمت یا محاسبه به معنی توصیه خرید و فروش نیست.';
  panel.append(summary,ordered,note);
  // Add after the heading or its heading row, without moving interactive controls.
  const anchor=heading.parentElement?.classList.contains('row')?heading.parentElement:heading;
  anchor.insertAdjacentElement('afterend',panel);
 }
})();
