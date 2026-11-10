'use strict';
/* Read-only original-file audit. No networking, trading, or persistence.
 * Usage: node scripts/review-day3-original-capture.cjs manifest.json daily.json adjustments.json YYYYMMDD [deidentified-receipt.json]
 * Exit code 0: original bytes matched manifest for review (NOT Day 3 acceptance).
 * Exit code 2: input or evidence rejected. */
const fs=require('node:fs');
const path=require('node:path');
const {auditDay3Evidence}=require('../day3-real-evidence-audit-v1.cjs');
const MAX_SIZE=1024*1024;
function readBounded(file,max=MAX_SIZE){
 const stat=fs.statSync(file,{throwIfNoEntry:false});
 if(!stat||!stat.isFile()||stat.size===0||stat.size>max)
  throw new Error('MISSING_OR_OVERSIZE_INPUT');
 return fs.readFileSync(file);
}
function run(argv){
 if(argv.length!==4&&argv.length!==5)
  throw new Error('USAGE: manifest.json daily.json adjustments.json YYYYMMDD [deidentified-receipt.json]');
 const [manifestPath,dailyPath,adjustmentsPath,expectedDailyDate,receiptPath]=argv;
 // No source file, account ID or absolute path is ever printed.
 const manifest=JSON.parse(readBounded(manifestPath,32768).toString('utf8'));
 const dailyBytes=readBounded(dailyPath);
 const adjustmentsBytes=readBounded(adjustmentsPath);
 const receipt=receiptPath===undefined?undefined:JSON.parse(readBounded(receiptPath,8192).toString('utf8'));
 const output=auditDay3Evidence({manifest,dailyBytes,adjustmentsBytes,receipt,expectedDailyDate});
 const allowed=['status','captureStatus','captureScope','fullHistoryCaptured','capturedDailyRows',
  'capturedAdjustmentRows','latestDailyDate','expectedDailyDate','expectedDatePublished',
  'noTradeRows','unknownTradeCountRows','adjustmentDatesInHistory','ledgerArithmeticReconciled',
  'receiptReviewStatus','observedFeeRial','estimatedFeeRial','feeDifferenceRial',
  'sourceAuthenticated','brokerReceiptAuthenticated','historyBasisAuthenticated',
  'threeModesVerified','capitalAdjustmentAllowed','entryEligible','tradingSignalsEnabled',
  'day3FinalAccepted','reason'];
 const report=Object.fromEntries(allowed.filter(key=>Object.hasOwn(output,key))
  .map(key=>[key,output[key]]));
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
 return output.status==='REAL_DATA_REVIEW_PARTIAL'?0:2;
}
if(require.main===module){
 try{process.exitCode=run(process.argv.slice(2));}
 catch(error){process.stderr.write('EVIDENCE_REVIEW_FAILED: '+(
  /^USAGE:/.test(error.message)?error.message:'invalid, missing, or unsupported evidence')+'\n');
  process.exitCode=2;}
}
module.exports=Object.freeze({run});
