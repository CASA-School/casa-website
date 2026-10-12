/**
 * Full-page screenshots of the key public pages at representative sizes, for a
 * visual review (docs/RESPONSIVE_AND_BROWSERS.md).
 *
 *   node scripts/qa/responsive-shots.mjs [chromium|webkit|firefox] [--base http://127.0.0.1:3018]
 *
 * Chromium at nine sizes, the other two engines at a phone, a tablet and a
 * laptop. Written to output/responsive/shots/<engine>/<size>/<page>.png.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, firefox, webkit } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const engineName = args.find((arg) => ['chromium', 'webkit', 'firefox'].includes(arg)) ?? 'chromium';
const baseIndex = args.indexOf('--base');
const BASE = baseIndex >= 0 ? args[baseIndex + 1] : 'http://127.0.0.1:3018';

export const PAGES = [
  ['home', '/'],
  ['courses', '/sprachkurse'],
  ['intensive', '/sprachkurse/deutsch-intensiv'],
  ['groups', '/sprachkurse/deutsch-fuer-gruppen'],
  ['levels', '/sprachkurse/niveaustufen'],
  ['special', '/sprachkurse/deutsch-spezialkurse'],
  ['exams', '/pruefungszentrum'],
  ['telc-b2', '/pruefungszentrum/telc-deutsch-b2'],
  ['accommodation', '/unterkunft'],
  ['host-family', '/unterkunft/wohnen-in-einer-gastfamilie'],
  ['leitbild', '/ueber-uns/casa-leitbild'],
  ['contact', '/kontakt'],
  ['register', '/anmeldung/anmeldeformular'],
  ['faq', '/faq'],
  ['calculator', '/kostenrechner'],
  ['guide', '/ratgeber/studieren-in-deutschland'],
];

const ALL = [
  ['320x568', 320, 568, true],
  ['390x844', 390, 844, true],
  ['844x390', 844, 390, true],
  ['882x1104', 882, 1104, true],
  ['768x1024', 768, 1024, true],
  ['1024x768', 1024, 768, true],
  ['1366x768', 1366, 768, false],
  ['1920x1080', 1920, 1080, false],
  ['2560x1440', 2560, 1440, false],
];
const OTHERS = new Set(['390x844', '768x1024', '1366x768']);

const engine = { chromium, webkit, firefox }[engineName];
const browser = await engine.launch();
for (const [name, width, height, touch] of ALL.filter(([n]) => engineName === 'chromium' || OTHERS.has(n))) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    hasTouch: touch,
    ...(engineName === 'firefox' ? {} : { isMobile: touch && width < 1024 }),
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const dir = path.join(root, 'output/responsive/shots', engineName, name);
  mkdirSync(dir, { recursive: true });
  for (const [slug, url] of PAGES) {
    await page.goto(`${BASE}${url}`, { waitUntil: 'load' });
    // Lazy images: walk down the page once so they load, then back up.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight * 0.8) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, `${slug}.png`), fullPage: true });
  }
  await context.close();
  console.log(`${engineName} ${name} done`);
}
await browser.close();
