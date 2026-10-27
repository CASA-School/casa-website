import { expect, test } from '@playwright/test';

/*
 * Every card on the team page opens the same popup, whether or not the colleague
 * shared a bio: a card says nothing about it, the popup simply has less in it.
 */
test('a team card opens that colleague in a popup and gives focus back on close', async ({ page }) => {
  await page.goto('/ueber-uns/casa-team');

  const card = page.getByRole('button', { name: 'Mehr über Natàlia Sostres' });
  await card.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await card.click();

  const dialog = page.getByRole('dialog', { name: 'Natàlia Sostres' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Büroleitung')).toBeVisible();
  await expect(dialog.getByText('Zuständig für')).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Schreib uns' })).toHaveAttribute('href', '/kontakt');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(card).toBeFocused();
});

test('a colleague with no published areas still opens, without an empty row', async ({ page }) => {
  await page.goto('/en/team');

  await page.getByRole('button', { name: 'More about Bettina Rick' }).click();

  const dialog = page.getByRole('dialog', { name: 'Bettina Rick' });
  await expect(dialog.getByText('Managing Director')).toBeVisible();
  await expect(dialog.getByText('Looks after')).toHaveCount(0);
  await expect(dialog.getByText('Languages')).toHaveCount(0);
});
