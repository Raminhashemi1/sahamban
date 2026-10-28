'use strict';
const $ = id => document.getElementById(id);
const n = id => Number($(id).value);
const fmt = value => new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(value);
$('calculate').addEventListener('click',()=>{
 const [capital,risk,entry,stop,target,budget]=['capital','risk','entry','stop','target','budget'].map(n);
 if(![capital,risk,entry,stop,target,budget].every(Number.isFinite)||capital<=0||risk<=0||risk>100||entry<=0||stop<0||stop>=entry||target<=entry||budget<=0){$('calcResult').textContent='مقادیر معتبر وارد کنید: حد ضرر کمتر از قیمت ورود و حد سود بیشتر از آن باشد.';return;}
 const allowed=capital*risk/100, qty=Math.max(0,Math.floor(Math.min(allowed/(entry-stop),Math.min(budget,capital)/entry)));
 const loss=qty*(entry-stop),gain=qty*(target-entry);
 $('calcResult').textContent=`سقف خرید محاسباتی: ${fmt(qty)} سهم | ارزش خرید: ${fmt(qty*entry)} تومان | زیان نظری تا حد ضرر: ${fmt(loss)} تومان | سود نظری تا حد سود: ${fmt(gain)} تومان | نسبت سود به زیان: ${fmt((target-entry)/(entry-stop))}`;
});
function playBeep(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C();c.resume().then(()=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=880;g.gain.value=.3;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.45);o.onended=()=>c.close()}).catch(()=>{})}catch(e){}}
function speak(s){playBeep();const out=$('alerts');const saved=localStorage.getItem('sahamban-recorded-alert');if(saved){try{const a=new Audio(saved);a.play().then(()=>{if(out)out.textContent='بوق و پیام صوتی ضبط‌شده پخش شدند.'}).catch(()=>{if(out)out.textContent='بوق پخش شد، اما پخش صدای ضبط‌شده در مرورگر ممکن نشد.'});return}catch(e){}}if(out)out.textContent='بوق پخش شد. برای پیام فارسی، یک بار صدای خودت را با دکمه ضبط هشدار ثبت کن.'}
let sbRecorder=null,sbStream=null,sbChunks=[];
$('recordStart').addEventListener('click',async()=>{const out=$('alerts');if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){out.textContent='این مرورگر امکان ضبط صدا ندارد.';return;}try{sbStream=await navigator.mediaDevices.getUserMedia({audio:true});sbChunks=[];sbRecorder=new MediaRecorder(sbStream);sbRecorder.ondataavailable=e=>{if(e.data.size)sbChunks.push(e.data)};sbRecorder.onstop=()=>{const blob=new Blob(sbChunks,{type:sbRecorder.mimeType||'audio/webm'});const reader=new FileReader();reader.onload=()=>{try{localStorage.setItem('sahamban-recorded-alert',reader.result);out.textContent='صدای فارسی روی همین گوشی ذخیره شد. با «آزمایش صدا» امتحانش کن.'}catch(e){out.textContent='فضای ذخیره گوشی کافی نیست. یک پیام کوتاه‌تر ضبط کن.'}};reader.readAsDataURL(blob);sbStream?.getTracks().forEach(t=>t.stop());sbStream=null};sbRecorder.start();out.textContent='در حال ضبط... بگو: هشدار سهام‌بان. بعد «پایان ضبط» را بزن.'}catch(e){out.textContent='اجازه میکروفون داده نشد یا میکروفون در دسترس نیست.';}});
$('recordStop').addEventListener('click',()=>{if(sbRecorder?.state==='recording'){sbRecorder.stop()}else{$('alerts').textContent='ابتدا «ضبط هشدار فارسی» را بزن.'}});
$('speech').addEventListener('click',()=>speak('آزمایش هشدار صوتی سهام بان'));
const sahambanVoicePreview='./alert-voice.mp3?v=14';
$('voicePreview').addEventListener('click',()=>{const status=$('alerts');status.textContent='در حال پخش صدای آماده...';const audio=new Audio(sahambanVoicePreview);audio.play().then(()=>{status.textContent='صدای آماده از فایل داخلی در حال پخش است. اگر شنیدی، خبر بده تا به هشدار متصلش کنم.'}).catch(()=>{status.textContent='صدای آماده از فایل داخلی سهام‌بان پخش نشد. صدای ضبط‌شده قبلی محفوظ است.'})});
$('check').addEventListener('click',()=>{
 const symbol=$('symbol').value.trim().slice(0,35)||'سهم',price=n('price'),stop=n('aStop'),target=n('aTarget'),el=$('alerts');
 el.replaceChildren();if(![price,stop,target].every(Number.isFinite)||price<0||stop<0||target<=stop){el.textContent='قیمت‌ها را معتبر وارد کنید و حد سود را بیشتر از حد ضرر بگذارید.';return;}
 const message=price<=stop?`هشدار حد ضرر: قیمت ${symbol} به ${fmt(price)} تومان رسیده است.`:price>=target?`هشدار حد سود: قیمت ${symbol} به ${fmt(price)} تومان رسیده است.`:`برای ${symbol} در قیمت ${fmt(price)} تومان، حد سود یا ضرر فعال نشده است.`;
 const p=document.createElement('div');p.className=price<=stop||price>=target?'alarm':'result';p.textContent=message;el.appendChild(p);if(price<=stop||price>=target)speak(message);
});
const fields=['symbol','aStop','aTarget'];
$('save').addEventListener('click',()=>{const obj={};for(const id of fields)obj[id]=$(id).value;localStorage.setItem('sahamban-v1',JSON.stringify(obj));$('alerts').textContent='تنظیمات هشدار روی همین دستگاه ذخیره شد.';});
try{const saved=JSON.parse(localStorage.getItem('sahamban-v1')||'null');if(saved)for(const id of fields)if(typeof saved[id]==='string')$(id).value=saved[id];}catch(e){}
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

