import { expect, test } from '@playwright/test';

/**
 * Search and CLARA read one knowledge index of the site (docs/CLARA_AND_SEARCH.md).
 * A price question is answered with the live value, a typo gets a suggestion,
 * and CLARA answers from the site in du.
 */

test('the search page answers a price question directly', async ({ page }) => {
  await page.goto(`/suche?q=${encodeURIComponent('Was kostet der Intensivkurs?')}&scope=all`);
  const answer = page.locator('section[aria-labelledby="search-answer"]');
  await expect(answer).toBeVisible();
  await expect(answer).toContainText('520');
  await expect(answer.getByRole('link')).toHaveAttribute('href', '/sprachkurse/deutsch-intensiv');
});

test('the header search forgives a typo', async ({ page }) => {
  await page.goto('/sprachkurse');
  await page.getByTestId('header-search-trigger').click();
  await page.locator('#header-search-query').fill('untrekunft');
  const popover = page.locator('#header-search-popover');
  await expect(popover.getByRole('button', { name: 'unterkunft', exact: false })).toBeVisible();
  await expect(popover.locator('a[href*="unterkunft"]').first()).toBeVisible();
});

test('CLARA answers a price with the live value', async ({ page }) => {
  await page.goto('/sprachkurse/deutsch-intensiv');
  await page.getByLabel('Open CLARA assistant').click();
  const input = page.getByPlaceholder('Frag CLARA alles zu CASA …');
  await input.fill('Was kostet das für 8 Wochen?');
  await input.press('Enter');
  await expect(page.getByText(/kostet 520\s€ für 4 Wochen, 940\s€ für 8 Wochen/)).toBeVisible();
});
