'use strict';
// Summarize independent after-close probes without ever treating a green workflow
// or a reachable gateway as proof of up-to-date market data.
const fs=require('node:fs');
const path=require('node:path');
function readJson(file){
 try{
  const raw=fs.readFileSync(file,'utf8');
  const parsed=JSON.parse(raw);
  return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:null;
 }catch{return null;}
}
function summarize(cdn,webgw){
 const cdnStatus=typeof cdn?.status==='string'?cdn.status:'NO_REPORT';
 const gatewayStatus=typeof webgw?.status==='string'?webgw.status:'NO_REPORT';
 const accepted=cdnStatus==='AUTOMATED_QUOTE_CHECK_PASSED';
 // The main CDN probe requires session freshness AND a matching daily-history row.
 // The web gateway only checks reachability/schema: never promote it to a PASS.
 const status=accepted?'VERIFIED_LIVE_QUOTE_AND_HISTORY':'NOT_VERIFIED';
 const explain=accepted
  ?'CDN probe verified live-session quote freshness and matching daily history. This is not physical-device acceptance.'
  :cdnStatus==='UNVERIFIED_HISTORY_NOT_PUBLISHED'
   ?'Current quote is newer than the published daily-history rows. Do not merge dates or issue verified signals.'
   :cdnStatus==='UNVERIFIED_NETWORK'&&gatewayStatus==='UNVERIFIED_NETWORK'
    ?'Both GitHub-runner network paths timed out; no conclusion about user-device connectivity or market-data availability.'
    :'At least one requirement for independently verified live quote and same-day history has not been established.';
 return {status,cdnStatus,gatewayStatus,explain};
}
function markdown(result){
 return [
  '## Sahamban market probe: '+result.status,
  '',
  '| Check | Result |',
  '| --- | --- |',
  '| CDN quote + same-day history | '+result.cdnStatus+' |',
  '| Official TSE web gateway reachability | '+result.gatewayStatus+' |',
  '',
  '**Interpretation:** '+result.explain,
  '',
  'A successful GitHub Actions job only means the diagnostics ran and evidence was uploaded. It does not itself certify market-data freshness, after-close publication, or mobile-device acceptance.',
  ''
 ].join('\n');
}
if(require.main===module){
 const cdn=readJson(path.join('test-artifacts','live-market-v111.json'));
 const gateway=readJson(path.join('test-artifacts','live-market-webgw.json'));
 const result=summarize(cdn,gateway);
 const report=markdown(result);
 console.log(report);
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,report+'\n');
 fs.mkdirSync('test-artifacts',{recursive:true});
 fs.writeFileSync(path.join('test-artifacts','after-close-summary.json'),JSON.stringify(result,null,2)+'\n');
}
module.exports={summarize,markdown};