// تحلیل محلی تاریخچه؛ هیچ درخواست شبکه‌ای انجام نمی‌شود.
function parsePrices(raw){
 const lines=raw.replace(/^\uFEFF/,'').trim().split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(!lines.length)throw Error('داده‌ای وارد نشده است.');
 const sep=lines[0].includes(';')?';':lines[0].includes('\t')?'\t':',';
 const cells=x=>x.split(sep).map(v=>v.trim().replace(/^"|"$/g,''));
 const header=cells(lines[0]);
 const normalized=header.map(v=>v.toLowerCase().replace(/[_\s-]/g,''));
 let col=normalized.findIndex(v=>['close','closingprice','adjclose','قیمتپایانی','پایانی'].includes(v));
 let start=col>=0?1:0;
 if(col<0){if(header.length>1)throw Error('برای CSV چندستونی، ستون close یا قیمت پایانی لازم است.');col=0;}
 const values=[];
 for(let i=start;i<lines.length;i++){
  const cell=cells(lines[i])[col]; if(cell===undefined||!cell.trim())continue;
  const digits=cell.replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const value=Number(digits.replace(/٬/g,'').replace(/,/g,''));
  if(!Number.isFinite(value)||value<=0)throw Error(`قیمت نامعتبر در سطر ${i+1}`);
  values.push(value);
 }
 if(values.length<15)throw Error('برای RSI حداقل ۱۵ قیمت پایانی معتبر لازم است.');
 if(values.length>20000)throw Error('حداکثر ۲۰ هزار قیمت در هر تحلیل مجاز است.');
 return values;
}
function sma(a,n){return a.length>=n?a.slice(-n).reduce((s,v)=>s+v,0)/n:null;}
function rsi(a,n=14){if(a.length<n+1)return null;let gain=0,loss=0;
 for(let i=1;i<=n;i++){let d=a[i]-a[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0);}
 gain/=n;loss/=n;
 for(let i=n+1;i<a.length;i++){let d=a[i]-a[i-1];gain=(gain*(n-1)+Math.max(d,0))/n;loss=(loss*(n-1)+Math.max(-d,0))/n;}
 return loss===0?(gain===0?50:100):100-100/(1+gain/loss);
}
function chart(a){let last=a.slice(-150), min=Math.min(...last),max=Math.max(...last),range=max-min||1;
 let points=last.map((v,i)=>`${(i*680/Math.max(1,last.length-1)).toFixed(1)},${(155-(v-min)/range*135).toFixed(1)}`).join(' ');
 $('priceChart').innerHTML=`<svg viewBox="0 0 700 190" width="100%" aria-hidden="true" style="background:#0a1a2f;border-radius:12px;margin-top:12px"><line x1="10" y1="165" x2="690" y2="165" stroke="#49627a"/><polyline transform="translate(10 0)" points="${points}" fill="none" stroke="#35c7aa" stroke-width="2.5" stroke-linejoin="round"/><text x="12" y="185" font-size="14" fill="#c6d8e5">${fmt(min)} تا ${fmt(max)} — آخرین ${last.length} رکورد</text></svg>`;
}
function analyze(a){let last=a.at(-1),m20=sma(a,20),m50=sma(a,50),r=rsi(a),chg=(last/a[0]-1)*100;
 let observations=[];
 if(m20!==null)observations.push(last>m20?'قیمت بالاتر از میانگین ۲۰ دوره است.':last<m20?'قیمت پایین‌تر از میانگین ۲۰ دوره است.':'قیمت برابر میانگین ۲۰ دوره است.');
 if(m50!==null&&m20!==null)observations.push(m20>m50?'میانگین ۲۰ دوره بالاتر از ۵۰ دوره است.':'میانگین ۲۰ دوره بالاتر از ۵۰ دوره نیست.');
 observations.push(r>70?'RSI بالای ۷۰ است؛ امکان اشباع خرید مطرح می‌شود.':r<30?'RSI زیر ۳۰ است؛ امکان اشباع فروش مطرح می‌شود.':'RSI بین ۳۰ و ۷۰ است.');
 $('analysisResult').textContent=`تعداد رکورد: ${fmt(a.length)} | آخرین قیمت: ${fmt(last)} | تغییر کل بازه: ${fmt(chg)}٪ | SMA20: ${m20===null?'داده ناکافی':fmt(m20)} | SMA50: ${m50===null?'داده ناکافی':fmt(m50)} | RSI14: ${fmt(r)}. ${observations.join(' ')} این مشاهدات به‌تنهایی سیگنال معامله نیستند.`;
 chart(a);
}
$('analyze').addEventListener('click',()=>{try{analyze(parsePrices($('historyText').value));}catch(e){$('analysisResult').textContent=e.message;$('priceChart').replaceChildren();}});
$('historyFile').addEventListener('change',async e=>{let f=e.target.files[0];if(!f)return;if(f.size>1024*1024){$('analysisResult').textContent='حجم فایل باید کمتر از یک مگابایت باشد.';return;}try{$('historyText').value=await f.text();analyze(parsePrices($('historyText').value));}catch(err){$('analysisResult').textContent=err.message;}});
$('demo').addEventListener('click',()=>{let a=Array.from({length:90},(_,i)=>Math.round(1000+i*2+45*Math.sin(i*.24)));$('historyText').value=a.join('\n');analyze(a);});


