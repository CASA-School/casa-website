/**
 * Crawl every public page at many widths and record every photograph's box:
 * which file, where, its rendered size, natural size, object-fit and
 * object-position. Input for scripts/media/fit_positions.py (crop pass,
 * 2026-10-02).
 *
 *   node scripts/media/crop_audit.mjs http://localhost:3055 /tmp/audit.json
 *   WIDTHS=390,1440 PAGES=/,/en node scripts/media/crop_audit.mjs ...
 *
 * Pages come from the site's own sitemap, so DE and EN are both covered.
 */
import fs from 'node:fs';

import { chromium } from '@playwright/test';

const [base = 'http://localhost:3000', out = 'crop-audit.json'] = process.argv.slice(2);
const widths = (process.env.WIDTHS || '390,640,768,820,1000,1024,1200,1280,1440,1920').split(',').map(Number);
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
const only = process.env.PAGES ? process.env.PAGES.split(',') : null;
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => new URL(m[1]).pathname)
  .filter((path) => !only || only.includes(path));

const browser = await chromium.launch();
const rows = [];
for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  for (const url of urls) {
    try {
      await page.goto(base + url, { waitUntil: 'networkidle', timeout: 90_000 });
    } catch (error) {
      console.log('skipped', url, error.message);
      continue;
    }
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
    const found = await page.evaluate(() =>
      [...document.querySelectorAll('img')]
        .map((img) => {
          const box = img.getBoundingClientRect();
          const style = getComputedStyle(img);
          let src = img.currentSrc || img.src;
          const match = src.match(/[?&]url=([^&]+)/);
          if (match) src = decodeURIComponent(match[1]);
          src = src.replace(location.origin, '');
          return {
            src, y: box.top + scrollY, W: box.width, H: box.height, nw: img.naturalWidth, nh: img.naturalHeight,
            fit: style.objectFit, pos: style.objectPosition, blur: style.filter.includes('blur'),
          };
        })
        .filter((img) => img.src.startsWith('/media/casa/') && img.W > 2 && img.H > 2 && !img.blur)
    );
    const seen = new Set();
    for (const img of found) {
      const key = img.src + Math.round(img.y);
      if (!seen.has(key)) {
        seen.add(key);
        rows.push({ url, width, ...img });
      }
    }
  }
  await context.close();
}
await browser.close();
fs.writeFileSync(out, JSON.stringify(rows));
console.log(`${rows.length} photo boxes on ${urls.length} pages at ${widths.length} widths -> ${out}`);
