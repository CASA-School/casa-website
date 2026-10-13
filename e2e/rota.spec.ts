import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * The rota (docs/ADMIN_WORKSPACE.md §Rota), planned by a signed-in owner in a
 * week far ahead so it meets nobody's real shifts: a shift covers reception,
 * an absence on the same day un-covers it and marks the clash, and clearing
 * the shift empties the cell. Everything the run writes is deleted afterwards.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const MONDAY = '2031-03-03';
const FRIDAY = '2031-03-07';

test.describe('rota', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let owner = { id: '', name: '' };
  let started: Date;

  const clean = async () => {
    await client.query(`DELETE FROM staff_shifts WHERE on_date BETWEEN $1 AND $2`, [MONDAY, FRIDAY]);
    await client.query(`DELETE FROM staff_absences WHERE from_date BETWEEN $1 AND $2`, [MONDAY, FRIDAY]);
  };

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`
    );
    test.skip(rows.length === 0, 'no owner account');
    owner = rows[0];
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent)
       VALUES ($1, $2, now() + interval '10 minutes', 'e2e:rota')`,
      [owner.id, tokenHash]
    );
    started = (await client.query<{ t: Date }>(`SELECT now() AS t`)).rows[0].t;
    await clean();
  });

  test.afterAll(async () => {
    if (!client) return;
    await clean();
    await client.query(`DELETE FROM staff_activity WHERE entity = 'rota' AND created_at >= $1`, [started]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: 'casa_workspace_session', value: token, url: baseURL! }]);
  });

  test('a shift covers reception, an absence that day undoes it, clearing empties the cell', async ({ page }) => {
    await page.goto(`/admin/rota?week=${MONDAY}`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Rota', level: 1 })).toBeVisible();
    await expect(page.getByText('Week 10')).toBeVisible();
    // A week nobody planned raises no alarms.
    await expect(page.getByText('Covered')).toHaveCount(0);

    const monday = page.getByRole('button', { name: `${owner.name}, Monday 3 Mar: change` });
    await monday.click();
    const panel = page.getByRole('dialog', { name: `${owner.name}, Monday 3 Mar` });
    await panel.getByLabel('From').selectOption('08:30');
    await panel.getByLabel('To').selectOption('19:00');
    await panel.getByLabel('Note').fill('Opening the office');
    await panel.getByRole('button', { name: 'Plan the shift' }).click();

    await expect(monday).toContainText('08:30–19:00');
    await expect(monday).toContainText('Opening the office');
    // Monday is covered; the rest of the week is now visibly open.
    await expect(page.getByText('Covered')).toHaveCount(1);
    await expect(page.getByText('08:30–19:00 open')).toHaveCount(3);
    await expect(page.getByText('08:30–13:00 open')).toHaveCount(1);

    await page.getByRole('button', { name: 'Add an absence' }).click();
    const form = page.getByRole('dialog', { name: 'An absence' });
    await form.getByLabel('Colleague').selectOption({ label: owner.name });
    await form.getByLabel('Reason').selectOption('sick');
    await form.getByRole('button', { name: 'Record the absence' }).click();

    // The shift is still planned, but its colleague will not be there.
    await expect(monday).toContainText('Sick');
    await expect(page.getByText('Covered')).toHaveCount(0);
    await expect(page.getByText('08:30–19:00 open')).toHaveCount(4);
    await expect(page.getByRole('row', { name: new RegExp(owner.name) }).filter({ hasText: 'Sick' })).toBeVisible();

    await monday.click();
    await page.getByRole('dialog', { name: `${owner.name}, Monday 3 Mar` }).getByRole('button', { name: 'Clear the shift' }).click();
    await expect(monday).not.toContainText('08:30');
    await expect(monday).toContainText('Sick');
  });
});
