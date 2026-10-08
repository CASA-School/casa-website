import { expect, test } from '@playwright/test';

const locales = [
  { lang: 'de', label: 'Beispielbild', alt: 'KI-generiertes Beispielbild:', paths: ['/unterkunft', '/unterkunft/wohnen-in-einer-gastfamilie', '/unterkunft/gastfamilie-werden'] },
  { lang: 'en', label: 'Example image', alt: 'AI-generated example image:', paths: ['/en/accommodation', '/en/accommodation/host', '/en/accommodation/become-host'] },
];

for (const locale of locales) {
  for (const width of [390, 1024, 1440]) {
    test(`host-room examples are disclosed in ${locale.lang} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const path of locale.paths) {
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('lang', locale.lang);
        const labels = page.locator('[data-casa-example]:visible');
        const images = page.locator('img[data-casa-illustration]:visible');
        expect(await images.count(), path).toBeGreaterThan(0);
        await expect(labels).toHaveCount(await images.count());
        for (let i = 0; i < await labels.count(); i++) {
          const label = labels.nth(i);
          await expect(label.locator(':scope > span:visible')).toHaveText(locale.label);
          await expect(images.nth(i)).toHaveAttribute('alt', new RegExp(locale.alt));
          const insideFrame = await label.evaluate((element) => {
            const frame = element.parentElement!.getBoundingClientRect();
            const badge = element.getBoundingClientRect();
            return badge.left >= frame.left && badge.right <= frame.right && badge.top >= frame.top && badge.bottom <= frame.bottom;
          });
          expect(insideFrame, `${path}: disclosure stays inside its image frame`).toBe(true);
        }
        await expect(page.locator('img[alt=""][data-casa-illustration]')).toHaveCount(0);
        await expect(page.locator('[data-casa-placeholder]:visible')).toHaveCount(0);
      }
    });
  }
}

test('shared-flat photographs retain their real-photo treatment', async ({ page }) => {
  await page.goto('/en/accommodation/flat');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('[data-casa-example]')).toHaveCount(0);
});
