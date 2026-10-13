import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * The price list (Settings → Prices, docs/CATALOGUE_AND_PRICING.md §Price lists):
 * next year's list is prepared as a copy, a price is changed in it without
 * touching the list in force, and the list is deleted again.
 *
 * Runs only with a database, an owner and no list prepared yet; the session is
 * opened the way `scripts/admin/check-routes.mjs` does it, and whatever the
 * run leaves is removed afterwards.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('prices', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let started: Date;
  let next = '';

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const owner = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(owner.rows.length === 0, 'no owner account');
    const future = await client.query(`SELECT 1 FROM rates WHERE valid_from > current_date LIMIT 1`);
    test.skip(future.rows.length > 0, 'a future price list exists already');
    next = `${new Date().getFullYear() + 1}-01-01`;
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '10 minutes', 'e2e:prices')`,
      [owner.rows[0].id, tokenHash]
    );
    started = (await client.query<{ t: Date }>(`SELECT now() AS t`)).rows[0].t;
  });

  test.afterAll(async () => {
    if (!client) return;
    if (next) {
      await client.query(`DELETE FROM rates WHERE valid_from = $1 AND created_at >= $2`, [next, started]);
      await client.query(`UPDATE rates SET valid_to = NULL WHERE valid_to = $1::date - 1`, [next]);
    }
    if (started) await client.query(`DELETE FROM staff_activity WHERE entity = 'price_list' AND created_at >= $1`, [started]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: 'casa_workspace_session', value: token, url: baseURL! }]);
  });

  test('next year is prepared as a copy, changed on its own, and deleted again', async ({ page }) => {
    const year = next.slice(0, 4);
    await page.goto('/admin/settings/prices');
    const fees = page.locator('section', { has: page.getByRole('heading', { name: 'Fees', exact: true }) });
    await expect(fees).toContainText('Enrolment fee');
    const before = (await fees.getByRole('row', { name: /Enrolment fee/ }).innerText()).match(/[\d.,]+\s€/)?.[0];

    await page.getByRole('button', { name: `Prepare ${year}` }).click();
    await page.getByRole('button', { name: 'Prepare the list' }).click();
    await expect(page).toHaveURL(new RegExp(`list=${next}`));
    await expect(page.getByText('Not yet in force')).toBeVisible();

    await fees.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Enrolment fee').fill('61');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('1 price saved.')).toBeVisible();
    await expect(fees.getByRole('row', { name: /Enrolment fee/ })).toContainText('61,00 €');

    // The list in force keeps its price.
    await page.getByRole('navigation', { name: 'Price lists' }).getByRole('link').first().click();
    await expect(fees.getByRole('row', { name: /Enrolment fee/ })).toContainText(before!);

    await page.goto(`/admin/settings/prices?list=${next}`);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: 'Delete the list' }).click();
    await expect(page.getByRole('navigation', { name: 'Price lists' })).toHaveCount(0);
    const { rows } = await client.query(`SELECT 1 FROM rates WHERE valid_from = $1`, [next]);
    expect(rows).toHaveLength(0);
  });
});
