import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * Follow-ups on a booking (2026-10-18, migration 0062): one is set on a booking's page with its day and
 * reason, the booking is then listed under „Wiedervorlage" once the day has come, and it is marked done.
 *
 * Runs only with a database, an owner account and a booking, in German (pinned). Everything is put back after.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const REASON = 'Folgetest: Visum nachfragen';

test.describe('follow-ups', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');
  test.describe.configure({ mode: 'serial' });

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let booking: { id: string; number: string } | undefined;

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    booking = (
      await client.query<{ id: string; number: string }>(
        // One from SchoolMan, never one another test is making at the same time.
        `SELECT b.id, b.number FROM bookings b JOIN people p ON p.id = b.person_id
          WHERE b.deleted_at IS NULL AND p.deleted_at IS NULL AND b.status <> 'cancelled' AND b.filemaker_booking_id IS NOT NULL
          ORDER BY b.number LIMIT 1`
      )
    ).rows[0];
    test.skip(!booking, 'no booking');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:follow-ups')`,
      [rows[0].id, tokenHash]
    );
  });

  test.afterAll(async () => {
    if (!client) return;
    if (booking) {
      await client.query(`DELETE FROM booking_follow_ups WHERE booking_id = $1 AND reason = $2`, [booking.id, REASON]);
      await client.query(`DELETE FROM staff_activity WHERE entity = 'booking' AND entity_id = $1 AND action IN ('follow_up_added', 'follow_up_done')`, [booking.id]);
    }
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  test('set on the booking’s page, listed once its day has come, and done', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    await page.goto(`/admin/bookings/${booking!.id}`);
    await page.getByRole('button', { name: 'Setzen', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Am', { exact: true }).fill(today);
    await dialog.getByLabel('Am', { exact: true }).press('Tab');
    await dialog.getByLabel('Worum es geht').fill(REASON);
    await dialog.getByRole('button', { name: 'Setzen' }).click();
    await expect(page.getByText(REASON)).toBeVisible();

    await page.goto(`/admin/bookings?filter=followup&q=${encodeURIComponent(booking!.number)}`);
    await expect(page.locator('main')).toContainText(booking!.number);

    await page.goto(`/admin/bookings/${booking!.id}`);
    const row = page.locator('li', { hasText: REASON });
    await row.getByRole('button', { name: 'Erledigt' }).click();
    await expect(page.locator('li', { hasText: REASON })).toHaveCount(0);
    const { rows } = await client.query(`SELECT due_on::text AS due, done_at IS NOT NULL AS done FROM booking_follow_ups WHERE booking_id = $1 AND reason = $2`, [
      booking!.id,
      REASON,
    ]);
    expect(rows).toEqual([{ due: today, done: true }]);
  });
});
