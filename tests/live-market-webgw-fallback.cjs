'use strict';
// Read-only fallback probe for the Tehran Securities Exchange Technology Management
// official web gateway. Does not access or transmit user portfolio data.
const fs=require('node:fs');
const url='https://webgw.tse.ir/InstrumentProvider/api/v1/Instrument/LiveInstrumentByIdQuery/fa?InstrumentId=IRO1FOLD0001';
(async()=>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(url,{signal:controller.signal,headers:{accept:'application/json','user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'}});
  const type=response.headers.get('content-type')||'';
  const body=await response.text();
  let parsed=null,parseError=null;
  try{parsed=JSON.parse(body);}catch(e){parseError=String(e.message||e);}
  const result={
   checked_at:new Date().toISOString(),timezone:'UTC timestamp; market context Asia/Tehran',
   source:'https://webgw.tse.ir',endpoint:'InstrumentProvider LiveInstrumentByIdQuery',
   instrument:'فولاد (IRO1FOLD0001)',http_status:response.status,ok:response.ok,
   content_type:type,body_bytes:Buffer.byteLength(body),
   json_valid:!!parsed,top_level_type:parsed===null?null:Array.isArray(parsed)?'array':typeof parsed,
   top_level_keys:parsed&&typeof parsed==='object'?Object.keys(parsed).slice(0,30):[],
   parse_error:parseError,
   body_preview:parsed?undefined:body.slice(0,300).replace(/[\r\n]+/g,' ')
  };
  fs.mkdirSync('test-artifacts',{recursive:true});
  fs.writeFileSync('test-artifacts/live-market-webgw.json',JSON.stringify(result,null,2)+'\n');
  console.log('WEBGW_STATUS: '+(response.ok&&parsed?'JSON_RESPONSE_RECEIVED':'UNVERIFIED_RESPONSE'));
  console.log(JSON.stringify(result));
  if(!response.ok||!parsed)process.exitCode=1;
 }catch(e){
  const result={checked_at:new Date().toISOString(),source:'https://webgw.tse.ir',instrument:'فولاد (IRO1FOLD0001)',status:'UNVERIFIED_NETWORK',error:String(e.message||e),code:e.cause?.code||e.code||null};
  fs.mkdirSync('test-artifacts',{recursive:true});
  fs.writeFileSync('test-artifacts/live-market-webgw.json',JSON.stringify(result,null,2)+'\n');
  console.log('WEBGW_STATUS: UNVERIFIED_NETWORK');
  console.log(JSON.stringify(result));
  process.exitCode=0;
 }finally{clearTimeout(timer);}
})();
