import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * Where a learner stands (2026-10-16): FileMaker's Rookie, Runner, LastDance and Unicorn, worked out
 * from the booked periods. A learner in a course with nothing after it stands „Ohne Folgekurs" — in that
 * view of the register and in the head of their page — and the moment a further period is booked, they
 * are simply in a course. „Im Kurs" holds them either way (2026-10-18: everyone in a course today).
 *
 * Runs only with a database and an owner account, in German (pinned). Everything is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('learner stages', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let personId = '';
  const bookingIds: string[] = [];

  const book = async (start: number, end: number) => {
    const id = (await client.query<{ id: string }>(`INSERT INTO bookings (person_id, status) VALUES ($1, 'confirmed') RETURNING id`, [personId])).rows[0].id;
    await client.query(`INSERT INTO booking_periods (booking_id, start_date, end_date) VALUES ($1, current_date + $2::int, current_date + $3::int)`, [id, start, end]);
    bookingIds.push(id);
  };

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '10 minutes', 'e2e:stages')`,
      [rows[0].id, tokenHash]
    );
    personId = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Lea', 'Stufentest', 'e2e') RETURNING id`)).rows[0].id;
    // In a course for two months already, ending in ten days, nothing after it.
    await book(-60, 10);
  });

  test.afterAll(async () => {
    if (!client) return;
    if (bookingIds.length) await client.query(`DELETE FROM bookings WHERE id = ANY($1::uuid[])`, [bookingIds]);
    if (personId) await client.query(`DELETE FROM people WHERE id = $1`, [personId]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  test('no next course until something is booked after it, then in a course', async ({ page }) => {
    await page.goto(`/admin/people?view=last&q=${encodeURIComponent('Stufentest')}`);
    await expect(page.getByRole('row').filter({ hasText: 'Lea Stufentest' })).toBeVisible();
    await page.goto(`/admin/people?view=in_course&q=${encodeURIComponent('Stufentest')}`);
    await expect(page.getByRole('row').filter({ hasText: 'Lea Stufentest' })).toContainText('Ohne Folgekurs');

    await page.goto(`/admin/people/${personId}`);
    await expect(page.locator('h1').locator('xpath=..')).toContainText('Ohne Folgekurs');

    // A further period starting after this one ends: no longer the last course.
    await book(11, 66);
    await page.reload();
    await expect(page.locator('h1').locator('xpath=..')).toContainText('Im Kurs');
    await page.goto(`/admin/people?view=last&q=${encodeURIComponent('Stufentest')}`);
    await expect(page.getByRole('row').filter({ hasText: 'Lea Stufentest' })).toHaveCount(0);
    await page.goto(`/admin/people?view=in_course&q=${encodeURIComponent('Stufentest')}`);
    await expect(page.getByRole('row').filter({ hasText: 'Lea Stufentest' })).toBeVisible();
  });
});
