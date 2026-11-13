'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const worker=fs.readFileSync('sw.js','utf8');
const publicScripts=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)]
 .map(match=>match[1].split('?')[0].replace(/^\.\//,''));
const workerAssets=[...worker.matchAll(/['"]\.\/([^'"?]+)(?:\?[^'"]*)?['"]/g)]
 .map(match=>match[1]);
// Recognize static imports, dynamic imports, require(), and re-exports of server modules.
const SERVER_MODULE_IMPORT=/\b(?:import\s*(?:\(\s*)?|require\s*\(\s*|from\s*)['"](?:\.\.\/|\.\/|\/)*server\//;

test('public PWA HTML and service-worker assets never ship server-only payment/entitlement code',()=>{
 assert.ok(publicScripts.includes('app.js'),'public entry must actually be scanned');
 assert.ok(workerAssets.includes('app.js'),'service worker asset inventory must be scanned');
 const all=new Set([...publicScripts,...workerAssets]);
 for(const name of all){
  assert.ok(!name.startsWith('server/'), 'server asset in public bundle: '+name);
  assert.doesNotMatch(name,/subscription|settlement|bank-reconciliation|pro-access-gate|psp|checkout|payment/i,
   'payment-related code must stay server-only: '+name);
 }
 for(const source of [html,worker]){
  assert.doesNotMatch(source,/(?:src|href)=["'][^"']*\/server\//i);
  assert.doesNotMatch(source,/(?:src|href)=["'][^"']*\b(?:checkout|payment|subscription-entitlements)\b/i);
 }
});

test('all referenced first-party PWA scripts exist and cannot pull in server-only modules',()=>{
 for(const script of publicScripts){
  assert.match(script,/^[A-Za-z0-9][A-Za-z0-9._-]*\.js$/,'unusual script location: '+script);
  assert.ok(fs.existsSync(script),'missing public script: '+script);
  const source=fs.readFileSync(script,'utf8');
  assert.doesNotMatch(source,SERVER_MODULE_IMPORT,
   'server-only code imported into public script: '+script);
 }
});

test('server payment domain logic stays dependent on verified backend inputs, not browser grants',()=>{
 const files=['server/subscription-orders.cjs','server/subscription-entitlements.cjs',
  'server/manual-subscription-settlement.cjs','server/pro-access-gate.cjs'];
 for(const f of files){
  assert.ok(fs.existsSync(f),f);
  const code=fs.readFileSync(f,'utf8');
  assert.doesNotMatch(code,/\bwindow\.|\blocalStorage\b|\bdocument\./,
   'server-only module accesses browser context: '+f);
 }
 const order=fs.readFileSync(files[0],'utf8');
 const entitlement=fs.readFileSync(files[1],'utf8');
 const gate=fs.readFileSync(files[3],'utf8');
 assert.match(order,/verifyAtProvider\(\{order,receipt\}\)!==true/);
 assert.match(entitlement,/verifyProviderEvent\(event\)!==true/);
 assert.match(gate,/WHERE u\.auth_subject = \?/);
 assert.match(gate,/NOT_AUTHENTICATED/);
});


test('public import guard detects relative server imports and ignores ordinary client modules',()=>{
 const forbidden=[
  "import '../server/subscription-entitlements.cjs'",
  "import './server/subscription-orders.cjs'",
  "import('/server/pro-access-gate.cjs')",
  "const grant=require('../server/manual-subscription-settlement.cjs')",
  "import { grant } from '../server/subscription-entitlements.cjs'",
  "export { grant } from './server/subscription-entitlements.cjs'"
 ];
 for(const payload of forbidden)
  assert.match(payload,SERVER_MODULE_IMPORT,'guard must reject: '+payload);
 const safe=[
  "import './local-backup-v148.js'",
  "const helper=require('./client-module.cjs')",
  "import {x} from '../client/safe-module.js'"
 ];
 for(const payload of safe)
  assert.doesNotMatch(payload,SERVER_MODULE_IMPORT,'guard must accept: '+payload);
});
