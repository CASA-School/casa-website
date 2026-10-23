import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * A booking's colour (2026-10-16, docs/schoolman/bookings.md): grey („Offen", „Anzahlung erhalten") until paid in full,
 * yellow while a colleague has it under observation — chosen from the colour itself, on the booking's
 * page or the learner's, from SchoolMan's three: in order, under observation, cancelled (2026-10-18) —
 * and green once the money is in. Cancelling from the colour asks once more.
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

  test('the books: red until handed out at the desk, green after, and back', async ({ page }) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO booking_charges (booking_id, kind, description, amount) VALUES ($1, 'books', 'Bücher · Netzwerk neu A2.1', 26.99) RETURNING id`,
      [bookingId]
    );
    await page.goto(`/admin/bookings/${bookingId}`);
    await page.getByRole('button', { name: 'Bücher · Netzwerk neu A2.1: nicht ausgegeben' }).click();
    await expect(page.getByRole('button', { name: 'Bücher · Netzwerk neu A2.1: ausgegeben' })).toBeVisible();
    await expect.poll(async () => (await client.query<{ handed_out: boolean }>(`SELECT handed_out FROM booking_charges WHERE id = $1`, [rows[0].id])).rows[0].handed_out).toBe(true);
    await page.reload();
    await page.getByRole('button', { name: 'Bücher · Netzwerk neu A2.1: ausgegeben' }).click();
    await expect.poll(async () => (await client.query<{ handed_out: boolean }>(`SELECT handed_out FROM booking_charges WHERE id = $1`, [rows[0].id])).rows[0].handed_out).toBe(false);
    await client.query(`DELETE FROM booking_charges WHERE id = $1`, [rows[0].id]);
  });

  test('grey until paid, yellow under observation, green when all is in, red when cancelled', async ({ page }) => {
    const light = page.locator('[data-light]').first();

    await page.goto(`/admin/bookings/${bookingId}`);
    await expect(light).toHaveAttribute('data-light', 'unclear');
    // The grey says what it is (2026-10-17): nothing has come in yet.
    await expect(light).toContainText('Offen');

    // Yellow, chosen from the colour — one choice, as in SchoolMan — in the head, on the list's dot and in the history.
    await page.getByRole('button', { name: /^Farbe: Offen/ }).click();
    await page.getByRole('dialog', { name: 'Farbe der Buchung' }).getByRole('button', { name: 'Unter Beobachtung' }).click();
    await expect(light).toHaveAttribute('data-light', 'watch');
    await expect(page.getByText('hat die Buchung unter Beobachtung gestellt')).toBeVisible();

    // Found by its number, which stands beside the course.
    const number = (await client.query<{ number: string }>(`SELECT number FROM bookings WHERE id = $1`, [bookingId])).rows[0].number;
    expect(number).toMatch(/^B-\d{4}-\d{4}$/);
    await expect(page.getByText(number)).toBeVisible();
    await page.goto(`/admin/bookings?filter=all&q=${encodeURIComponent(number)}`);
    await expect(page.getByRole('row').filter({ hasText: 'Bea Buchungstest' })).toBeVisible();

    // In the list, the colour before the name, its word on hover.
    await expect(page.getByRole('row').filter({ hasText: 'Bea Buchungstest' }).getByRole('img', { name: 'Unter Beobachtung' })).toBeVisible();

    // On the learner's page the dot changes it too: back to in order, which is grey while nothing is paid.
    await page.goto(`/admin/people/${personId}`);
    await page.getByRole('button', { name: /^Farbe: Unter Beobachtung/ }).first().click();
    const colours = page.getByRole('dialog', { name: 'Farbe der Buchung' });
    await expect(colours.getByRole('button')).toHaveText(['In Ordnung', 'Unter Beobachtung', 'Storniert']);
    await colours.getByRole('button', { name: 'In Ordnung' }).click();
    await expect(page.getByRole('button', { name: /^Farbe: Offen/ }).first()).toBeVisible();

    // Ended: the colour is the money's again.
    await page.goto(`/admin/bookings/${bookingId}`);
    await expect(light).toHaveAttribute('data-light', 'unclear');

    // Paid in full: green, with nobody changing a status.
    await client.query(
      `INSERT INTO payments (booking_id, amount, method, subject) VALUES ($1, 940, 'transfer', 'Kurspreis')`,
      [bookingId]
    );
    await page.reload();
    await expect(light).toHaveAttribute('data-light', 'ok');
    await expect(light).toContainText('In Ordnung');

    // Red from the colour cancels the booking, after asking once more; then the colour opens nothing.
    await page.getByRole('button', { name: /^Farbe: In Ordnung/ }).click();
    await colours.getByRole('button', { name: 'Storniert' }).click();
    await expect(colours.getByText('Buchung stornieren?')).toBeVisible();
    await colours.getByRole('button', { name: 'Stornieren' }).click();
    await expect(light).toHaveAttribute('data-light', 'no');
    await expect(page.getByRole('button', { name: /^Farbe:/ })).toHaveCount(0);
    const cancelled = await client.query<{ status: string }>(`SELECT status FROM bookings WHERE id = $1`, [bookingId]);
    expect(cancelled.rows[0].status).toBe('cancelled');
  });
});
