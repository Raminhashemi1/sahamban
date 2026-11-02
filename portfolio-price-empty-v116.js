'use strict';
/* v116: explain why the read-only holdings table is hidden before price input.
 * Presentation only: no pricing, storage, network, portfolio or NAV changes.
 */
(()=>{
 const panel=document.getElementById('sb88-panel-prices');
 const table=document.getElementById('livePortfolioTable');
 const overviewTab=document.getElementById('sb88-tab-overview');
 if(!panel||!table||!overviewTab)return;
 const guide=document.createElement('div');
 guide.id='sb116PriceEmpty';
 guide.className='sb116-price-empty';
 guide.setAttribute('role','status');
 const message=document.createElement('p');
 message.textContent='جدول هنوز آمادهٔ نمایش نیست. برای دیدن دارایی‌ها ابتدا در «نمای کلی» دریافت قیمت‌ها یا «ارزش‌گذاری با قیمت فایل (بدون اینترنت)» را انجام دهید. قیمت فایل لزوماً قیمت امروز بازار نیست.';
 const button=document.createElement('button');
 button.type='button';
 button.className='sb116-price-empty-action';
 button.textContent='رفتن به نمای کلی برای آماده‌سازی جدول';
 button.addEventListener('click',()=>{
  overviewTab.click();
  overviewTab.focus();
 });
 guide.append(message,button);
 table.before(guide);
 const update=()=>{guide.hidden=!table.hidden;};
 new MutationObserver(update).observe(table,{attributes:true,attributeFilter:['hidden']});
 update();
})();