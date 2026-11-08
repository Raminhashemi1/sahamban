'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Isolated, offline execution of the real public-symbol click handler.
// No network, portfolio storage, secrets, or production changes.
const html = fs.readFileSync('market-connectivity-test.html', 'utf8');
const marker = "'use strict';\nconst $=id=>document.getElementById(id);";
const start = html.indexOf(marker);
assert.ok(start > 0, 'public-symbol script marker must exist');
const script = html.slice(start, html.indexOf('</script>', start));
const instrumentCode = '12345678';
const day = '20261108', previousDay = '20261107', quote = 4540;

function mockResponse(body) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => body
  };
}
async function runCase(kind) {
  const elements = Object.create(null);
  const listeners = Object.create(null);
  for (const name of ['run', 'status', 'run-basket', 'basket-status', 'basket-results', 'symbols-input']) {
    elements[name] = {
      value: '',
      textContent: '',
      disabled: false,
      addEventListener(event, callback) { listeners[name + ':' + event] = callback; },
      appendChild() {},
      replaceChildren() {}
    };
  }
  const paths = [];
  const fetchMock = async url => {
    const path = new URL(url).pathname;
    paths.push(path);
    if (path.includes('/Instrument/GetInstrumentSearch/')) {
      return mockResponse({ instrumentSearch: [{ insCode: instrumentCode, lVal18AFC: 'فولاد' }] });
    }
    if (path.endsWith('/ClosingPrice/GetClosingPriceInfo/' + instrumentCode)) {
      return mockResponse({ closingPriceInfo: {
        pClosing: quote, dEven: day, finalLastDate: day, lastHEven: '112939'
      }});
    }
    if (path.endsWith('/ClosingPrice/GetClosingPriceDailyList/' + instrumentCode + '/0')) {
      return mockResponse({ closingPriceDaily: [
        { dEven: previousDay, pClosing: 4410 },
        { dEven: '20261104', pClosing: 4350 }
      ]});
    }
    if (path.endsWith('/ClosingPrice/GetClosingPriceDaily/' + instrumentCode + '/' + day)) {
      if (kind === 'network-error') throw new Error('Simulated daily endpoint outage');
      if (kind === 'wrong-date') return mockResponse({ closingPriceDaily: { dEven: previousDay, pClosing: quote } });
      if (kind === 'wrong-price') return mockResponse({ closingPriceDaily: { dEven: day, pClosing: quote + 10 } });
      if (kind === 'missing') return mockResponse({ closingPriceDaily: null });
      return mockResponse({ closingPriceDaily: { dEven: day, pClosing: quote } });
    }
    throw Error('Unexpected external endpoint: ' + path);
  };
  const fixed = new Date('2026-11-08T08:00:00Z');
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [fixed.getTime()])); }
    static now() { return fixed.getTime(); }
  }
  vm.runInNewContext(script, {
    document: { getElementById: name => elements[name] },
    fetch: fetchMock, URL, Intl, Date: FixedDate, AbortController,
    setTimeout, clearTimeout, Map, Set, Number, String, Object, Math, Error
  }, { filename: 'market-connectivity-test.html', timeout: 3000 });
  assert.equal(typeof listeners['run:click'], 'function');
  await listeners['run:click']();
  return { output: elements.status.textContent, paths };
}

test('same-date same-price daily record corroborates quote, not an independent provider', async () => {
  const { output, paths } = await runCase('matching');
  assert.match(output, /^CORROBORATED_SAME_PROVIDER/);
  assert.match(output, /این نتیجه PASS کامل نیست/);
  assert.match(output, /مسیر روزانه دوم TSETMC/);
  assert.match(output, /نه منبع مستقل/);
  assert.ok(paths.some(x => x.endsWith('/ClosingPrice/GetClosingPriceDaily/' + instrumentCode + '/' + day)));
});
for (const kind of ['wrong-date', 'wrong-price', 'missing', 'network-error']) {
  test(kind + ' cannot pass live market validation', async () => {
    const { output } = await runCase(kind);
    assert.doesNotMatch(output, /^PASS/);
    assert.match(output, /FRESH_QUOTE_HISTORY_PENDING/);
  });
}
