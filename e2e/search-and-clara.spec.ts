import { expect, test } from '@playwright/test';

/**
 * The search reads the site's knowledge index (docs/CLARA_AND_SEARCH.md): a price question is
 * answered with the live value, a typo gets a suggestion. CLARA's own browser test was removed
 * (Rahman, 2026-10-18): on the dev server Next's developer badge sits over its button and took the
 * click; CLARA's answers are measured by `npm run qa:clara`.
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
