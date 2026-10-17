import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * The workspace search (⌘K, at the top of the sidebar, src/lib/admin/search.ts): a name
 * finds the student, an offer number the offer, and Enter opens it; a colleague is found under
 * Staff and opens on their staff page, not among the students. Runs only
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
  let colleague: { id: string; first_name: string; last_name: string } | undefined;

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const owner = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(owner.rows.length === 0, 'no owner account');
    person = (
      await client.query(
        `SELECT id, first_name, last_name FROM people p WHERE deleted_at IS NULL AND merged_into IS NULL AND length(first_name) > 2
            AND NOT EXISTS (SELECT 1 FROM staff_members s WHERE s.person_id = p.id) ORDER BY updated_at DESC LIMIT 1`
      )
    ).rows[0];
    colleague = (
      await client.query(
        `SELECT s.id, p.first_name, p.last_name FROM staff_members s JOIN people p ON p.id = s.person_id
          WHERE s.is_active AND length(coalesce(p.last_name, '')) > 2 ORDER BY p.last_name LIMIT 1`
      )
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
    // The workspace speaks German by default; these assertions read its English.
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'en', url: baseURL! },
    ]);
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

  test('a colleague is found under Staff and opens on their staff page', async ({ page }) => {
    test.skip(!colleague, 'no colleague on the staff register');
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await page.keyboard.press('ControlOrMeta+k');
    await page.getByRole('textbox', { name: 'Search the workspace' }).fill(colleague!.last_name);
    const results = page.getByRole('listbox', { name: 'Results' });
    const staff = results.locator('div').filter({ has: page.getByText('Staff', { exact: true }) });
    const name = `${colleague!.first_name} ${colleague!.last_name}`;
    await expect(staff.getByRole('option').filter({ hasText: name })).toHaveCount(1);
    const students = results.locator('div').filter({ has: page.getByText('Students', { exact: true }) });
    await expect(students.getByRole('option').filter({ hasText: name })).toHaveCount(0);
    await staff.getByRole('option').filter({ hasText: name }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/staff/${colleague!.id}$`));
  });
});
