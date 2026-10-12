import { expect, test } from '@playwright/test';

/*
 * The main pages at the sizes that broke before (docs/RESPONSIVE_AND_BROWSERS.md):
 * nothing scrolls sideways, no form field below 16px on a touch screen (iOS Safari
 * zooms in), no visible text below 12px. scripts/qa/responsive-audit.mjs measures
 * every page at 24 sizes; this keeps the worst three from coming back.
 */

const PAGES = ['/', '/sprachkurse', '/sprachkurse/deutsch-intensiv', '/sprachkurse/niveaustufen', '/unterkunft', '/kontakt', '/anmeldung/anmeldeformular', '/kostenrechner', '/ratgeber/studieren-in-deutschland', '/en/courses'];

const SIZES = [
  { name: 'phone 320', width: 320, height: 568, touch: true },
  { name: 'folded phone 344', width: 344, height: 882, touch: true },
  { name: 'phone landscape 844', width: 844, height: 390, touch: true },
  { name: 'tablet 1024 portrait', width: 1024, height: 1366, touch: true },
  { name: 'laptop 1280', width: 1280, height: 720, touch: false },
];

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ viewport: { width: size.width, height: size.height }, hasTouch: size.touch, isMobile: size.touch && size.width < 1024 });

    for (const path of PAGES) {
      test(`${path} fits`, async ({ page }) => {
        await page.goto(path);
        // The dev server injects the stylesheet after `load` on a cold compile.
        await page.waitForLoadState('networkidle');
        const report = await page.evaluate(() => {
          const width = document.documentElement.clientWidth;
          const shown = (el: Element) => {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('.sr-only, [aria-hidden="true"]');
          };
          const smallFields = matchMedia('(pointer: coarse)').matches
            ? [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([type=file]), select, textarea')]
                .filter((el) => shown(el) && parseFloat(getComputedStyle(el).fontSize) < 16)
                .map((el) => el.id || el.getAttribute('name') || el.tagName)
            : [];
          const tinyText: string[] = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const parent = node.parentElement;
            if (!parent || (node.textContent ?? '').trim().length < 2 || !shown(parent) || parent.closest('script, style, svg, nextjs-portal')) continue;
            if (parseFloat(getComputedStyle(parent).fontSize) < 12) tinyText.push((node.textContent ?? '').trim().slice(0, 30));
          }
          return { sideways: document.documentElement.scrollWidth - width, smallFields, tinyText: tinyText.slice(0, 5) };
        });
        expect(report.sideways, 'the page scrolls sideways').toBeLessThanOrEqual(1);
        expect(report.smallFields, 'form fields below 16px on a touch screen').toEqual([]);
        expect(report.tinyText, 'visible text below 12px').toEqual([]);
      });
    }
  });
}
