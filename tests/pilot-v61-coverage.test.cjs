'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('portfolio-pilot-v61.js','utf8');
const html=fs.readFileSync('portfolio-pilot-v61.html','utf8');
assert.ok(html.includes('portfolio-pilot-v61.js?v=61.2'));
assert.ok(html.includes('دریافت و بررسی تاریخچه همه نمادهای سبد'));
assert.ok(!/۱۹ نماد|19 نماد|19 symbols/.test(html));
assert.ok(src.includes("quotes.filter(q=>q.priceKind==='آخرین معامله').length"));
assert.ok(src.includes("quotes.filter(q=>q.priceKind==='پایانی').length"));
assert.ok(src.includes("quotes.filter(q=>q.lastTradeTime==='نامشخص').length"));
assert.ok(src.includes('پوشش قیمت:'));
assert.ok(src.includes("دریافت تاریخچه مستقل برای '+fmt(holdings.length)+' نماد آغاز شد"));
console.log('PASS v61 variable-size portfolio and quote coverage');
\nassert.ok(src.includes('const outliers=ranked.filter(r=>Math.abs(r.pct)>=50)'));\nassert.ok(src.includes('نیازمند بررسی قیمت خرید/تعدیل'));\nassert.ok(src.includes('سامانه هیچ قیمت یا تعداد سهمی را خودکار اصلاح نمی‌کند'));\n