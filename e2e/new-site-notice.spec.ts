import { expect, test } from '@playwright/test';

/**
 * The "new website" notice (config/site-notice.ts): it waits until the visitor
 * has scrolled past the hero, sends feedback to the contact form on its own
 * topic, and stays closed for the rest of the visit without storing anything.
 */

test.use({ viewport: { width: 1280, height: 720 } });

// While it waits for the scroll it is transparent and inert.
const notice = (page: import('@playwright/test').Page) => page.locator('aside[aria-label="About our new website"]');

test('appears only past the hero and leads to the contact form on website feedback', async ({ page }) => {
  await page.goto('/en/accommodation');
  await expect(notice(page)).toHaveAttribute('inert', '');

  await page.mouse.wheel(0, 500);
  await expect(notice(page)).not.toHaveAttribute('inert');
  const link = page.getByRole('link', { name: 'Let us know' });

  await link.click();
  await expect(page).toHaveURL(/\/en\/contact\?topic=website-feedback$/);
  await expect(page.getByRole('radio', { name: 'Website feedback' })).toBeChecked();
  await expect(notice(page)).toHaveCount(0);
});

test('stays closed for the visit and writes nothing to browser storage', async ({ page }) => {
  await page.goto('/en/accommodation');
  await page.mouse.wheel(0, 500);
  await page.getByRole('button', { name: 'Close this notice' }).click();
  await expect(notice(page)).toHaveCount(0);

  await page.getByRole('link', { name: 'Go to CASA homepage' }).first().click();
  await page.waitForURL(/\/en$/);
  await page.mouse.wheel(0, 600);
  await expect(notice(page)).toHaveCount(0);

  const stored = await page.evaluate(() => localStorage.length + sessionStorage.length);
  expect(stored).toBe(0);
});

test('the plain contact form keeps its six topics', async ({ page }) => {
  await page.goto('/en/contact');
  await expect(page.getByRole('radio')).toHaveCount(6);
  await expect(page.getByRole('radio', { name: 'Website feedback' })).toHaveCount(0);
});
