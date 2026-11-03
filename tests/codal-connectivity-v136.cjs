'use strict';
// Low-frequency, read-only CODAL connectivity diagnostic.
// Uses one known listed issuer only. Does not download reports or read user holdings.
const fs = require('node:fs');
const url = new URL('https://search.codal.ir/api/search/v2/q');
url.search = new URLSearchParams({
  Symbol: 'ونوین',
  PageNumber: '1',
  LetterType: '-1',
  Category: '-1',
  TracingNo: '-1',
  search: 'true'
}).toString();

function save(status, details = {}) {
  fs.mkdirSync('test-artifacts', { recursive: true });
  const report = {
    status,
    checked_at: new Date().toISOString(),
    source: 'https://search.codal.ir/api/search/v2/q',
    symbol: 'ونوین',
    request_scope: 'One public issuer filing search; read-only; no portfolio data; no report downloads.',
    ...details
  };
  fs.writeFileSync('test-artifacts/codal-v136.json', JSON.stringify(report, null, 2) + '\n');
  console.log('CODAL_STATUS: ' + status);
}

(async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; SahambanReadOnlyCheck/1.0)'
      }
    });
    const contentType = response.headers.get('content-type') || '';
    if (response.status === 429) {
      save('UNVERIFIED_RATE_LIMIT', { http_status: 429, retry_after: response.headers.get('retry-after') });
      return;
    }
    if (!response.ok) {
      save('UNVERIFIED_HTTP', { http_status: response.status, content_type: contentType });
      return;
    }
    const raw = await response.text();
    let body;
    if (/json/i.test(contentType) || raw.trim().startsWith('{')) {
      try { body = JSON.parse(raw); }
      catch { save('UNVERIFIED_JSON_PARSE', { http_status: response.status, content_type: contentType }); return; }
    } else if (raw.trim().startsWith('<')) {
      const decode = value => String(value || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&#(\\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
      const tag = (chunk, name) => { const m = chunk.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '\\s*>', 'i')); return m ? decode(m[1].replace(/<[^>]+>/g, '').trim()) : ''; };
      const matches = [...raw.matchAll(/<CodalLetterHeaderDto(?:\s[^>]*)?>([\s\S]*?)<\/CodalLetterHeaderDto\s*>/gi)];
      const letters = matches.map(m => { const x = m[1]; return { TracingNo: tag(x, 'TracingNo'), Symbol: tag(x, 'Symbol'), Title: tag(x, 'Title'), PublishDateTime: tag(x, 'PublishDateTime'), SentDateTime: tag(x, 'SentDateTime'), HasExcel: /^true$/i.test(tag(x, 'HasExcel')), HasPdf: /^true$/i.test(tag(x, 'HasPdf')) }; });
      const total = tag(raw, 'Total');
      if (!/<(?:[\w.-]+:)?SearchReportListDto(?:\s|>)/i.test(raw) && matches.length === 0) {
        save('UNVERIFIED_XML_SCHEMA', { http_status: response.status, content_type: contentType });
        return;
      }
      body = { Total: total === '' ? letters.length : Number(total), Page: Number(tag(raw, 'Page') || 1), Letters: letters };
    } else {
      save('UNVERIFIED_RESPONSE_FORMAT', { http_status: response.status, content_type: contentType, body_prefix: raw.slice(0, 120) });
      return;
    }
    if (!body || !Array.isArray(body.Letters) || !Number.isFinite(Number(body.Total))) {
      save('UNVERIFIED_SCHEMA', { http_status: response.status, content_type: contentType, top_level_keys: Object.keys(body || {}) });
      return;
    }
    const letters = body.Letters.slice(0, 5).map(x => ({
      title: String(x.Title || '').slice(0, 240),
      symbol: String(x.Symbol || ''),
      publish_date: String(x.PublishDateTime || x.SentDateTime || ''),
      tracing_no: Number.isFinite(Number(x.TracingNo)) ? Number(x.TracingNo) : null,
      has_excel: Boolean(x.HasExcel),
      has_pdf: Boolean(x.HasPdf)
    }));
    save('SEARCH_RESPONSE_VALIDATED', {
      http_status: response.status,
      total_results: Number(body.Total),
      page: Number(body.Page),
      returned_letters: letters.length,
      sample: letters
    });
  } catch (error) {
    const code = error?.cause?.code || error?.code || error?.name || 'UNKNOWN';
    save(error?.name === 'AbortError' ? 'UNVERIFIED_TIMEOUT' : 'UNVERIFIED_NETWORK', {
      network_error_code: String(code),
      message: String(error?.message || error).slice(0, 300)
    });
  } finally {
    clearTimeout(timer);
  }
})().catch(error => {
  save('UNVERIFIED_DIAGNOSTIC_ERROR', { message: String(error?.message || error).slice(0, 300) });
});
