'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {renderConfig}=require('../server/generate-pilot-deploy-config.cjs');
const id='7f425708-34cb-4d82-aeff-890123456789';
test('pilot deploy config is exact, non-secret and paid orders remain disabled',()=>{
 const str=renderConfig(id);
 for(const s of ['name = "sahamban-pro-pilot"','binding = "SAHAMBAN_DB"',
  'database_name = "sahamban-pilot"','database_id = "'+id+'"',
  'workers_dev = true','PILOT_ORDERS_ENABLED = "false"',
  'PREPAID_ORDERS_ENABLED = "false"',
  'PWA_ORIGIN = "https://raminhashemi1.github.io"'])assert.ok(str.includes(s),s);
 assert.doesNotMatch(str,/AUTH_HMAC_SECRET|API_TOKEN|PILOT_ANNUAL_PRICE_RIAL/);
});
test('rejects placeholder, injection, missing and invalid database identifiers',()=>{
 for(const bad of [undefined,'',null,'REPLACE_WITH_REAL_D1_DATABASE_ID',
  '00000000-0000-0000-0000-000000000000',12,
  id+'\nPILOT_ORDERS_ENABLED = "true"'])assert.throws(()=>renderConfig(bad),/INVALID_DATABASE_ID/);
});
test('manual release never triggers from push, requires approval and locked variables',()=>{
 const s=fs.readFileSync('.github/workflows/cloudflare-pilot-deploy.yml','utf8');
 assert.match(s,/workflow_dispatch:/);
 assert.doesNotMatch(s,/\n  push:|\n  pull_request:/);
 for(const required of ['DEPLOY_PILOT_NO_PAYMENTS','environment: cloudflare-pilot',
  'secrets.CLOUDFLARE_API_TOKEN','vars.CLOUDFLARE_ACCOUNT_ID',
  'vars.SAHAMBAN_D1_DATABASE_ID','wrangler d1 execute','--remote',
  'd1-prepaid-migration.sql','/user/tokens/verify',
  'wrangler deploy --config server/wrangler.deploy.toml'])assert.ok(s.includes(required),required);
});
