'use strict';
/* v115: presentation-only wrappers for the portfolio insight tables.
 * Keep the original cells, text, row order and all financial calculations intact.
 */
(()=>{
 const panel=document.getElementById('portfolioInsightsV613');
 if(!panel)return;
 function wrapTables(){
  for(const table of Array.from(panel.children)){
   if(table.tagName!=='TABLE')continue;
   const region=document.createElement('div');
   region.className='sb115-insight-scroll';
   region.tabIndex=0;
   region.setAttribute('role','region');
   let title='';
   for(let node=table.previousElementSibling;node;node=node.previousElementSibling){
    if(node.tagName==='STRONG'){title=node.textContent.trim();break;}
   }
   region.setAttribute('aria-label',(title||'جدول گزارش سبد')+'؛ برای دیدن ستون‌های دیگر افقی پیمایش کنید');
   table.before(region);
   region.append(table);
  }
 }
 const observer=new MutationObserver(wrapTables);
 observer.observe(panel,{childList:true});
 wrapTables();
})();
