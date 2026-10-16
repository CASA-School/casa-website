import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * Carry-over (2026-10-16, migration 0030): a booking paid over hands its credit to the same
 * learner's next booking. Both bookings show the line, each naming the other; the first turns green,
 * the second shows what is still open; more than the credit is refused; and voiding the line on one
 * side voids it on both, so the credit is back where it was.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('carry-over', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let personId = '';
  let sourceId = '';
  let targetId = '';

  const book = async (start: number, end: number, charged: number) => {
    const id = (await client.query<{ id: string }>(`INSERT INTO bookings (person_id, status) VALUES ($1, 'confirmed') RETURNING id`, [personId])).rows[0].id;
    await client.query(`INSERT INTO booking_periods (booking_id, start_date, end_date) VALUES ($1, current_date + $2::int, current_date + $3::int)`, [id, start, end]);
    await client.query(`INSERT INTO booking_charges (booking_id, kind, description, amount) VALUES ($1, 'tuition', 'Kurspreis', $2)`, [id, charged]);
    return id;
  };

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '10 minutes', 'e2e:carryover')`,
      [rows[0].id, tokenHash]
    );
    personId = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Gus', 'Guthabentest', 'e2e') RETURNING id`)).rows[0].id;
    // 940 € charged, 1,200 € paid: 260 € credit. The next course: 940 €, nothing paid yet.
    sourceId = await book(-50, 5, 940);
    await client.query(`INSERT INTO payments (booking_id, amount, method, subject) VALUES ($1, 1200, 'transfer', 'Kurspreis')`, [sourceId]);
    targetId = await book(8, 63, 940);
  });

  test.afterAll(async () => {
    if (!client) return;
    const ids = [sourceId, targetId].filter(Boolean);
    if (ids.length) {
      await client.query(`DELETE FROM staff_activity WHERE entity = 'booking' AND entity_id = ANY($1::uuid[])`, [ids]);
      // Payments hold their bookings (ON DELETE RESTRICT), the carry-over's on both sides.
      await client.query(`DELETE FROM payments WHERE booking_id = ANY($1::uuid[])`, [ids]);
      await client.query(`DELETE FROM bookings WHERE id = ANY($1::uuid[])`, [ids]);
    }
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

  test('the credit moves to the next booking, recorded on both, and a void undoes both', async ({ page }) => {
    const light = page.locator('[data-light]').first();
    const payments = page.getByRole('heading', { name: 'Zahlungen' }).locator('xpath=ancestor::section[1]');
    const dialog = page.getByRole('dialog');

    // More than the credit is refused.
    await page.goto(`/admin/bookings/${sourceId}`);
    await payments.getByRole('button', { name: 'Guthaben übertragen' }).click();
    await dialog.getByLabel('Betrag').fill('500');
    await dialog.getByRole('button', { name: 'Guthaben übertragen' }).click();
    await expect(page.getByText('Der Betrag ist höher als das Guthaben dieser Buchung.')).toBeVisible();

    // The whole credit, which the amount starts at.
    await page.goto(`/admin/bookings/${sourceId}`);
    await payments.getByRole('button', { name: 'Guthaben übertragen' }).click();
    await expect(dialog.getByLabel('Betrag')).toHaveValue('260.00');
    await dialog.getByRole('button', { name: 'Guthaben übertragen' }).click();
    await expect(light).toHaveAttribute('data-light', 'ok');
    await expect(payments).toContainText('-260,00 €');
    await expect(payments.getByRole('button', { name: 'Guthaben übertragen' })).toHaveCount(0);

    // The other side: the line names where it came from, and 680 € are still open.
    await payments.getByRole('link', { name: /^Buchung ab/ }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/bookings/${targetId}`));
    await expect(light).toHaveAttribute('data-light', 'unclear');
    await expect(light).toContainText('680,00 € offen');
    await expect(payments).toContainText('Guthaben übertragen');
    await expect(page.getByText('hat 260,00 € Guthaben von einer anderen Buchung übertragen')).toBeVisible();

    // Voided here, voided there: the credit is back on the first booking.
    await payments.getByRole('button', { name: 'Stornieren' }).click();
    await dialog.getByRole('button', { name: 'Stornieren' }).click();
    await expect(light).toContainText('940,00 € offen');
    await page.goto(`/admin/bookings/${sourceId}`);
    await expect(payments.getByRole('button', { name: 'Guthaben übertragen' })).toBeVisible();
  });
});
