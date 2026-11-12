'use strict';
const fs=require('node:fs');
const path=require('node:path');
// Generate only public, non-secret metadata. Never deploy from this script.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function renderConfig(id){
 if(typeof id!=='string'||!uuid.test(id)||id==='00000000-0000-0000-0000-000000000000')throw Error('INVALID_DATABASE_ID');
 return [
  '# Generated only for owner-approved Cloudflare pilot deployment.',
  'name = "sahamban-pro-pilot"',
  'main = "worker-api.mjs"',
  'compatibility_date = "2026-11-05"',
  'workers_dev = true',
  'preview_urls = false',
  '',
  '[vars]',
  'PWA_ORIGIN = "https://raminhashemi1.github.io"',
  'PILOT_ORDERS_ENABLED = "false"',
  'PREPAID_ORDERS_ENABLED = "false"',
  '',
  '[[d1_databases]]',
  'binding = "SAHAMBAN_DB"',
  'database_name = "sahamban-pilot"',
  'database_id = "'+id.toLowerCase()+'"',
  ''
 ].join('\n');
}
function writeConfig(id){
 const file=path.join(__dirname,'wrangler.deploy.toml');
 fs.writeFileSync(file,renderConfig(id),{encoding:'utf8',mode:0o600});
 return file;
}
if(require.main===module){
 try{
  if(process.argv.length!==3||process.argv[2]!=='--write')throw Error('USAGE: --write');
  writeConfig(process.env.SAHAMBAN_D1_DATABASE_ID);
  process.stdout.write('Generated private deployment configuration (no secrets).\n');
 }catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({renderConfig,writeConfig});
