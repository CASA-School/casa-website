import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * A booking's colour (2026-10-16, docs/schoolman/bookings.md): grey „Unklar" until paid in full,
 * yellow while a colleague has it under observation — with the reason in its head, in the list's
 * „Unter Beobachtung" view and in its history — and green once the money is in.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything it makes is
 * deleted afterwards.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('booking colours', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let personId = '';
  let bookingId = '';

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
       VALUES ($1, $2, now() + interval '10 minutes', 'e2e:bookings')`,
      [rows[0].id, tokenHash]
    );
    personId = (
      await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Bea', 'Buchungstest', 'e2e') RETURNING id`)
    ).rows[0].id;
    bookingId = (
      await client.query<{ id: string }>(`INSERT INTO bookings (person_id, status) VALUES ($1, 'confirmed') RETURNING id`, [personId])
    ).rows[0].id;
    await client.query(
      `INSERT INTO booking_periods (booking_id, start_date, end_date) VALUES ($1, current_date - 7, current_date + 40)`,
      [bookingId]
    );
    await client.query(
      `INSERT INTO booking_charges (booking_id, kind, description, amount) VALUES ($1, 'tuition', 'Kurspreis 8 Wochen', 940)`,
      [bookingId]
    );
  });

  test.afterAll(async () => {
    if (!client) return;
    if (bookingId) {
      await client.query(`DELETE FROM staff_activity WHERE entity = 'booking' AND entity_id = $1`, [bookingId]);
      // Payments hold their booking (ON DELETE RESTRICT: money is never deleted by a cascade).
      await client.query(`DELETE FROM payments WHERE booking_id = $1`, [bookingId]);
      await client.query(`DELETE FROM bookings WHERE id = $1`, [bookingId]);
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

  test('grey until paid, yellow under observation with its reason, green when all is in', async ({ page }) => {
    const light = page.locator('[data-light]').first();

    await page.goto(`/admin/bookings/${bookingId}`);
    await expect(light).toHaveAttribute('data-light', 'unclear');
    await expect(light).toContainText('Unklar');

    // Yellow, with the reason, in the head, the list and the history.
    await page.getByRole('button', { name: 'Beobachten' }).click();
    await page.getByRole('radio', { name: 'Niveau' }).check();
    await page.getByRole('textbox', { name: 'Notiz' }).fill('Kommt eher aus A2.');
    await page.getByRole('button', { name: 'Unter Beobachtung stellen' }).click();
    await expect(light).toHaveAttribute('data-light', 'watch');
    await expect(light).toContainText('Niveau');
    await expect(page.getByText('hat die Buchung unter Beobachtung gestellt')).toBeVisible();

    await page.goto('/admin/bookings?filter=watch');
    await expect(page.getByRole('row').filter({ hasText: 'Bea Buchungstest' })).toContainText('Niveau');

    // Ended: the colour is the money's again.
    await page.goto(`/admin/bookings/${bookingId}`);
    await page.getByRole('button', { name: 'Beobachtung beenden' }).click();
    await expect(light).toHaveAttribute('data-light', 'unclear');

    // Paid in full: green, with nobody changing a status.
    await client.query(
      `INSERT INTO payments (booking_id, amount, method, subject) VALUES ($1, 940, 'transfer', 'Kurspreis')`,
      [bookingId]
    );
    await page.reload();
    await expect(light).toHaveAttribute('data-light', 'ok');
    await expect(light).toContainText('In Ordnung');
  });
});
