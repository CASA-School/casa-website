import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * Who lives in which room of CASA's flats, four weeks at a time (2026-10-19): opened from the
 * Tagesplan and from Unterkünfte; a flat with its rooms, a learner's stay as a bar in their room — two
 * stays one after the other as one —, found by name, and opened at the side with the way to the booking.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything it makes is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('WG-Belegung', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let flatId = '';
  let personId = '';
  let bookingId = '';
  const stamp = randomBytes(3).toString('hex');
  const flat = `Test-WG ${stamp}`;

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:occupancy')`,
      [rows[0].id, tokenHash]
    );
    // „Aaa" first, so the flat is the first band and in view.
    flatId = (await client.query<{ id: string }>(`INSERT INTO accommodations (name, kind, is_active) VALUES ($1, 'casa_flat', true) RETURNING id`, [`Aaa ${flat}`])).rows[0].id;
    const room = (await client.query<{ id: string }>(`INSERT INTO accommodation_rooms (accommodation_id, name, room_type_code, beds) VALUES ($1, 'Zimmer Süd', 'double', 2) RETURNING id`, [flatId])).rows[0].id;
    personId = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Wilma', 'Wohntest', 'e2e') RETURNING id`)).rows[0].id;
    bookingId = (await client.query<{ id: string }>(`INSERT INTO bookings (person_id, status) VALUES ($1, 'confirmed') RETURNING id`, [personId])).rows[0].id;
    // Two stays one after the other, as SchoolMan writes an extension: one bar.
    await client.query(
      `INSERT INTO booking_stays (booking_id, starts_on, ends_on, accommodation_id, room_id)
       VALUES ($1, current_date - 3, current_date + 4, $2, $3), ($1, current_date + 4, current_date + 12, $2, $3)`,
      [bookingId, flatId, room]
    );
  });

  test.afterAll(async () => {
    if (!client) return;
    if (bookingId) await client.query(`DELETE FROM booking_stays WHERE booking_id = $1`, [bookingId]);
    if (bookingId) await client.query(`DELETE FROM bookings WHERE id = $1`, [bookingId]);
    if (personId) await client.query(`DELETE FROM people WHERE id = $1`, [personId]);
    if (flatId) await client.query(`DELETE FROM accommodations WHERE id = $1`, [flatId]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  test('from the Tagesplan: the flat, the room, one bar for the stay, found by name and opened at the side', async ({ page }) => {
    await page.goto('/admin/day');
    await page.getByRole('link', { name: 'WG-Belegung' }).click();
    await expect(page).toHaveURL(/\/admin\/accommodation\/occupancy\?date=\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByRole('heading', { level: 1, name: 'WG-Belegung' })).toBeVisible();
    await expect(page.getByText(`Aaa ${flat}`)).toBeVisible();
    await expect(page.getByText('Zimmer Süd')).toBeVisible();
    await expect(page.getByText('Doppelzimmer · 2 Betten').first()).toBeVisible();

    const bar = page.getByRole('button', { name: /^Wilma Wohntest/ });
    await expect(bar).toHaveCount(1);
    await page.getByPlaceholder('Name oder Gruppe').fill('Wohntest');
    await bar.click();
    const panel = page.getByRole('dialog', { name: 'Wilma Wohntest' });
    await expect(panel).toContainText(`Aaa ${flat} · Zimmer Süd`);
    await expect(panel).toContainText('15');
    await panel.getByRole('link', { name: 'Zur Buchung' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/bookings/${bookingId}$`));
  });

  test('from Unterkünfte, and the weeks move', async ({ page }) => {
    await page.goto('/admin/accommodation');
    await page.getByRole('link', { name: 'WG-Belegung' }).first().click();
    await expect(page).toHaveURL(/\/admin\/accommodation\/occupancy$/);
    await page.getByRole('link', { name: 'Eine Woche vor' }).click();
    await expect(page).toHaveURL(/\/admin\/accommodation\/occupancy\?date=\d{4}-\d{2}-\d{2}$/);
    await page.getByRole('link', { name: 'Diese Woche' }).click();
    await expect(page).toHaveURL(/\/admin\/accommodation\/occupancy$/);
  });
});
