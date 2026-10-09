import { expect, test } from '@playwright/test';

/**
 * German for Medical has no set dates, so its page collects interested people
 * in a popup (config/courses/interest-list.ts) instead of a registration.
 */

const ROUTE = '/en/courses/german-for-medical';

test('the hero button opens the interest list, and its first step needs a level, a day and a time', async ({ page }) => {
  await page.goto(ROUTE);
  await page.getByRole('link', { name: 'Register your interest' }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName(/Register your interest/);
  const next = dialog.getByRole('button', { name: 'Continue' });
  await expect(next).toBeDisabled();

  await dialog.getByRole('radio', { name: 'B2' }).click();
  await dialog.getByRole('checkbox', { name: 'Friday' }).click();
  await expect(next).toBeDisabled();
  await dialog.getByRole('checkbox', { name: 'Afternoons' }).click();
  await expect(next).toBeEnabled();

  await next.click();
  await expect(dialog.getByRole('heading', { name: 'How can we reach you?' })).toBeVisible();
});

test('arriving with #interesse opens the popup', async ({ page }) => {
  await page.goto(`${ROUTE}#interesse`);
  await expect(page.getByRole('dialog')).toBeVisible();
});
