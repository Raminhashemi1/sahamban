'use strict';
// v120: public deployment smoke test. Only verifies publicly served PWA assets.
// Does not assert installation on hardware, live prices, alerts or financial correctness.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const origin = process.env.SAHAMBAN_PUBLIC_ORIGIN || 'https://raminhashemi1.github.io/sahamban/';
const base = new URL(origin);
assert.equal(base.protocol, 'https:', 'public PWA must use HTTPS');
const report = {
  version: 120, kind: 'public-deployment-smoke', origin: base.href,
  physical_device: false, actual_installation: false,
  market_data_verified: false, checks: [], status: 'RUNNING'
};
async function fetchAsset(relative) {
  const url = new URL(relative, base);
  assert.equal(url.origin, base.origin);
  const response = await fetch(url, {
    redirect: 'follow', cache: 'no-store',
    signal: AbortSignal.timeout(15000),
    headers: { 'accept': '*/*' }
  });
  assert.equal(response.status, 200, url.href + ' returned ' + response.status);
  assert.equal(new URL(response.url).origin, base.origin, 'unexpected cross-origin redirect');
  return { response, bytes: Buffer.from(await response.arrayBuffer()) };
}
function check(condition, label) { assert.ok(condition, label); report.checks.push(label); }
async function main() {
  const { bytes: index } = await fetchAsset('index.html');
  check(index.toString('utf8').includes('install.html'), 'public app links to installation entry');
  const { bytes: install } = await fetchAsset('install.html');
  const installText = install.toString('utf8');
  check(/نصب سهام‌بان/.test(installText) && /Add to Home Screen/.test(installText),
    'public Persian install instructions for Android/iPhone');
  check(/serviceWorker\.register/.test(installText), 'public install page registers service worker');
  const { bytes: manifestBytes } = await fetchAsset('manifest.webmanifest');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  check(manifest.display === 'standalone' && manifest.lang === 'fa' &&
    manifest.dir === 'rtl' && manifest.start_url === './' && manifest.scope === './',
    'public manifest install configuration');
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(x => x.sizes === size + 'x' + size && x.type === 'image/png');
    assert.ok(icon, 'manifest missing ' + size + 'px PNG');
    const { bytes } = await fetchAsset(icon.src);
    check(bytes.subarray(0,8).toString('hex') === '89504e470d0a1a0a' &&
      bytes.readUInt32BE(16) === size && bytes.readUInt32BE(20) === size,
      'public ' + size + 'px PNG has correct signature/dimensions');
  }
  const { bytes: swBytes } = await fetchAsset('sw.js');
  const sw = swBytes.toString('utf8');
  check(sw.includes('./install.html') && sw.includes('./index.html'),
    'public service worker includes install and app shell');
  const { bytes: appJs } = await fetchAsset('app.js');
  check(appJs.length > 1000, 'public application JavaScript is nonempty');
  report.status = 'PASS_PUBLIC_ASSETS_ONLY';
  console.log('PASS: published PWA files available over HTTPS; device and market checks remain open');
}
main().catch(error => {
  report.status = 'FAIL'; report.error = String(error.stack || error);
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  fs.mkdirSync('test-artifacts', {recursive:true});
  fs.writeFileSync('test-artifacts/public-deployment-v120.json', JSON.stringify(report,null,2)+'\n');
});
