import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * A booking's colour (2026-10-16, docs/schoolman/bookings.md): grey („Offen", „Anzahlung erhalten") until paid in full,
 * yellow while a colleague has it under observation — chosen from the colour itself, on the booking's
 * page or the learner's (2026-10-18), with the reason in its head, on the list's dot and in its history
 * — and green once the money is in.
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
    // The grey says what it is (2026-10-17): nothing has come in yet.
    await expect(light).toContainText('Offen');

    // Yellow, chosen from the colour, with the reason in the head, on the list's dot and in the history.
    await page.getByRole('button', { name: /^Farbe: Offen/ }).click();
    await page.getByRole('dialog', { name: 'Farbe der Buchung' }).getByRole('button', { name: 'Niveau' }).click();
    await expect(light).toHaveAttribute('data-light', 'watch');
    await expect(light).toContainText('Niveau');
    await expect(page.getByText('hat die Buchung unter Beobachtung gestellt')).toBeVisible();

    // Found by its number, which stands beside the course.
    const number = (await client.query<{ number: string }>(`SELECT number FROM bookings WHERE id = $1`, [bookingId])).rows[0].number;
    expect(number).toMatch(/^B-\d{4}-\d{4}$/);
    await expect(page.getByText(number)).toBeVisible();
    await page.goto(`/admin/bookings?filter=all&q=${encodeURIComponent(number)}`);
    await expect(page.getByRole('row').filter({ hasText: 'Bea Buchungstest' })).toBeVisible();

    // In the list, the colour before the name, its word and reason on hover.
    await expect(page.getByRole('row').filter({ hasText: 'Bea Buchungstest' }).getByRole('img', { name: 'Unter Beobachtung · Niveau' })).toBeVisible();

    // On the learner's page the dot changes it too: „Sonstiges" asks what, then back to the money's colour.
    await page.goto(`/admin/people/${personId}`);
    const dot = page.getByRole('button', { name: /^Farbe: Unter Beobachtung · Niveau/ }).first();
    await dot.click();
    const colours = page.getByRole('dialog', { name: 'Farbe der Buchung' });
    await colours.getByRole('button', { name: 'Sonstiges …' }).click();
    await colours.getByRole('textbox', { name: 'Sonstiges' }).fill('Kommt eher aus A2.');
    await colours.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByRole('button', { name: /^Farbe: Unter Beobachtung · Sonstiges/ }).first()).toBeVisible();
    const note = await client.query<{ observation_reason: string; observation_note: string }>(`SELECT observation_reason, observation_note FROM bookings WHERE id = $1`, [bookingId]);
    expect(note.rows[0]).toEqual({ observation_reason: 'other', observation_note: 'Kommt eher aus A2.' });
    await page.getByRole('button', { name: /^Farbe: Unter Beobachtung/ }).first().click();
    await page.getByRole('dialog', { name: 'Farbe der Buchung' }).getByRole('button', { name: 'Offen' }).click();
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
  });
});
