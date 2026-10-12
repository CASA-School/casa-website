/**
 * Measures every public page at the screen sizes CASA's visitors use, in the
 * three browser engines (docs/RESPONSIVE_AND_BROWSERS.md).
 *
 *   node scripts/qa/responsive-audit.mjs [chromium|webkit|firefox] [--base http://127.0.0.1:3018] [--quick]
 *
 * Run it against a production build (`npx next start -p 3018`): the dev server
 * adds its own overlay. Pages come from the sitemap, so a new page is measured
 * without being listed here. Results go to output/responsive/<engine>.json,
 * and a summary grouped by element is printed.
 *
 * What counts as a defect, per page and size:
 * - overflow: the page scrolls sideways, and the elements that stick out;
 * - spill: a heading, paragraph, link or button whose text is wider than its box;
 * - tiny: visible text below 12px;
 * - taps (touch screens): a control smaller than 24×24px (WCAG 2.2 target size),
 *   and form fields below 16px, which make iOS Safari zoom in on focus;
 * - distorted: a picture stretched out of its own proportions;
 * - lines: running text wider than about 100 characters.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, firefox, webkit } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const engineName = args.find((arg) => ['chromium', 'webkit', 'firefox'].includes(arg)) ?? 'chromium';
const BASE = option('base', 'http://127.0.0.1:3018');
const QUICK = args.includes('--quick');

/** [name, width, height, touch]. Phones and foldables, tablets both ways, laptops, large screens. */
export const VIEWPORTS = [
  ['phone-320', 320, 568, true],
  ['phone-360', 360, 780, true],
  ['phone-375', 375, 667, true],
  ['phone-390', 390, 844, true],
  ['phone-430', 430, 932, true],
  ['fold-closed-344', 344, 882, true],
  ['fold-open-882', 882, 1104, true],
  ['phone-land-568', 568, 320, true],
  ['phone-land-667', 667, 375, true],
  ['phone-land-844', 844, 390, true],
  ['phone-land-932', 932, 430, true],
  ['tablet-768', 768, 1024, true],
  ['tablet-820', 820, 1180, true],
  ['tablet-1024p', 1024, 1366, true],
  ['tablet-land-1024', 1024, 768, true],
  ['tablet-land-1180', 1180, 820, true],
  ['tablet-land-1366', 1366, 1024, true],
  ['laptop-1280', 1280, 720, false],
  ['laptop-1366', 1366, 768, false],
  ['laptop-1440', 1440, 900, false],
  ['laptop-1536', 1536, 864, false],
  ['desktop-1920', 1920, 1080, false],
  ['desktop-2560', 2560, 1440, false],
  ['ultrawide-3440', 3440, 1440, false],
];

/** The sizes the other two engines are measured at: one of each kind. */
const KEY = new Set(['phone-320', 'phone-390', 'phone-land-844', 'fold-open-882', 'tablet-768', 'tablet-land-1024', 'laptop-1366', 'desktop-1920', 'desktop-2560']);

