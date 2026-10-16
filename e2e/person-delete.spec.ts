import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * Deleting a person (2026-10-16). It hides the record, never erases it: a learner with bookings
 * cannot be deleted (their bookings and payments would drop out of every list), and one without is
 * deleted, found again under Teilnehmende → „Gelöscht" with who did it, and restored from there.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('deleting and restoring a person', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let bookedId = '';
  let bookingId = '';
  let plainId = '';
  let ownerName = '';

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string; name: string }>(`SELECT id, name FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    ownerName = rows[0].name;
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '10 minutes', 'e2e:delete')`,
      [rows[0].id, tokenHash]
    );
    const person = async (first: string, last: string) =>
      (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ($1, $2, 'e2e') RETURNING id`, [first, last])).rows[0].id;
    bookedId = await person('Bodo', 'Gebuchttest');
    bookingId = (await client.query<{ id: string }>(`INSERT INTO bookings (person_id, status) VALUES ($1, 'confirmed') RETURNING id`, [bookedId])).rows[0].id;
    plainId = await person('Lina', 'Löschtest');
  });

  test.afterAll(async () => {
    if (!client) return;
    const ids = [bookedId, plainId].filter(Boolean);
    await client.query(`DELETE FROM staff_activity WHERE entity = 'person' AND entity_id = ANY($1::uuid[])`, [ids]);
    if (bookingId) await client.query(`DELETE FROM bookings WHERE id = $1`, [bookingId]);
    await client.query(`DELETE FROM people WHERE id = ANY($1::uuid[])`, [ids]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  test('a learner with bookings has no delete', async ({ page }) => {
    await page.goto(`/admin/people/${bookedId}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bodo Gebuchttest');
    await expect(page.getByRole('button', { name: 'Person löschen' })).toHaveCount(0);
  });

  test('deleted, found under „Gelöscht" with who did it, and restored', async ({ page }) => {
    await page.goto(`/admin/people/${plainId}`);
    await page.getByRole('button', { name: 'Person löschen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Löschen', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/people$/);

    await page.goto(`/admin/people?q=${encodeURIComponent('Löschtest')}`);
    await expect(page.getByRole('row').filter({ hasText: 'Lina Löschtest' })).toHaveCount(0);

    await page.goto(`/admin/people?view=deleted&q=${encodeURIComponent('Löschtest')}`);
    const row = page.getByRole('row').filter({ hasText: 'Lina Löschtest' });
    await expect(row).toContainText('Heute');
    await expect(row).toContainText(ownerName);
    await row.getByRole('button', { name: 'Wiederherstellen' }).click();

    await expect(page).toHaveURL(new RegExp(`/admin/people/${plainId}`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lina Löschtest');
    await page.goto(`/admin/people?q=${encodeURIComponent('Löschtest')}`);
    await expect(page.getByRole('row').filter({ hasText: 'Lina Löschtest' })).toHaveCount(1);
  });
});