// گزارش محلی ریسک سبد؛ بدون ارسال داده به اینترنت و بدون ذخیره سبد.
let latestPortfolioReport=null;
let portfolioReportSnapshot=null;
function invalidatePortfolioReport(){
 if(latestPortfolioReport){$('portfolioSummary').textContent='اطلاعات سبد تغییر کرده است. برای دیدن اعداد جدید، «محاسبه گزارش سبد» را بزنید.';$('portfolioDetails').replaceChildren();}
 latestPortfolioReport=null;portfolioReportSnapshot=null;
}
function portfolioNumber(v,line){
 const digits=String(v).trim().replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٬/g,'').replace(/٫/g,'.');
 const val=Number(digits);
 if(digits===''||!Number.isFinite(val))throw Error('عدد نامعتبر در سطر '+line);
 return val;
}
function parsePortfolio(raw){
 const lines=raw.trim().split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(!lines.length)throw Error('دست‌کم یک سهم وارد کنید.');
 if(lines.length>100)throw Error('حداکثر ۱۰۰ سهم پشتیبانی می‌شود.');
 const names=new Set();
 return lines.map((line,i)=>{
   const cols=line.split(/[,،;\t]/).map(s=>s.trim());
   if(cols.length!==6)throw Error(`در سطر ${i+1} باید دقیقاً ۶ مقدار باشد.`);
   const symbol=cols[0];
   if(!symbol||symbol.length>35||names.has(symbol))throw Error(`نام نماد خالی، تکراری یا نامعتبر در سطر ${i+1}`);
   names.add(symbol);
   const [qty,buy,current,stop,target]=cols.slice(1).map(v=>portfolioNumber(v,i+1));
   if(!Number.isSafeInteger(qty)||qty<=0||[buy,current,stop,target].some(v=>v<=0)||stop>=current||target<=current)throw Error(`مقادیر نامعتبر در سطر ${i+1}: تعداد باید عدد صحیح مثبت، حد ضرر کمتر از قیمت فعلی و حد سود بیشتر از آن باشد.`);
   const computed={value:qty*current,cost:qty*buy,pnl:qty*(current-buy),atRisk:qty*(current-stop),upside:qty*(target-current)};
   if(!Object.values(computed).every(Number.isFinite))throw Error(`مقادیر بسیار بزرگ و محاسبه‌ناپذیر در سطر ${i+1}.`);
   return {symbol,qty,buy,current,stop,target,...computed};
 });
}
function portfolioRewardRisk(upside,risk){return risk>0&&Number.isFinite(upside/risk)?upside/risk:null;}
function reportPortfolio(){
 const summary=$('portfolioSummary'),details=$('portfolioDetails');
 try{
  const positions=parsePortfolio($('portfolioData').value);
  const baseText=$('portfolioCapital').value.trim();
  const capital=baseText===''?null:portfolioNumber(baseText,'سرمایه');
  const riskCap=portfolioNumber($('portfolioRiskCap').value,'سقف ریسک');
  const stress=portfolioNumber($('portfolioStress').value,'افت فرضی');
  const concentrationCap=portfolioNumber($('portfolioConcentration').value,'سقف تمرکز');
  if(concentrationCap<1||concentrationCap>100)throw Error('سقف تمرکز باید بین ۱ تا ۱۰۰ درصد باشد.');
  if(stress<0||stress>100)throw Error('افت فرضی باید بین صفر و ۱۰۰ درصد باشد.');
  if((capital!==null&&capital<=0)||riskCap<=0||riskCap>100)throw Error('سرمایه مبنا باید مثبت و درصد سقف زیان بین صفر و ۱۰۰ باشد.');
  const sum=k=>positions.reduce((a,x)=>a+x[k],0),value=sum('value'),cost=sum('cost'),pnl=sum('pnl'),atRisk=sum('atRisk'),upside=sum('upside');
  if(![value,cost,pnl,atRisk,upside].every(Number.isFinite))throw Error('اعداد بیش از حد بزرگ هستند.');
  const grossGains=positions.reduce((total,x)=>total+Math.max(0,x.pnl),0);
  const grossLosses=positions.reduce((total,x)=>total+Math.max(0,-x.pnl),0);
  const topGainer=positions.filter(x=>x.pnl>0).sort((a,b)=>b.pnl-a.pnl)[0]??null;
  const topLoser=positions.filter(x=>x.pnl<0).sort((a,b)=>a.pnl-b.pnl)[0]??null;
  const largestRisk=positions.reduce((a,b)=>a.atRisk>=b.atRisk?a:b);
  const rewardRisk=portfolioRewardRisk(upside,atRisk);
  const lowRewardRisk=positions.filter(x=>{const ratio=portfolioRewardRisk(x.upside,x.atRisk);return ratio!==null&&ratio<1;});
  const strongest=positions.reduce((a,b)=>a.value>b.value?a:b);
  const concentrated=strongest.value/value*100;
  const overConcentrated=positions.map(x=>({...x,weight:100*x.value/value})).filter(x=>x.weight>concentrationCap);
  const riskPercent=capital===null?null:atRisk/capital*100;
  const outside=capital!==null&&value>capital;
  const stressLoss=value*stress/100;
  const stressValue=value-stressLoss;
  const stressOnCapital=capital===null?'':`، معادل ${fmt(stressLoss/capital*100)}٪ سرمایه مبنا`;
  const exceeds=riskPercent!==null&&riskPercent>riskCap;
  summary.textContent=`تعداد نماد: ${fmt(positions.length)} | ارزش روز سبد: ${fmt(value)} تومان | بهای خرید: ${fmt(cost)} تومان | سود/زیان تحقق‌نیافته: ${fmt(pnl)} تومان (${fmt(cost?100*pnl/cost:0)}٪) | زیان نظری از قیمت جاری تا حد ضرر: ${fmt(atRisk)} تومان${riskPercent===null?'':` (${fmt(riskPercent)}٪ سرمایه مبنا)`} | سود نظری تا اهداف: ${fmt(upside)} تومان | بیشترین تمرکز: ${strongest.symbol}، ${fmt(concentrated)}٪ ارزش سبد.${exceeds?' هشدار: زیان نظری سبد بیشتر از سقف تعیین‌شده است.':''}${outside?' هشدار: ارزش روز سهام از سرمایه مبنای ثبت‌شده بیشتر است؛ این الزاماً خطا نیست و ممکن است به دلیل سود یا تأمین مالی باشد.':''} این اعداد بدون کارمزد و لغزش هستند.`;
  summary.textContent+=overConcentrated.length?` | هشدار تمرکز: ${fmt(overConcentrated.length)} نماد بیش از سقف ${fmt(concentrationCap)}٪ هستند: ${overConcentrated.map(x=>x.symbol+' ('+fmt(x.weight)+'٪)').join('، ')}. این شاخص فقط تمرکز را نشان می‌دهد و توصیه خرید یا فروش نیست.`:` | تمرکز سبد: هیچ نمادی بالاتر از سقف ${fmt(concentrationCap)}٪ نیست.`;
  summary.textContent+=` | سهم‌های سودده: ${fmt(grossGains)} تومان سود ناخالصِ تحقق‌نیافته${topGainer?`؛ بیشترین سود: ${topGainer.symbol} (${fmt(topGainer.pnl)} تومان)`:'؛ هیچ سهم سوددهی ثبت نشده'} | سهم‌های زیان‌ده: ${fmt(grossLosses)} تومان زیان ناخالصِ تحقق‌نیافته${topLoser?`؛ بیشترین زیان: ${topLoser.symbol} (${fmt(-topLoser.pnl)} تومان)`:'؛ هیچ سهم زیان‌دهی ثبت نشده'}. سهم هر نماد از سودها یا زیان‌ها جداگانه محاسبه می‌شود، نه از سود خالص سبد.`;
  summary.textContent+=` | بیشترین سهم از ریسک حد ضرر: ${largestRisk.symbol} با ${fmt(largestRisk.atRisk)} تومان${atRisk>0?` (${fmt(largestRisk.atRisk/atRisk*100)}٪ ریسک نظری کل سبد)`:' (ریسک نظری صفر)'}. این شاخص با سهم از ارزش سبد متفاوت است.`;
  summary.textContent+=` | نسبت سود نظری تا هدف به زیان نظری تا حد ضرر: ${rewardRisk===null?'نامشخص':fmt(rewardRisk)+' به ۱'}. ${lowRewardRisk.length?fmt(lowRewardRisk.length)+' نماد نسبت کمتر از ۱ دارند: '+lowRewardRisk.map(x=>x.symbol).join('، ')+'.':'هیچ نمادی نسبت کمتر از ۱ ندارد.'} این نسبت صرفاً فاصله قیمت‌ها را مقایسه می‌کند و احتمال رسیدن به هدف یا حد ضرر را لحاظ نمی‌کند.`;
  summary.textContent+=` | آزمون افت فرضی ${fmt(stress)}٪ همه نمادها: کاهش ارزش ${fmt(stressLoss)} تومان${stressOnCapital}؛ ارزش سبد پس از افت ${fmt(stressValue)} تومان. این صرفاً یک سناریوی ریاضی است، نه پیش‌بینی بازار.`;
  const table=document.createElement('table');table.style.cssText='width:100%;min-width:610px;border-collapse:collapse;font-size:13px;text-align:right';
  const tr=document.createElement('tr');['نماد','تعداد','ارزش روز (تومان)','سود/زیان (تومان)','زیان تا حد ضرر','سهم از سبد','سهم از ریسک حد ضرر','سهم از سودها / زیان‌ها','نسبت سود به ریسک'].forEach(name=>{const th=document.createElement('th');th.textContent=name;th.style.cssText='padding:9px;border-bottom:1px solid #49627a';tr.appendChild(th);});table.appendChild(tr);
  const sortMode=$('portfolioSort').value;
  const sortFields={risk:'atRisk',value:'value',loss:'pnl',gain:'pnl'};
  const displayPositions=positions.slice();
  if(Object.prototype.hasOwnProperty.call(sortFields,sortMode)){
   const field=sortFields[sortMode],direction=sortMode==='loss'?1:-1;
   displayPositions.sort((a,b)=>direction*(a[field]-b[field]));
  }
  displayPositions.forEach(x=>{const row=document.createElement('tr');[x.symbol,fmt(x.qty),fmt(x.value),fmt(x.pnl),fmt(x.atRisk),fmt(100*x.value/value)+'٪'+(100*x.value/value>concentrationCap?' — بیش از سقف':''),atRisk>0?fmt(100*x.atRisk/atRisk)+'٪':'۰٪',x.pnl>0?(grossGains>0?fmt(100*x.pnl/grossGains)+'٪ از سودها':'—'):x.pnl<0?(grossLosses>0?fmt(100*(-x.pnl)/grossLosses)+'٪ از زیان‌ها':'—') :'بدون سود و زیان',portfolioRewardRisk(x.upside,x.atRisk)===null?'نامشخص':fmt(portfolioRewardRisk(x.upside,x.atRisk))+' به ۱'].forEach(t=>{const td=document.createElement('td');td.textContent=t;td.style.cssText='padding:9px;border-bottom:1px solid #2c4861';row.appendChild(td);});table.appendChild(row);});
  details.replaceChildren(table);latestPortfolioReport={positions,capital,riskCap,value,cost,pnl,atRisk,upside,concentrationCap};portfolioReportSnapshot=JSON.stringify(portfolioSnapshot());
 }catch(e){summary.textContent=e.message;details.replaceChildren();latestPortfolioReport=null;portfolioReportSnapshot=null;}
}
const portfolioDemo='فولاد,1000,500,540,470,650\nخودرو,2000,280,260,235,320';
let portfolioEditingSymbol=null;
let portfolioPendingDelete=null;
let portfolioLastDeletion=null;
function portfolioUndoAvailability(){$('pfUndo').disabled=!portfolioLastDeletion;}
function resetPortfolioDelete(){portfolioPendingDelete=null;const b=$('pfDelete');b.textContent='حذف سهم انتخابی از سبد';}
function portfolioRowsForEditing(){
 const raw=$('portfolioData').value.trim();
 if(!raw)return [];
 return parsePortfolio(raw);
}
function refreshPortfolioChoices(preferred=''){
 const menu=$('pfExisting');
 const current=preferred||menu.value;
 menu.replaceChildren();
 const first=document.createElement('option');first.value='';first.textContent='یک نماد انتخاب کنید';menu.appendChild(first);
 try{for(const p of portfolioRowsForEditing()){const opt=document.createElement('option');opt.value=p.symbol;opt.textContent=p.symbol;menu.appendChild(opt);}}catch(e){$('pfStatus').textContent='اطلاعات سبد نامعتبر است؛ ابتدا سطرها را اصلاح کنید: '+e.message;}
 if([...menu.options].some(x=>x.value===current))menu.value=current;
 else portfolioEditingSymbol=null;
}
$('pfEdit').addEventListener('click',()=>{
 resetPortfolioDelete();
 try{
  const symbol=$('pfExisting').value;
  if(!symbol)throw Error('ابتدا نماد را از فهرست انتخاب کنید.');
  const p=portfolioRowsForEditing().find(x=>x.symbol===symbol);
  if(!p)throw Error('نماد انتخاب‌شده دیگر در سبد نیست.');
  portfolioEditingSymbol=p.symbol;
  for(const [id,value] of [['pfSymbol',p.symbol],['pfQty',p.qty],['pfBuy',p.buy],['pfCurrent',p.current],['pfStop',p.stop],['pfTarget',p.target]])$(id).value=value;
  $('pfStatus').textContent='اطلاعات '+symbol+' در فرم قرار گرفت. پس از اصلاح، «افزودن / به‌روزرسانی سهم» را بزنید.';
 }catch(e){$('pfStatus').textContent='ویرایش ممکن نشد: '+e.message;}
});
$('pfDelete').addEventListener('click',()=>{
 try{
  const symbol=$('pfExisting').value;
  if(!symbol)throw Error('ابتدا نماد را انتخاب کنید.');
  const rows=portfolioRowsForEditing();
  if(!rows.some(x=>x.symbol===symbol))throw Error('نماد در سبد پیدا نشد.');
  if(portfolioPendingDelete!==symbol){portfolioPendingDelete=symbol;$('pfDelete').textContent='تأیید حذف '+symbol;$('pfStatus').textContent='برای حذف '+symbol+' یک بار دیگر همین دکمه را بزنید. هنوز چیزی حذف نشده است.';return;}
  const remaining=rows.filter(x=>x.symbol!==symbol);
  const beforeDelete=$('portfolioData').value;
  resetPortfolioDelete();
  if(portfolioEditingSymbol===symbol)portfolioEditingSymbol=null;
  $('portfolioData').value=remaining.map(x=>[x.symbol,x.qty,x.buy,x.current,x.stop,x.target].join(',')).join('\n');
  portfolioLastDeletion={before:beforeDelete,after:$('portfolioData').value,symbol};
  refreshPortfolioSaveState();
  portfolioUndoAvailability();
  refreshPortfolioChoices();
  if(remaining.length){reportPortfolio();}else{$('portfolioSummary').textContent='سبد خالی شد. برای محاسبه گزارش، سهم جدید اضافه کنید.';$('portfolioDetails').replaceChildren();latestPortfolioReport=null;}
  $('pfStatus').textContent='نماد '+symbol+' از سبد فعلی حذف شد. نسخه ذخیره‌شده روی گوشی تغییر نکرد.';
 }catch(e){$('pfStatus').textContent='حذف انجام نشد: '+e.message;}
});
$('pfUndo').addEventListener('click',()=>{
 try{
  const item=portfolioLastDeletion;
  if(!item)throw Error('حذف قابل‌بازگشتی وجود ندارد.');
  if($('portfolioData').value!==item.after)throw Error('اطلاعات سبد پس از حذف تغییر کرده است؛ برای جلوگیری از بازنویسی تغییرات، بازیابی متوقف شد.');
  $('portfolioData').value=item.before;
  refreshPortfolioSaveState();
  portfolioLastDeletion=null;portfolioUndoAvailability();resetPortfolioDelete();portfolioEditingSymbol=null;
  refreshPortfolioChoices(item.symbol);
  reportPortfolio();
  $('pfStatus').textContent='نماد '+item.symbol+' به سبد فعلی برگشت. نسخه ذخیره‌شده روی گوشی تغییر نکرد.';
 }catch(e){$('pfStatus').textContent='برگرداندن حذف انجام نشد: '+e.message;}
});
$('portfolioData').addEventListener('input',()=>{portfolioEditingSymbol=null;resetPortfolioDelete();portfolioLastDeletion=null;portfolioUndoAvailability();refreshPortfolioChoices();refreshPortfolioSaveState();invalidatePortfolioReport();});
$('pfExisting').addEventListener('change',()=>{portfolioEditingSymbol=null;resetPortfolioDelete();});
refreshPortfolioChoices();
$('pfAdd').addEventListener('click',()=>{
 resetPortfolioDelete();
 const status=$('pfStatus');
 try{
  const symbol=$('pfSymbol').value.trim();
  if(!symbol||symbol.length>35||/[,،;\t\r\n]/.test(symbol))throw Error('نام نماد معتبر و بدون کاما وارد کنید.');
  const ids=['pfQty','pfBuy','pfCurrent','pfStop','pfTarget'];
  const numbers=ids.map(id=>portfolioNumber($(id).value,'فرم افزودن سهم'));
  const [qty,buy,current,stop,target]=numbers;
  if(!Number.isSafeInteger(qty)||qty<=0||[buy,current,stop,target].some(x=>x<=0)||stop>=current||target<=current)throw Error('تعداد باید عدد صحیح مثبت باشد؛ حد ضرر کمتر از قیمت فعلی و حد سود بیشتر از قیمت فعلی باشد.');
  const input=$('portfolioData');const raw=input.value.trim();
  const lines=raw?raw.split(/\r?\n/).filter(Boolean):[];
  const symbols=lines.map(line=>line.split(/[,،;\t]/)[0].trim());
  const editingIndex=portfolioEditingSymbol?symbols.indexOf(portfolioEditingSymbol):-1;
  if(portfolioEditingSymbol&&editingIndex<0)throw Error('سهم انتخاب‌شده برای ویرایش دیگر در سبد موجود نیست. دوباره انتخاب کنید.');
  const duplicateIndex=symbols.indexOf(symbol);
  if(editingIndex>=0&&duplicateIndex>=0&&duplicateIndex!==editingIndex)throw Error('نماد جدید از قبل در سبد وجود دارد؛ نام دیگری انتخاب کنید.');
  const index=editingIndex>=0?editingIndex:duplicateIndex;
  const newLine=[symbol,...numbers].join(',');
  const nextLines=lines.slice();
  if(index>=0)nextLines[index]=newLine;
  else{if(nextLines.length>=100)throw Error('حداکثر ۱۰۰ نماد قابل ثبت است.');nextLines.push(newLine);}
  parsePortfolio(nextLines.join('\n'));
  input.value=nextLines.join('\n');
  refreshPortfolioSaveState();
  portfolioLastDeletion=null;portfolioUndoAvailability();
  portfolioEditingSymbol=null;
  status.textContent=(index>=0?'اطلاعات نماد به‌روزرسانی شد.':'نماد به سبد اضافه شد.')+' گزارش جدید در پایین محاسبه شد. قیمت‌ها دستی هستند، نه زنده.';
  reportPortfolio();
  refreshPortfolioChoices(symbol);
 }catch(e){status.textContent='خطا: '+e.message;}
});
const PORTFOLIO_STORAGE_KEY='sahamban-portfolio-local-v1';
function portfolioSnapshot(){
 return {data:$('portfolioData').value.trim(),capital:$('portfolioCapital').value.trim(),riskCap:$('portfolioRiskCap').value.trim(),stress:$('portfolioStress').value.trim(),concentration:$('portfolioConcentration').value.trim()};
}
function refreshPortfolioSaveState(){
 const status=$('portfolioSaveState');
 try{
  const raw=localStorage.getItem(PORTFOLIO_STORAGE_KEY);
  if(!raw){status.textContent='این سبد روی گوشی ذخیره نشده است. برای نگه‌داشتن اطلاعات، «ذخیره سبد روی گوشی» را بزنید.';return;}
  const record=validatePortfolioBackup(JSON.parse(raw)),now=portfolioSnapshot();
  const matched=['data','capital','riskCap','stress'].every(field=>record[field]===now[field])&&record.concentration===now.concentration;
  status.textContent=matched?'تغییرات فعلی سبد روی همین مرورگر ذخیره شده‌اند.':'تغییرات سبد هنوز ذخیره نشده‌اند. برای حفظ تغییرات، «ذخیره سبد روی گوشی» را بزنید.';
 }catch(e){status.textContent='وضعیت ذخیره‌سازی مشخص نیست؛ داده‌های مرورگر قابل خواندن نیستند.';}
}
function portfolioStoreNotice(message){$('portfolioStoreStatus').textContent=message;}
function portfolioSavedState(){
 const raw=localStorage.getItem(PORTFOLIO_STORAGE_KEY);
 if(!raw)throw Error('هیچ نسخه ذخیره‌شده‌ای در این مرورگر وجود ندارد.');
 return validatePortfolioBackup(JSON.parse(raw));
}
$('portfolioSave').addEventListener('click',()=>{
 try{
  const data=$('portfolioData').value.trim();
  parsePortfolio(data);
  const capital=$('portfolioCapital').value.trim(),riskCap=$('portfolioRiskCap').value.trim(),stress=$('portfolioStress').value.trim(),concentration=$('portfolioConcentration').value.trim();
  if(capital&&(portfolioNumber(capital,'سرمایه')<=0))throw Error('سرمایه مبنا باید مثبت باشد.');
  if(portfolioNumber(riskCap,'سقف ریسک')<=0||portfolioNumber(riskCap,'سقف ریسک')>100)throw Error('سقف ریسک باید بین صفر و ۱۰۰ باشد.');
  if(portfolioNumber(stress,'افت فرضی')<0||portfolioNumber(stress,'افت فرضی')>100)throw Error('افت فرضی باید بین صفر و ۱۰۰ باشد.');
  if(portfolioNumber(concentration,'تمرکز')<1||portfolioNumber(concentration,'تمرکز')>100)throw Error('سقف تمرکز باید بین ۱ تا ۱۰۰ درصد باشد.');
  localStorage.setItem(PORTFOLIO_STORAGE_KEY,JSON.stringify({version:1,data,capital,riskCap,stress,concentration,savedAt:new Date().toISOString()}));
  refreshPortfolioSaveState();
  portfolioStoreNotice('سبد روی همین مرورگر ذخیره شد. با «بازیابی سبد ذخیره‌شده» می‌توانی آن را برگردانی.');
 }catch(e){portfolioStoreNotice('ذخیره انجام نشد: '+e.message);}
});
$('portfolioLoad').addEventListener('click',()=>{
 resetPortfolioDelete();
 try{
  const record=portfolioSavedState();
  portfolioEditingSymbol=null;
  portfolioLastDeletion=null;portfolioUndoAvailability();
  $('portfolioData').value=record.data;
  $('portfolioCapital').value=record.capital;
  $('portfolioRiskCap').value=record.riskCap;
  $('portfolioStress').value=record.stress;
  $('portfolioConcentration').value=record.concentration??'30';
  reportPortfolio();
  refreshPortfolioChoices();
  refreshPortfolioSaveState();
  portfolioStoreNotice('سبد ذخیره‌شده بازیابی شد. اطلاعات فقط متعلق به همین مرورگر است.');
 }catch(e){portfolioStoreNotice('بازیابی انجام نشد: '+e.message);}
});
$('portfolioForget').addEventListener('click',()=>{
 try{
  localStorage.removeItem(PORTFOLIO_STORAGE_KEY);
  refreshPortfolioSaveState();
  portfolioStoreNotice('نسخه ذخیره‌شده حذف شد؛ اطلاعات فعلی روی صفحه پاک نشده‌اند.');
 }catch(e){portfolioStoreNotice('حذف نسخه ذخیره‌شده ممکن نشد: '+e.message);}
});
for(const id of ['portfolioCapital','portfolioRiskCap','portfolioStress','portfolioConcentration'])$(id).addEventListener('input',()=>{refreshPortfolioSaveState();invalidatePortfolioReport();});
refreshPortfolioSaveState();
let pendingPortfolioBackup=null;
function validatePortfolioBackup(record){
 if(!record||record.version!==1||typeof record.data!=='string'||record.data.length>25000)throw Error('ساختار فایل پشتیبان معتبر نیست.');
 parsePortfolio(record.data);
 for(const key of ['capital','riskCap','stress'])if(typeof record[key]!=='string'||record[key].length>60)throw Error('فیلدهای فایل کامل نیستند.');
 const concentration=record.concentration??'30';
 if(typeof concentration!=='string'||concentration.length>60)throw Error('سقف تمرکز فایل معتبر نیست.');
 if(record.capital&&portfolioNumber(record.capital,'سرمایه')<=0)throw Error('سرمایه مبنا نامعتبر است.');
 const risk=portfolioNumber(record.riskCap,'سقف ریسک'),stress=portfolioNumber(record.stress,'افت فرضی'),cap=portfolioNumber(concentration,'تمرکز');
 if(risk<=0||risk>100||stress<0||stress>100||cap<1||cap>100)throw Error('تنظیمات ریسک یا تمرکز فایل معتبر نیستند.');
 return {data:record.data,capital:record.capital,riskCap:record.riskCap,stress:record.stress,concentration};
}
$('portfolioBackup').addEventListener('click',()=>{
 try{
  const snapshot=portfolioSnapshot();
  const valid=validatePortfolioBackup({version:1,...snapshot});
  const blob=new Blob([JSON.stringify({format:'sahamban-portfolio',version:1,...valid,exportedAt:new Date().toISOString()},null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='sahamban-portfolio-backup.json';
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('portfolioBackupStatus').textContent='فایل پشتیبان از سبد فعلی آماده دانلود شد. آن را در جای امن نگه دارید.';
 }catch(e){$('portfolioBackupStatus').textContent='پشتیبان‌گیری انجام نشد: '+e.message;}
});
$('portfolioBackupFile').addEventListener('change',async()=>{
 pendingPortfolioBackup=null;$('portfolioBackupApply').disabled=true;
 const file=$('portfolioBackupFile').files?.[0];
 if(!file)return;
 if(file.size>30000){$('portfolioBackupStatus').textContent='حجم فایل نباید بیشتر از ۳۰ کیلوبایت باشد.';return;}
 try{
  const record=JSON.parse(await file.text());
  if($('portfolioBackupFile').files?.[0]!==file)return;
  if(record.format!=='sahamban-portfolio')throw Error('این فایل متعلق به نسخه پشتیبان سبد سهام‌بان نیست.');
  pendingPortfolioBackup=validatePortfolioBackup(record);
  $('portfolioBackupApply').disabled=false;
  $('portfolioBackupStatus').textContent='فایل معتبر است؛ '+parsePortfolio(pendingPortfolioBackup.data).length+' نماد پیدا شد. فقط با «تأیید بازیابی فایل» اطلاعات فعلی صفحه جایگزین می‌شوند. نسخه ذخیره‌شده مرورگر تغییر نمی‌کند.';
 }catch(e){if($('portfolioBackupFile').files?.[0]===file)$('portfolioBackupStatus').textContent='فایل پذیرفته نشد: '+e.message;}
});
$('portfolioBackupApply').addEventListener('click',()=>{
 if(!pendingPortfolioBackup){$('portfolioBackupStatus').textContent='ابتدا یک فایل معتبر انتخاب کنید.';return;}
 const record=pendingPortfolioBackup;
 pendingPortfolioBackup=null;$('portfolioBackupApply').disabled=true;$('portfolioBackupFile').value='';
 resetPortfolioDelete();portfolioEditingSymbol=null;portfolioLastDeletion=null;portfolioUndoAvailability();
 for(const [id,key] of [['portfolioData','data'],['portfolioCapital','capital'],['portfolioRiskCap','riskCap'],['portfolioStress','stress'],['portfolioConcentration','concentration']])$(id).value=record[key];
 refreshPortfolioChoices();reportPortfolio();refreshPortfolioSaveState();
 $('portfolioBackupStatus').textContent='اطلاعات فایل روی صفحه بازیابی شد. برای نگه‌داشتن آنها در مرورگر، دکمه «ذخیره سبد روی گوشی» را بزنید.';
});
$('portfolioSort').addEventListener('change',reportPortfolio);
$('portfolioAnalyze').addEventListener('click',reportPortfolio);
$('portfolioClear').addEventListener('click',()=>{resetPortfolioDelete();portfolioEditingSymbol=null;portfolioLastDeletion=null;portfolioUndoAvailability();$('portfolioData').value='';refreshPortfolioSaveState();refreshPortfolioChoices();$('portfolioSummary').textContent='اطلاعات سبد از این صفحه پاک شد.';$('portfolioDetails').replaceChildren();latestPortfolioReport=null;});
function portfolioCsvCell(value){
 const text=String(value);
 const safe=typeof value==='number'&&Number.isFinite(value)?text:/^[\s\u200e\u200f\ufeff]*[=+@\-]/u.test(text)?"'"+text:text;
 return '"'+safe.replace(/"/g,'""')+'"';
}
$('portfolioExport').addEventListener('click',()=>{
 if(!latestPortfolioReport||portfolioReportSnapshot!==JSON.stringify(portfolioSnapshot())){invalidatePortfolioReport();$('portfolioSummary').textContent='گزارش فعلی موجود نیست یا اطلاعات تغییر کرده است؛ ابتدا «محاسبه گزارش سبد» را بزنید، سپس فایل CSV بگیرید.';return;}
 const header=['symbol','quantity','buy_price_toman','current_price_toman','stop_toman','target_toman','value_toman','unrealized_pnl_toman','risk_to_stop_toman','potential_gain_toman','portfolio_weight_percent','risk_contribution_percent','reward_risk_ratio'];
 const report=latestPortfolioReport;
 const rows=report.positions.map(x=>{
  const ratio=portfolioRewardRisk(x.upside,x.atRisk);
  return [x.symbol,x.qty,x.buy,x.current,x.stop,x.target,x.value,x.pnl,x.atRisk,x.upside,100*x.value/report.value,report.atRisk>0?100*x.atRisk/report.atRisk:0,ratio===null?'':ratio].map(portfolioCsvCell).join(',');
 });
 const blob=new Blob(['\uFEFF'+[header.join(','),...rows].join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='sahamban_portfolio_report.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});


// ارتباط آزمایشی با داده بازار؛ عدم موفقیت هرگز به معنای قیمت روز نیست.
const TSE_BASE='https://cdn.tsetmc.com/api';
function marketDateCheck(raw){
 const value=String(raw??'').trim();
 if(!/^\d{8}$/.test(value))return {ok:false,text:'تاریخ بازار نامشخص است'};
 const year=Number(value.slice(0,4)),month=Number(value.slice(4,6)),day=Number(value.slice(6,8));
 const date=new Date(Date.UTC(year,month-1,day));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return {ok:false,text:'تاریخ بازار نامعتبر است'};
 const today=new Date(),todayUTC=Date.UTC(today.getFullYear(),today.getMonth(),today.getDate());
 const age=Math.round((todayUTC-date.getTime())/86400000);
 if(age<0)return {ok:false,text:'تاریخ بازار در آینده است'};
 if(age>7)return {ok:false,text:'داده قدیمی است ('+fmt(age)+' روز پیش)'};
 return {ok:true,text:'تاریخ بازار: '+value+' میلادی؛ فاصله تقویمی: '+fmt(age)+' روز'};
}
function tseStatus(msg){$('marketStatus').textContent=msg;}
async function tseFetch(path){
 const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),12000);
 try{
  const res=await fetch(TSE_BASE+path,{signal:ctrl.signal,cache:'no-store',headers:{'Accept':'application/json'}});
  if(!res.ok)throw Error('پاسخ HTTP '+res.status);
  const type=res.headers.get('content-type')||'';
  if(!type.includes('json'))throw Error('پاسخ غیر JSON یا صفحه مسدودسازی');
  return await res.json();
 }finally{clearTimeout(timeout);}
}
$('marketSearch').addEventListener('click',async()=>{
 const name=$('marketSymbol').value.trim();const select=$('marketMatches');
 select.replaceChildren();$('marketCode').value='';
 if(!name||name.length>50){tseStatus('نام نماد معتبر، حداکثر ۵۰ نویسه، وارد کنید.');return;}
 tseStatus('در حال درخواست جست‌وجوی نماد؛ نتیجه هنوز تأیید نشده است...');
 try{
  const data=await tseFetch('/Instrument/GetInstrumentSearch/'+encodeURIComponent(name));
  const records=data.instrumentSearch;
  if(!Array.isArray(records)||!records.length)throw Error('هیچ نمادی بازگردانده نشد؛ ممکن است منبع محدود باشد.');
  let count=0;
  for(const x of records.slice(0,70)){
    const code=String(x.insCode??'');if(!/^\d{8,25}$/.test(code))continue;
    const option=document.createElement('option');option.value=code;
    option.textContent=(x.lVal18AFC||x.lVal30||'نماد')+' — '+(x.lVal30||'')+' — '+code;
    select.appendChild(option);count++;
  }
  if(!count)throw Error('نتایج دارای شناسه معتبر نبودند.');
  $('marketCode').value=select.value;
  tseStatus(count+' نتیجه دریافت شد. یک نماد انتخاب کنید، سپس تاریخچه را بارگیری کنید. دریافت در '+new Date().toLocaleString('fa-IR')+' (زمان دستگاه)؛ این زمان، زمان آخرین معامله نیست.');
 }catch(e){tseStatus('جست‌وجو ناموفق: '+e.message+'. می‌توانید از فایل CSV آفلاین استفاده کنید.');}
});
$('marketMatches').addEventListener('change',()=>{$('marketCode').value=$('marketMatches').value;});
$('marketHistory').addEventListener('click',async()=>{
 const code=$('marketCode').value.trim();if(!/^\d{8,25}$/.test(code)){tseStatus('ابتدا شناسه معتبر نماد را از جست‌وجو انتخاب یا وارد کنید.');return;}
 tseStatus('در حال درخواست داده تاریخی از منبع؛ هنوز داده‌ای دریافت نشده است...');
 try{
  const data=await tseFetch('/ClosingPrice/GetClosingPriceDailyList/'+code+'/0');
  const rows=data.closingPriceDaily;
  if(!Array.isArray(rows)||rows.length<15)throw Error('تاریخچه کافی دریافت نشد.');
  const normalized=rows.map(x=>({date:Number(x.dEven),price:Number(x.pClosing)})).filter(x=>Number.isFinite(x.date)&&Number.isFinite(x.price)&&x.price>0).sort((a,b)=>a.date-b.date);
  if(normalized.length<15)throw Error('کمتر از ۱۵ قیمت معتبر در پاسخ وجود دارد.');
  const last=normalized.at(-1);let stamp=String(last.date);
  if(!/^\d{8}$/.test(stamp))stamp='نامشخص';
  const prices=normalized.map(x=>x.price);
  $('historyText').value=prices.join('\n');
  analyze(prices);
  tseStatus('تاریخچه '+normalized.length+' رکورد دریافت شد. آخرین تاریخ معامله ثبت‌شده در پاسخ: '+stamp+' (میلادی YYYYMMDD). آخرین قیمت پایانی: '+fmt(last.price)+' ریال. زمان دریافت: '+new Date().toLocaleString('fa-IR')+' (دستگاه). این قیمت، قیمت لحظه‌ای نیست.');
 }catch(e){tseStatus('تاریخچه دریافت نشد: '+e.message+'. داده قدیمی به‌عنوان قیمت روز نشان داده نمی‌شود؛ از CSV آفلاین استفاده کنید.');}
});


// نسخه ۵: دریافت دستی قیمت پایانی مرجع و ارزیابی حدهای ریالی؛ بدون پایش پس‌زمینه.
let quoteInFlight=false;
$('marketRetry').addEventListener('click',()=>{if(quoteInFlight){$('quoteStatus').textContent='درخواست قبلی هنوز در حال اجراست.';return;}$('marketQuote').click();});
$('marketQuote').addEventListener('click',async()=>{
 const output=$('quoteStatus');output.textContent='در حال درخواست تازه؛ نتیجه قبلی معتبر نیست.';
 const code=$('marketCode').value.trim();
 const stopText=$('liveStop').value.trim(),targetText=$('liveTarget').value.trim();
 const stop=Number(stopText),target=Number(targetText);
 if(!/^\d{8,25}$/.test(code)){output.textContent='ابتدا نماد و شناسه معتبر آن را انتخاب کنید.';return;}
 if(!stopText||!targetText||!Number.isFinite(stop)||!Number.isFinite(target)||stop<=0||target<=stop){output.textContent='حد پایین و بالا را به ریال وارد کنید؛ حد بالا باید بیشتر باشد.';return;}
 if(quoteInFlight){output.textContent='درخواست قبلی هنوز به پایان نرسیده است.';return;}
 quoteInFlight=true;$('marketQuote').disabled=true;
 try{
  const result=await tseFetch('/ClosingPrice/GetClosingPriceInfo/'+code);
  const info=result.closingPriceInfo;
  if(!info||typeof info!=='object')throw Error('ساختار پاسخ قیمت شناسایی نشد');
  const price=Number(info.pClosing??info.pc);
  if(!Number.isFinite(price)||price<=0)throw Error('قیمت پایانی معتبر دریافت نشد');
  const freshness=marketDateCheck(info.dEven??info.date??info.lastDate);
  let verification={ok:false,note:'تأیید قیمت با تاریخچه انجام نشد؛ هشدار صوتی غیرفعال است.'};
  try{
   const history=await tseFetch('/ClosingPrice/GetClosingPriceDailyList/'+code+'/0');
   const rows=history.closingPriceDaily;
   if(!Array.isArray(rows)||!rows.length)throw Error('تاریخچه قابل بررسی موجود نیست');
   const normalized=rows.map(x=>({date:String(x.dEven??''),price:Number(x.pClosing)})).filter(x=>/^\d{8}$/.test(x.date)&&Number.isFinite(x.price)&&x.price>0).sort((a,b)=>a.date.localeCompare(b.date));
   if(!normalized.length)throw Error('تاریخ و قیمت معتبر در تاریخچه نبود');
   const last=normalized.at(-1),quoteDate=String(info.dEven??info.date??info.lastDate??'');
   const diff=Math.abs(last.price-price)/last.price*100;
   if(quoteDate!==last.date){
    const q=marketDateCheck(quoteDate),h=marketDateCheck(last.date);
    const qMs=Date.parse(quoteDate.slice(0,4)+'-'+quoteDate.slice(4,6)+'-'+quoteDate.slice(6,8)+'T00:00:00Z');
    const hMs=Date.parse(last.date.slice(0,4)+'-'+last.date.slice(4,6)+'-'+last.date.slice(6,8)+'T00:00:00Z');
    const lag=q.ok&&hMs&&Number.isFinite(qMs)&&Number.isFinite(hMs)?Math.round((qMs-hMs)/86400000):null;
    if(lag===1)verification={ok:false,note:'قیمت تکی مربوط به یک روز بعد از آخرین رکورد تاریخچه است ('+quoteDate+' در برابر '+last.date+'). احتمال تأخیر در انتشار تاریخچه وجود دارد، اما قطعی نیست. دکمه «بررسی دوباره» را بعداً بزنید. هشدار صوتی غیرفعال است.'};
    else if(lag!==null&&lag>1)verification={ok:false,note:'قیمت تکی '+fmt(lag)+' روز جدیدتر از تاریخچه است ('+quoteDate+' در برابر '+last.date+'). نیاز به بررسی مجدد؛ هشدار صوتی غیرفعال است.'};
    else if(lag!==null&&lag<0)verification={ok:false,note:'رکورد تاریخچه از تاریخ قیمت تکی جدیدتر است ('+last.date+' در برابر '+quoteDate+'). قیمت تکی ممکن است قدیمی باشد؛ هشدار صوتی غیرفعال است.'};
    else verification={ok:false,note:'تاریخ دو پاسخ سازگار نیست یا نامعتبر است ('+quoteDate+' در برابر '+last.date+'). هشدار صوتی غیرفعال است.'};
   }
   else if(diff>0.01)verification={ok:false,note:'اختلاف قیمت در یک تاریخ! قیمت تکی '+fmt(price)+' و تاریخچه '+fmt(last.price)+' ریال (اختلاف '+fmt(diff)+'٪)؛ هشدار صوتی غیرفعال است.'};
   else verification={ok:true,note:'قیمت و تاریخ با آخرین رکورد تاریخچه همان نماد تطبیق داده شد.'};
  }catch(err){verification={ok:false,note:'تطبیق با تاریخچه ناموفق: '+(err.name==='AbortError'?'مهلت درخواست تمام شد':err.message)+'؛ هشدار صوتی غیرفعال است.'};}
  const validationState=!freshness.ok?'نامعتبر':verification.ok?'تأییدشده':verification.note.startsWith('اختلاف قیمت در یک تاریخ')?'نامعتبر':'در انتظار تطبیق';
  const label=$('marketSymbol').value.trim()||'نماد انتخابی';
  const state=price<=stop?'عبور از حد پایین':price>=target?'عبور از حد بالا':'بدون عبور از حدود';
  const message=`وضعیت اعتبار: ${validationState} | ${label}؛ قیمت پایانی گزارش‌شده ${fmt(price)} ریال؛ ${freshness.text}؛ نتیجه مقایسه: ${state}. ${freshness.ok?'تاریخ داده در بازه هفت روزه است.':'هشدار صوتی به دلیل تاریخ نامعتبر یا قدیمی غیرفعال است.'} ${verification.note} زمان دریافت روی دستگاه: ${new Date().toLocaleString('fa-IR')}. این قیمت لحظه‌ای نیست.`;
  output.textContent=message;
  if(freshness.ok&&verification.ok&&(price<=stop||price>=target)){output.classList.add('alarm');speak(`هشدار سهام بان. ${label}. ${state}. قیمت پایانی ${fmt(price)} ریال.`);try{navigator.vibrate?.([150,90,150]);}catch(e){}}
  else output.classList.remove('alarm');
 }catch(e){output.classList.remove('alarm');output.textContent='دریافت قیمت ناموفق: '+(e.name==='AbortError'?'مهلت اتصال به پایان رسید':e.message)+'. هیچ هشدار معتبری صادر نشد؛ ممکن است دسترسی شبکه یا CORS محدود باشد.';}
 finally{quoteInFlight=false;$('marketQuote').disabled=false;}
});


async function verifyWatchQuote(code,info,price){
 const freshness=marketDateCheck(info?.dEven??info?.date??info?.lastDate);
 if(!freshness.ok)return {state:'نامعتبر',ok:false,note:freshness.text};
 try{
  const data=await tseFetch('/ClosingPrice/GetClosingPriceDailyList/'+code+'/0');
  const rows=data.closingPriceDaily;
  if(!Array.isArray(rows)||!rows.length)return {state:'در انتظار تطبیق',ok:false,note:'تاریخچه‌ای برای تطبیق دریافت نشد'};
  const history=rows.map(x=>({date:String(x.dEven??''),price:Number(x.pClosing)})).filter(x=>/^\d{8}$/.test(x.date)&&Number.isFinite(x.price)&&x.price>0).sort((a,b)=>a.date.localeCompare(b.date));
  if(!history.length)return {state:'در انتظار تطبیق',ok:false,note:'رکورد معتبر برای تطبیق وجود ندارد'};
  const last=history.at(-1),quoteDate=String(info.dEven??info.date??info.lastDate??'');
  if(last.date!==quoteDate)return {state:'در انتظار تطبیق',ok:false,note:'تاریخ قیمت تکی '+quoteDate+' و آخرین تاریخچه '+last.date+' متفاوت است'};
  const difference=Math.abs(price-last.price)/last.price*100;
  if(difference>0.01)return {state:'نامعتبر',ok:false,note:'اختلاف قیمت یک روز: تکی '+fmt(price)+'، تاریخچه '+fmt(last.price)+' ریال'};
  return {state:'تأییدشده',ok:true,note:'تاریخ و قیمت با آخرین رکورد تاریخچه تطبیق دارند'};
 }catch(e){return {state:'در انتظار تطبیق',ok:false,note:'تطبیق تاریخچه ممکن نشد: '+(e.name==='AbortError'?'پایان مهلت درخواست':e.message)};}
}
// نسخه شش: بررسی دستی چند نماد؛ هیچ پایش خودکار یا زمان‌بندی در پس‌زمینه ندارد.
const WATCH_KEY='sahamban-watchlist-v6';
let watchlist=[];let watchBusy=false;
try { const value=JSON.parse(localStorage.getItem(WATCH_KEY)||'[]');if(Array.isArray(value))watchlist=value.filter(x=>x&&typeof x==='object'&&/^[0-9]{8,25}$/.test(String(x.code))&&typeof x.name==='string'&&x.name.trim().length>0&&x.name.length<=35&&Number.isFinite(x.stop)&&Number.isFinite(x.target)&&x.stop>0&&x.target>x.stop).slice(0,20); }catch(e){}
function watchSave(){try{localStorage.setItem(WATCH_KEY,JSON.stringify(watchlist));}catch(e){$('watchStatus').textContent='ذخیره فهرست در مرورگر ممکن نشد.';}}
function watchRender(){const node=$('watchTable');node.replaceChildren();if(!watchlist.length){node.textContent='هنوز نمادی ثبت نشده است.';return;}
 for(const [i,x] of watchlist.entries()){const row=document.createElement('div');row.style='padding:8px 0;border-bottom:1px solid #33516b';const label=document.createElement('span');label.textContent=`${x.name} | ${x.code} | پایین: ${fmt(x.stop)} ریال | بالا: ${fmt(x.target)} ریال `;row.appendChild(label);const btn=document.createElement('button');btn.className='secondary';btn.textContent='حذف';btn.setAttribute('aria-label','حذف '+x.name);btn.addEventListener('click',()=>{if(watchBusy)return;watchlist.splice(i,1);watchSave();watchRender();});row.appendChild(btn);const res=document.createElement('div');res.id='watch-result-'+i;res.className='muted';res.textContent='هنوز بررسی نشده است.';row.appendChild(res);node.appendChild(row);}}
$('watchFromSelected').addEventListener('click',()=>{$('watchName').value=$('marketSymbol').value.trim();$('watchCode').value=$('marketCode').value.trim();$('watchStop').value=$('liveStop').value;$('watchTarget').value=$('liveTarget').value;});
$('watchAdd').addEventListener('click',()=>{if(watchBusy)return;const name=$('watchName').value.trim().slice(0,35),code=$('watchCode').value.trim(),stop=Number($('watchStop').value),target=Number($('watchTarget').value);if(!name||!/^[0-9]{8,25}$/.test(code)||!Number.isFinite(stop)||!Number.isFinite(target)||stop<=0||target<=stop){$('watchStatus').textContent='نام، شناسه ۸ تا ۲۵ رقمی و دو حد معتبر به ریال وارد کنید.';return;}if(watchlist.some(x=>x.code===code)){$('watchStatus').textContent='این شناسه قبلاً ثبت شده است؛ برای تغییر، مورد قبلی را حذف کنید.';return;}if(watchlist.length>=20){$('watchStatus').textContent='حداکثر ۲۰ نماد در این نسخه پشتیبانی می‌شود.';return;}watchlist.push({name,code,stop,target});watchSave();watchRender();$('watchStatus').textContent='نماد ثبت شد. برای بررسی قیمت باید دکمه «بررسی همه» را بزنید.';});
$('watchCheck').addEventListener('click',async()=>{if(watchBusy||!watchlist.length)return;watchBusy=true;$('watchCheck').disabled=true;$('watchAdd').disabled=true;watchRender();let triggered=0,failed=0;const checkedAt=new Date().toLocaleString('fa-IR');$('watchStatus').textContent='در حال دریافت جداگانه قیمت نمادها؛ نتیجه پیشین معتبر نیست.';
 try{for(const [i,x] of watchlist.entries()){const row=$('watch-result-'+i);row.textContent='در حال دریافت قیمت...';try{const data=await tseFetch('/ClosingPrice/GetClosingPriceInfo/'+x.code);const info=data.closingPriceInfo;const price=Number(info?.pClosing??info?.pc);if(!Number.isFinite(price)||price<=0)throw Error('قیمت پایانی معتبر وجود ندارد');const verification=await verifyWatchQuote(x.code,info,price);const signal=price<=x.stop?'عبور از حد پایین':price>=x.target?'عبور از حد بالا':'در محدوده تعریف‌شده';row.textContent=`وضعیت: ${verification.state} | قیمت پایانی: ${fmt(price)} ریال | ${signal} | ${verification.note}${verification.ok?'':' | هشدار صوتی غیرفعال'}`;if(verification.ok&&(price<=x.stop||price>=x.target)){triggered++;row.classList.add('alarm');speak(`هشدار سهام بان. ${x.name}. ${signal}.`);}}catch(e){failed++;row.textContent='دریافت ناموفق؛ داده معتبر جدید موجود نیست: '+(e.name==='AbortError'?'اتمام مهلت درخواست':e.message);}} $('watchStatus').textContent=`بررسی دستی در ${checkedAt} (زمان دستگاه) پایان یافت. ${triggered} نماد به حدود رسید؛ ${failed} درخواست ناموفق. تنها نمادهای تأییدشده هشدار صوتی دارند. نتیجه لحظه‌ای نیست و اعلان پس‌زمینه وجود ندارد.`;}finally{watchBusy=false;$('watchCheck').disabled=false;$('watchAdd').disabled=false;}});
watchRender();
