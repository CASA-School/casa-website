import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * The control room (`/admin`, docs/ADMIN_WORKSPACE.md §Today): a week of day
 * rows like FileMaker's home calendar. A task written with a day's "+ Task"
 * key lands on that day and the room comes back to the week; a date opens the
 * day in detail. Signed in as an owner; what the run writes is deleted.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const DAY = '2031-03-05';
const TITLE = 'Control room e2e: ring the agency';

test.describe('control room', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let started: Date;

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(
      `SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`
    );
    test.skip(rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent)
       VALUES ($1, $2, now() + interval '10 minutes', 'e2e:control-room')`,
      [rows[0].id, tokenHash]
    );
    started = (await client.query<{ t: Date }>(`SELECT now() AS t`)).rows[0].t;
  });

  test.afterAll(async () => {
    if (!client) return;
    await client.query(`DELETE FROM day_tasks WHERE title = $1`, [TITLE]);
    await client.query(`DELETE FROM staff_activity WHERE created_at >= $1 AND entity = 'day_task'`, [started]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: 'casa_workspace_session', value: token, url: baseURL! }]);
  });

  test('a week of day rows; a task written on a day stays there; a date opens the day', async ({ page }) => {
    await page.goto(`/admin?week=${DAY}`, { waitUntil: 'networkidle' });
    // FileMaker's week: Sunday to Saturday, with the way back to today.
    await expect(page.getByRole('heading', { name: /Week 10 · 2–8 March 2031/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to today' })).toBeVisible();
    const days = page.locator('article');
    await expect(days).toHaveCount(7);
    await expect(days.first()).toHaveAttribute('aria-label', 'Sunday 2 March');

    const wednesday = page.getByRole('article', { name: 'Wednesday 5 March' });
    await wednesday.getByRole('button', { name: 'Task' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add to the day' });
    await dialog.getByLabel('What needs doing').fill(TITLE);
    await dialog.getByRole('button', { name: 'Add to the day' }).click();

    // Back in the week, and the day's Tasks key now has one behind it.
    await expect(page).toHaveURL(new RegExp(`/admin\\?week=${DAY}`));
    await expect(page.getByRole('article', { name: 'Wednesday 5 March' }).getByRole('link', { name: /Tasks\s*\|\s*1/ })).toBeVisible();

    await page.getByRole('article', { name: 'Wednesday 5 March' }).getByRole('link', { name: /05\.03\.31/ }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/day\\?date=${DAY}`));
    await expect(page.getByRole('heading', { name: 'Wednesday 5 March', level: 1 })).toBeVisible();
    await expect(page.getByText(TITLE)).toBeVisible();
  });
});
