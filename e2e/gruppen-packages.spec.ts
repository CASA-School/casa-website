import { expect, test } from '@playwright/test';

/**
 * CASA Gruppen package dialogs.
 *
 * The four package cards open a dialog carrying that programme's full detail,
 * rather than expanding it inline. Esel is the exception: its dialog hands off
 * to the builder, which stays on the page because it is a task, not a read.
 */

const ROUTE = '/courses/german-for-groups';

test('a package card opens a dialog named after the package', async ({ page }) => {
  await page.goto(ROUTE);

  await page.locator('li#katze button').first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // Radix derives the accessible name from DialogTitle, which renders the
  // localized descriptor. A synthesised English label would not survive DE.
  await expect(dialog).toHaveAccessibleName(/2 Week Explorer/i);
  await expect(dialog.getByText('Klimahaus Bremerhaven')).toBeVisible();
});

test('Escape closes the dialog and returns focus to the card that opened it', async ({ page }) => {
  await page.goto(ROUTE);

  const trigger = page.locator('li#katze button').first();
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('a drag that starts inside the panel and ends on the backdrop does not close it', async ({
  page,
}) => {
  await page.goto(ROUTE);
  await page.locator('li#katze button').first().click();

  const dialog = page.getByRole('dialog');
  const box = await dialog.boundingBox();
  if (!box) throw new Error('dialog has no bounding box');

  // Selecting text and releasing outside the panel is the classic naive-modal
  // regression: a click listener on the overlay fires on the common ancestor.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(5, box.y + box.height / 2);
  await page.mouse.up();

  await expect(dialog).toBeVisible();
});

test('the Esel dialog contains the builder, and the page does not', async ({ page }) => {
  await page.goto(ROUTE);

  // A configurator is a task somebody chooses to start — it must not occupy the
  // page before anyone has asked for it.
  await expect(page.getByRole('button', { name: '3 weeks' })).toHaveCount(0);

  await page.locator('li#esel button').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: '3 weeks' })).toBeVisible();
});

test('the running total reacts to a change and stays on screen', async ({ page }) => {
  await page.goto(ROUTE);
  await page.locator('li#esel button').first().click();

  const dialog = page.getByRole('dialog');
  const total = dialog.getByRole('status');
  await expect(total).toBeInViewport();
  const before = await total.innerText();

  await dialog.getByRole('checkbox', { name: /Lunch at the canteen/i }).uncheck();

  await expect(total).not.toHaveText(before);
  // The bar must not have scrolled away while the body above it changed.
  await expect(total).toBeInViewport();
});