function measure() {
  const W = document.documentElement.clientWidth;
  const out = { docOverflow: document.documentElement.scrollWidth - W, offenders: [], spill: [], tiny: [], taps: [], inputs: [], distorted: [], lines: [] };
  const describe = (el) => {
    const parts = [];
    let node = el;
    for (let i = 0; i < 3 && node && node !== document.body; i += 1) {
      let s = node.tagName.toLowerCase();
      if (node.id) s += `#${node.id}`;
      const cls = [...node.classList].slice(0, 4).join('.');
      if (cls) s += `.${cls}`;
      parts.unshift(s);
      node = node.parentElement;
    }
    const where = el.closest('section[id], [aria-label], header, footer, nav, main > *');
    const label = where ? where.id || where.getAttribute('aria-label') || where.tagName.toLowerCase() : '';
    return `${label ? `[${label}] ` : ''}${parts.join(' > ')}`.slice(0, 260);
  };
  const srOnly = (el) => Boolean(el.closest('.sr-only')) || getComputedStyle(el).clip === 'rect(0px, 0px, 0px, 0px)';
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || srOnly(el)) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
  };
  const clippedByAncestor = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(a).overflowX)) return true;
    }
    return false;
  };

  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('[data-nextjs-toast], nextjs-portal')) continue;
    if (!shown(el)) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > W + 1 || r.left < -1) && !clippedByAncestor(el)) {
      out.offenders.push({ el: describe(el), left: Math.round(r.left), right: Math.round(r.right) });
    }
  }

  for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,a,button,label,dt,dd,td,th,figcaption,blockquote,summary')) {
    if (!shown(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'inline' || el.clientWidth === 0) continue;
    // A decorative piece placed outside on purpose (a connector line, a hidden radio) is not spilled text.
    // A touch area widened by an absolutely placed ::before or ::after reaches past the box too.
    const pseudoOutside = ['::before', '::after'].some((pseudo) => {
      const style = getComputedStyle(el, pseudo);
      return style.content !== 'none' && /^(absolute|fixed)$/.test(style.position);
    });
    const placedOutside = pseudoOutside || [...el.querySelectorAll('*')].some((child) => /^(absolute|fixed)$/.test(getComputedStyle(child).position));
    if (!placedOutside && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== 'ellipsis' && !/(auto|scroll)/.test(cs.overflowX)) {
      out.spill.push({ el: describe(el), text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 70), over: el.scrollWidth - el.clientWidth });
    }
  }

  const tiny = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim();
    const parent = node.parentElement;
    if (text.length < 2 || !parent || !shown(parent) || parent.closest('[aria-hidden="true"], script, style, svg, .sr-only')) continue;
    const fs = parseFloat(getComputedStyle(parent).fontSize);
    if (fs < 12) {
      const key = describe(parent);
      if (!tiny.has(key)) tiny.set(key, { el: key, fs, text: text.slice(0, 40) });
    }
  }
  out.tiny = [...tiny.values()];

  if (matchMedia('(pointer: coarse)').matches) {
    for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], summary')) {
      if (!shown(el)) continue;
      const box = el.getBoundingClientRect();
      // A touch area widened by an absolutely placed ::before (the drawn heroes' hotspots) counts.
      const before = getComputedStyle(el, '::before');
      const grow = before.content !== 'none' && before.position === 'absolute' ? -2 * Math.min(0, parseFloat(before.top) || 0) : 0;
      const r = { width: box.width + grow, height: box.height + grow };
      const inText = getComputedStyle(el).display === 'inline' && el.closest('p, li, dd, label');
      // A checkbox or switch with its label: the label is the target.
      const labelled = (el.labels && el.labels.length > 0) || Boolean(el.closest('label'));
      // A link stretched over its card (`after:absolute after:inset-0`): the card is the target.
      const after = getComputedStyle(el, '::after');
      const stretched = after.content !== 'none' && after.position === 'absolute';
      if ((r.height < 24 || r.width < 24) && !inText && !labelled && !stretched) {
        out.taps.push({ el: describe(el), w: Math.round(r.width), h: Math.round(r.height), text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30) });
      }
    }
    for (const el of document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]), select, textarea')) {
      if (!shown(el)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 16) out.inputs.push({ el: describe(el), fs });
    }
  }

  for (const img of document.querySelectorAll('img')) {
    if (!shown(img) || !img.naturalWidth || getComputedStyle(img).objectFit !== 'fill') continue;
    const r = img.getBoundingClientRect();
    const ratio = r.width / r.height / (img.naturalWidth / img.naturalHeight);
    if (Math.abs(ratio - 1) > 0.04) out.distorted.push({ el: describe(img), ratio: ratio.toFixed(2) });
  }

  for (const p of document.querySelectorAll('p, li')) {
    if (!shown(p) || p.textContent.trim().length < 160) continue;
    const fs = parseFloat(getComputedStyle(p).fontSize);
    const chars = p.getBoundingClientRect().width / (fs * 0.5);
    if (chars > 100) out.lines.push({ el: describe(p), chars: Math.round(chars) });
  }
  return out;
}

