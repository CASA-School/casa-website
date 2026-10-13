import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * The workspace search (⌘K, at the top of the sidebar, src/lib/admin/search.ts): a name
 * finds the student, an offer number the offer, and Enter opens it. Runs only
 * with a database and an owner account, who holds every module; the session is
 * opened the way `scripts/admin/check-routes.mjs` does it.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('workspace search', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let person: { id: string; first_name: string; last_name: string | null } | undefined;
  let offer: { id: string; number: string } | undefined;

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const owner = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(owner.rows.length === 0, 'no owner account');
    person = (
      await client.query(`SELECT id, first_name, last_name FROM people WHERE deleted_at IS NULL AND merged_into IS NULL AND length(first_name) > 2 ORDER BY updated_at DESC LIMIT 1`)
    ).rows[0];
    offer = (await client.query(`SELECT id, year || '-' || lpad(seq::text, 3, '0') AS number FROM offers WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1`)).rows[0];
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '10 minutes', 'e2e:search')`,
      [owner.rows[0].id, tokenHash]
    );
  });

  test.afterAll(async () => {
    if (!client) return;
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: 'casa_workspace_session', value: token, url: baseURL! }]);
  });

  test('a name finds the student, an offer number the offer, and Enter opens it', async ({ page }) => {
    test.skip(!person, 'no person in the database');
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await page.keyboard.press('ControlOrMeta+k');
    const box = page.getByRole('textbox', { name: 'Search the workspace' });
    await box.fill(person!.first_name);
    const results = page.getByRole('listbox', { name: 'Results' });
    await expect(results.getByText('Students', { exact: true })).toBeVisible();
    await expect(results).toContainText(person!.first_name);

    if (offer) {
      await box.fill(offer.number);
      await expect(results.getByText('Offers', { exact: true })).toBeVisible();
      await box.press('Enter');
      await expect(page).toHaveURL(new RegExp(`/admin/offers/${offer.id}$`));
    }
  });
});
