'use strict';
// v106: WebKit mobile-layout regression using only synthetic data.
// Linux WebKit is NOT physical iOS Safari, and CI timing is NOT field performance.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { webkit } = require('playwright');

async function main() {
  const root = process.cwd();
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const requested = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
    const full = path.resolve(root, requested);
    if (!full.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(full, (error, content) => {
      if (error) { res.writeHead(404).end(); return; }
      const type = full.endsWith('.js') ? 'text/javascript'
        : full.endsWith('.css') ? 'text/css'
        : full.endsWith('.html') ? 'text/html;charset=utf-8'
        : full.endsWith('.webmanifest') ? 'application/manifest+json'
        : full.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(content);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser, context, page;
  try {
    browser = await webkit.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      locale: 'fa-IR'
    });
    page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port + '/index.html', { waitUntil: 'load' });

    // Native skip link must activate with a keyboard, independent of startup focus.
    await page.locator('.sb105-skip-link').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'sb105MainContent');

    await page.evaluate(() => { location.hash = 'livePortfolioSection'; });
    await page.locator('#sb88-tab-prices').click();
    await page.locator('#livePortfolioTable').evaluate(el => { el.hidden = false; });
    await page.locator('#livePortfolioRows').evaluate(body => {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < 100; i++) {
        const row = document.createElement('tr');
        for (let j = 0; j < 15; j++) {
          const cell = document.createElement('td');
          cell.textContent = j === 0 ? 'نماد ' + i : i + '-' + j;
          row.append(cell);
        }
        fragment.append(row);
      }
      body.replaceChildren(fragment);
    });

    const controls = page.locator('#livePortfolioTable .sb99-mode');
    await controls.first().click(); // Explicit card mode; no reliance on default.
    await page.waitForFunction(() =>
      document.querySelectorAll('#livePortfolioTable .sb99-card').length === 100);
    assert.equal(await page.locator('#livePortfolioRows tr').count(), 100);
    assert.equal(await page.locator('#livePortfolioRows td').count(), 1500);
    assert.equal(await page.locator('#livePortfolioTable .sb99-fields:not(.sb99-extra) dd').count(), 400);
    assert.equal(await page.locator('#livePortfolioTable .sb99-extra dd').count(), 1100);

    // Persian digits search only the rendered labels; it must never delete source rows.
    const search = page.locator('#sb104CardSearch');
    await search.fill('نماد ۹۹');
    assert.equal(await page.locator('#livePortfolioTable .sb99-card:visible').count(), 1);
    assert.equal(await page.locator('#livePortfolioRows tr').count(), 100);
    await search.press('Escape');
    assert.equal(await page.locator('#livePortfolioTable .sb99-card:visible').count(), 100);

    await page.locator('#livePortfolioTable .sb99-more summary').first().click();
    assert.equal(await page.locator('#livePortfolioTable .sb99-extra dd:visible').count(), 11);

    // Switch repeatedly, capturing diagnostics but imposing no arbitrary speed threshold.
    const rounds = [];
    for (let i = 0; i < 5; i++) {
      await controls.last().click();
      assert.equal(await page.locator('#livePortfolioTable .sb99-card').count(), 0);
      const start = Date.now();
      await controls.first().click();
      await page.waitForFunction(() =>
        document.querySelectorAll('#livePortfolioTable .sb99-card').length === 100);
      rounds.push(Date.now() - start);
    }
    const sorted = [...rounds].sort((a, b) => a - b);
    console.log('WEBKIT 100-card CI-only timing (ms): samples=' + rounds.join(',')
      + ', median=' + sorted[2] + ', max=' + sorted[4]);
    await controls.last().click();
    assert.equal(await page.locator('#livePortfolioRows tr').count(), 100);

    // 320px narrow-screen layout must keep the card search inside the viewport.
    await page.setViewportSize({ width: 320, height: 700 });
    await controls.first().click();
    await page.waitForFunction(() =>
      document.querySelectorAll('#livePortfolioTable .sb99-card').length === 100);
    const box = await search.boundingBox();
    assert.ok(box && box.x >= -2 && box.x + box.width <= 322,
      'mobile card search overflows the 320px viewport');
    assert.deepEqual(errors, [], 'uncaught page JavaScript errors');
    console.log('PASS WebKit synthetic 100-row mobile UI, 320/390 layout, Persian search, keyboard and toggles');
    console.log('NOTE: This is Linux WebKit emulation, not iPhone, VoiceOver, real-network or market-data validation.');
  } catch (error) {
    if (page) {
      await fs.promises.mkdir('test-artifacts', { recursive: true });
      await page.screenshot({ path: 'test-artifacts/webkit-mobile-failure.png', fullPage: true }).catch(() => {});
    }
    throw error;
  } finally {
    await context?.close();
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