async function pagesFromSitemap() {
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  return [...new Set(paths)];
}

async function run() {
  const engine = { chromium, webkit, firefox }[engineName];
  const all = await pagesFromSitemap();
  const viewports = VIEWPORTS.filter(([name]) => engineName === 'chromium' ? !QUICK || KEY.has(name) : KEY.has(name));
  const pages = engineName === 'chromium' && !QUICK ? all : all.filter((p) => !p.startsWith('/en'));
  const browser = await engine.launch();
  const results = [];
  const started = Date.now();

  for (const [name, width, height, touch] of viewports) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: touch ? 2 : 1,
      hasTouch: touch,
      ...(engineName === 'firefox' ? {} : { isMobile: touch && width < 1024 }),
      reducedMotion: 'reduce',
    });
    const queue = [...pages];
    const worker = async () => {
      const page = await context.newPage();
      for (let p = queue.shift(); p; p = queue.shift()) {
        try {
          await page.goto(`${BASE}${p}`, { waitUntil: 'load', timeout: 45_000 });
          await page.waitForTimeout(250);
          results.push({ viewport: name, width, height, page: p, ...(await page.evaluate(measure)) });
        } catch (error) {
          results.push({ viewport: name, width, height, page: p, error: String(error).slice(0, 200) });
        }
      }
      await page.close();
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    await context.close();
    process.stdout.write(`  ${engineName} ${name} done (${Math.round((Date.now() - started) / 1000)}s)\n`);
  }
  await browser.close();

  const dir = path.join(root, 'output/responsive');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${engineName}.json`), JSON.stringify(results, null, 1));
  summarise(results);
}

function summarise(results) {
  const tally = (kind, keyOf) => {
    const map = new Map();
    for (const r of results) {
      for (const item of r[kind] ?? []) {
        const key = keyOf(item);
        const entry = map.get(key) ?? { key, count: 0, sizes: new Set(), pages: new Set(), sample: item };
        entry.count += 1;
        entry.sizes.add(r.viewport);
        entry.pages.add(r.page);
        map.set(key, entry);
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  };
  const errors = results.filter((r) => r.error);
  const overflowing = results.filter((r) => r.docOverflow > 1);
  console.log(`\n${engineName}: ${results.length} page loads, ${errors.length} errors, ${overflowing.length} with sideways scroll`);
  const byPage = new Map();
  for (const r of overflowing) byPage.set(r.page, [...(byPage.get(r.page) ?? []), `${r.viewport}(+${r.docOverflow})`]);
  for (const [p, sizes] of byPage) console.log(`  overflow ${p}: ${sizes.slice(0, 8).join(' ')}`);
  for (const [kind, keyOf] of [
    ['offenders', (i) => i.el],
    ['spill', (i) => i.el],
    ['tiny', (i) => i.el],
    ['taps', (i) => i.el],
    ['inputs', (i) => i.el],
    ['distorted', (i) => i.el],
    ['lines', (i) => i.el],
  ]) {
    const rows = tally(kind, keyOf);
    if (!rows.length) continue;
    console.log(`\n  ${kind} (${rows.length} distinct)`);
    for (const row of rows.slice(0, 12)) {
      console.log(`    ${row.count}× ${row.key}\n       sizes: ${[...row.sizes].slice(0, 6).join(', ')} · pages: ${[...row.pages].slice(0, 3).join(', ')} · ${JSON.stringify(row.sample).slice(0, 160)}`);
    }
  }
  for (const r of errors.slice(0, 5)) console.log(`  error ${r.viewport} ${r.page}: ${r.error}`);
}

await run();
