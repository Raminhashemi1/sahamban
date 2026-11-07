'use strict';
// Read-only connectivity diagnostic; never accesses holdings, tokens or private data.
const fs = require('node:fs');
const dns = require('node:dns').promises;
const net = require('node:net');
const host = 'cdn.tsetmc.com';
const url = 'https://' + host + '/api/Instrument/GetInstrumentSearch/' + encodeURIComponent('فولاد');
const report = { test: 'tsetmc-runner-connectivity-v1', checked_at: new Date().toISOString(), host, probes: {} };
const errorInfo = (error) => ({
  code: error?.cause?.code || error?.code || null,
  name: error?.name || null,
  message: String(error?.cause?.message || error?.message || error).slice(0, 250)
});
async function probe(name, fn) {
  const started = Date.now();
  try {
    report.probes[name] = { status: 'OK', elapsed_ms: Date.now() - started, ...await fn() };
  } catch (error) {
    report.probes[name] = { status: 'FAILED', elapsed_ms: Date.now() - started, error: errorInfo(error) };
  }
}
function tcpConnect() {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port: 443 });
    socket.setTimeout(8000);
    socket.once('connect', () => { socket.destroy(); resolve({ port: 443 }); });
    socket.once('timeout', () => { socket.destroy(); reject(Object.assign(new Error('TCP timeout after 8 seconds'), { code: 'TCP_TIMEOUT' })); });
    socket.once('error', error => { socket.destroy(); reject(error); });
  });
}
(async () => {
  await probe('dns', async () => {
    const addresses = await dns.lookup(host, { all: true });
    if (!addresses.length) throw new Error('No DNS addresses');
    return { address_count: addresses.length, families: [...new Set(addresses.map(a => a.family))] };
  });
  await probe('tcp_443', tcpConnect);
  await probe('https_api', async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        method: 'GET', signal: controller.signal, cache: 'no-store',
        headers: { accept: 'application/json', 'user-agent': 'Sahamban-readonly-diagnostic/1.0' }
      });
      const contentType = response.headers.get('content-type') || '';
      // Consume a bounded body sample; do not save market data.
      const body = await response.text();
      let shape = 'not-json';
      if (/json/i.test(contentType)) {
        try {
          const parsed = JSON.parse(body);
          shape = Array.isArray(parsed?.instrumentSearch) ? 'instrumentSearch-array' : 'other-json';
        } catch { shape = 'invalid-json'; }
      }
      return { http_status: response.status, http_ok: response.ok, content_type: contentType.slice(0, 80), response_shape: shape, payload_bytes: Buffer.byteLength(body) };
    } finally { clearTimeout(timer); }
  });
  report.outcome = report.probes.https_api?.status === 'OK' &&
    report.probes.https_api.http_ok &&
    report.probes.https_api.response_shape === 'instrumentSearch-array'
      ? 'API_REACHABLE_NOT_LIVE_QUOTE_VERIFIED'
      : 'API_NOT_VERIFIED';
  fs.mkdirSync('test-artifacts', { recursive: true });
  fs.writeFileSync('test-artifacts/tsetmc-network-diagnostic-v1.json', JSON.stringify(report, null, 2) + '\n');
  console.log('TSETMC_DIAGNOSTIC_RESULT: ' + report.outcome);
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error('Diagnostic infrastructure error:', errorInfo(error)); process.exitCode = 1; });
