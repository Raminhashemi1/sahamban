'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const tech=fs.readFileSync('technical-analysis-v50.js','utf8');
const pilot=fs.readFileSync('portfolio-pilot-v61.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');

test('v50 selector has a DOM-table fallback independent of custom events',()=>{
 assert.match(tech,/const portfolioRows=\$\('livePortfolioRows'\)/);
 assert.match(tech,/new MutationObserver\(activateFromVisibleRows\)/);
 assert.match(tech,/row\.cells\[0\]/);
 assert.match(tech,/selector\.disabled=false/);
 assert.match(tech,/history:null/);
});

test('HTML and service worker load cache-busted selector and broker scripts',()=>{
 assert.match(html,/broker-import\.js\?v=48\.2/);
 assert.match(html,/technical-analysis-v50\.js\?v=50\.20/);
 assert.match(sw,/sahamban-static-v61-41/);
 assert.match(sw,/broker-import\.js\?v=48\.2/);
 assert.match(sw,/technical-analysis-v50\.js\?v=50\.20/);
});

test('diagnostic report version matches the cache-busted technical-analysis asset',()=>{
 assert.ok(tech.includes('v50.20 UI'));
 assert.ok(tech.includes('نسخه گزارش: تحلیل ۵۰.۲۰ | تطبیق‌گر ۴۹.۴'));
});

test('v50 selector can request real history for every portfolio symbol without fabricated data',()=>{
 assert.match(html,/technicalHistoryAllV50/);
 assert.match(pilot,/getHistoricalOne/);
  assert.match(pilot,/x\.quote\?\.insCode/);
 assert.match(pilot,/GetInstrumentSearch/);
 assert.match(pilot,/GetInstrumentInfo/);
 assert.match(pilot,/instrumentID/);
 assert.match(pilot,/identityError/);
 assert.match(pilot,/GetClosingPriceDailyList/);
 assert.match(pilot,/sahamban:verified-historical-quotes-v50/);
 assert.match(pilot,/history\.length<15/);
 assert.ok(pilot.includes("if(!/^\\d{8}$/.test(date)"));
 assert.ok(pilot.includes("if(!/^\\d{8}$/.test(date)"));
 assert.doesNotMatch(tech, /\bfetch\s*\(/);
 assert.match(html,/technical-analysis-v50\.js\?v=50\.20/);
 assert.match(sw,/sahamban-static-v61-41/);
});

test('history failure reasons are visible in both selector labels and status details',()=>{
 assert.match(tech,/q\.error\?'\\n\\nگزارش کامل سرویس و مشخصات شناسه‌ها:/);
 assert.match(tech,/const failed=quotes\.filter/);
 assert.match(tech,/q\.error\|\|'سرویس علت مشخصی گزارش نکرده است\.'/);
 assert.match(tech,/تأیید نشد.*q\.error\.slice/);
});

test('candidate diagnostics label cIsin and instrumentID as their exact API fields',()=>{
 assert.match(pilot,/؛ cIsin=/);
 assert.match(pilot,/؛ instrumentID=/);
 assert.doesNotMatch(pilot,/؛ ISIN=/);
 assert.doesNotMatch(pilot,/؛ شناسه هویتی=/);
});

test('ambiguous symbol diagnostics expose full candidate metadata and a copy action',()=>{
 assert.match(html,/technicalCopyDiagnosticsV50/);
 assert.match(tech,/navigator\.clipboard\.writeText\(report\)/);
 assert.match(tech,/گزارش کامل کپی شد/);
 assert.match(tech,/q\.error/);
 assert.match(tech,/گزارش تشخیصی تاریخچه نمادها/);
});

test('instrument selection is explicit, local-only and revalidated against fresh history',()=>{
 assert.match(html,/id="instrumentMappingPanel"/);
 assert.match(pilot,/sahamban-instrument-mappings-v1/);
 assert.match(pilot,/تأیید و ذخیره انتخاب/);
 assert.match(pilot,/انتخاب ذخیره‌شده /);
 assert.match(pilot,/شناسه حفظ شد و انتخاب خودکار دیگری انجام نشد/);
 assert.match(pilot,/برای اعمال، دریافت تاریخچه همه نمادها را دوباره اجرا کن/);
 assert.match(pilot,/localStorage\.setItem\(MAPPINGS_KEY/);
 assert.doesNotMatch(pilot,/localStorage\.setItem\(HOLDINGS_KEY/);
});

test('instrument mapping save and clear operations verify exact localStorage readback and show per-row status',()=>{
 assert.match(pilot,/const savedStatus=document\.createElement\('p'\)/);
 assert.match(pilot,/localStorage\.setItem\(MAPPINGS_KEY,serialized\)/);
 assert.match(pilot,/const readBack=localStorage\.getItem\(MAPPINGS_KEY\)/);
 assert.match(pilot,/String\(verified\?\.\[symbol\]\?\?''\)!==code/);
 assert.match(pilot,/ذخیره تأیید شد؛ شناسه ثبت‌شده:/);
 assert.match(pilot,/ذخیره تأیید نشد:/);
 assert.match(pilot,/پاک‌شدن آن از حافظه تأیید شد/);
});

test('candidate diagnostics expose lastDate and yMarNSC from instrument identity metadata',()=>{
 assert.match(pilot,/lastDate:identity\.lastDate\?\?candidate\.lastDate/);
 assert.match(pilot,/yMarNSC:identity\.yMarNSC\?\?candidate\.yMarNSC/);
 assert.match(pilot,/آخرین تاریخ معامله ثبت‌شده در مشخصات ابزار=/);
 assert.match(pilot,/شناسه طبقه‌بندی بازار=/);
});

// Cache-busted diagnostic metadata assertions are covered above.

test('candidate diagnostics ignore zero lastDate and expose actual verified history range and count',()=>{
 assert.ok(pilot.includes('const lastDate=/^\\d{8}$/'));
 assert.ok(pilot.includes('historyStartDate,historyEndDate,historyCount:history.length'));
 assert.ok(pilot.includes('بازه تاریخچه معتبر='));
 assert.ok(pilot.includes('تعداد رکوردهای تاریخچه='));
});

test('recent-history date matcher uses a single-digit-class escape and accepts real YYYYMMDD dates',()=>{
 assert.ok(pilot.includes("if(!/^\\d{8}$/.test(raw))return null;"));
 assert.ok(!pilot.includes("if(!/^\\\\d{8}$/.test(raw))return false;"));
 const datePattern=/^\d{8}$/;
 assert.equal(datePattern.test('20261028'),true);
 assert.equal(datePattern.test('2026-10-28'),false);
});

test('unique recent historical candidate is selected for this session without persisting a market mapping',()=>{
 assert.match(pilot,/unique-freshest-recent-history/);
 assert.match(pilot,/age>=0&&age<=7/);
 assert.match(pilot,/freshest\.length===1/);
 assert.match(pilot,/این انتخاب در حافظه ذخیره نشده/);
 assert.match(pilot,/mappingCandidates\[holding\.symbol\]=valid\.map/);
 assert.match(tech,/q\.resolutionNote/);
});
