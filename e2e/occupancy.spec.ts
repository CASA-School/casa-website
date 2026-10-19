import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * Who lives in which room of CASA's flats, four weeks at a time (2026-10-19): opened from the
 * Tagesplan and from Unterkünfte; a flat with its rooms, a learner's stay as a bar in their room — two
 * stays one after the other as one —, found by name, and opened at the side with the way to the booking.
 * A free bed takes a learner still without a room; a full room refuses one; a learner moves to another
 * room; the flat's band opens the flat; its Putzplan gets a duty, shows it in the weeks, and loses it.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything it makes is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('WG-Belegung', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');
  // Wide enough that the four weeks need no sideways scroll, which would slide a bed under the room column.
  test.use({ viewport: { width: 1680, height: 1000 } });

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let flatId = '';
  let personId = '';
  let bookingId = '';
  let roomId = '';
  let singleId = '';
  let waitingBookingId = '';
  let waitingStayId = '';
  let lateStayId = '';
  let lateBookingId = '';
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
    roomId = room;
    singleId = (await client.query<{ id: string }>(`INSERT INTO accommodation_rooms (accommodation_id, name, room_type_code, beds) VALUES ($1, 'Zimmer Nord', 'single', 1) RETURNING id`, [flatId])).rows[0].id;
    personId = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Wilma', 'Wohntest', 'e2e') RETURNING id`)).rows[0].id;
    bookingId = (await client.query<{ id: string }>(`INSERT INTO bookings (person_id, status) VALUES ($1, 'confirmed') RETURNING id`, [personId])).rows[0].id;
    // Two stays one after the other, as SchoolMan writes an extension: one bar.
    await client.query(
      `INSERT INTO booking_stays (booking_id, starts_on, ends_on, accommodation_id, room_id)
       VALUES ($1, current_date - 3, current_date + 4, $2, $3), ($1, current_date + 4, current_date + 12, $2, $3)`,
      [bookingId, flatId, room]
    );
    // Two learners still without a room in a flat: one to move in, one to be refused by a full room.
    const waiting = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Wanda', 'Wartetest', 'e2e') RETURNING id`)).rows[0].id;
    waitingBookingId = (await client.query<{ id: string }>(`INSERT INTO bookings (person_id, status) VALUES ($1, 'confirmed') RETURNING id`, [waiting])).rows[0].id;
    waitingStayId = (
      await client.query<{ id: string }>(`INSERT INTO booking_stays (booking_id, starts_on, ends_on, accommodation_type_code) VALUES ($1, current_date + 2, current_date + 9, 'casa_flat') RETURNING id`, [waitingBookingId])
    ).rows[0].id;
    const late = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Wenke', 'Wartetest', 'e2e') RETURNING id`)).rows[0].id;
    lateBookingId = (await client.query<{ id: string }>(`INSERT INTO bookings (person_id, status) VALUES ($1, 'confirmed') RETURNING id`, [late])).rows[0].id;
    lateStayId = (
      await client.query<{ id: string }>(`INSERT INTO booking_stays (booking_id, starts_on, ends_on, accommodation_type_code) VALUES ($1, current_date + 1, current_date + 6, 'casa_flat') RETURNING id`, [lateBookingId])
    ).rows[0].id;
  });

  test.afterAll(async () => {
    if (!client) return;
    for (const id of [waitingBookingId, lateBookingId].filter(Boolean)) {
      await client.query(`DELETE FROM booking_stays WHERE booking_id = $1`, [id]);
      await client.query(`DELETE FROM bookings WHERE id = $1`, [id]);
    }
    await client.query(`DELETE FROM people WHERE last_name = 'Wartetest' AND created_by = 'e2e'`);
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

  test('a free bed takes a learner still without a room; a full room refuses one; a learner moves rooms', async ({ page }) => {
    await page.goto('/admin/accommodation/occupancy');
    // The double room's second bed is free: it takes Wanda.
    await page.getByRole('button', { name: `Aaa ${flat}, Zimmer Süd, Bett 2: jemanden einziehen lassen` }).click();
    const free = page.getByRole('dialog', { name: 'Freies Bett · Zimmer Süd' });
    await free.getByPlaceholder('Name').fill('Wartetest');
    await free.getByRole('listitem').filter({ hasText: 'Wanda Wartetest' }).first().getByRole('button', { name: 'Einziehen' }).click();
    await expect.poll(async () => (await client.query<{ room_id: string }>(`SELECT room_id FROM booking_stays WHERE id = $1`, [waitingStayId])).rows[0].room_id).toBe(roomId);

    // The double room is now full on some of Wenke's nights (Wilma and Wanda): she is refused.
    // Where the bed is still free: at the start of the weeks, before her stay.
    await page.getByRole('button', { name: `Aaa ${flat}, Zimmer Süd, Bett 2: jemanden einziehen lassen` }).click({ position: { x: 4, y: 10 } });
    await page.getByRole('dialog').getByRole('listitem').filter({ hasText: 'Wenke Wartetest' }).getByRole('button', { name: 'Einziehen' }).click();
    await expect(page.getByText('Alle 2 Betten sind in dieser Zeit schon belegt.')).toBeVisible();
    expect((await client.query<{ room_id: string | null }>(`SELECT room_id FROM booking_stays WHERE id = $1`, [lateStayId])).rows[0].room_id).toBeNull();

    // Wilma moves to the single room from her stay's panel.
    await page.goto('/admin/accommodation/occupancy');
    await page.getByRole('button', { name: /^Wilma Wohntest/ }).click();
    const panel = page.getByRole('dialog', { name: 'Wilma Wohntest' });
    await panel.getByRole('combobox').selectOption(singleId);
    await panel.getByRole('button', { name: 'Umziehen' }).click();
    await expect.poll(async () => (await client.query<{ n: string }>(`SELECT count(*) AS n FROM booking_stays WHERE booking_id = $1 AND room_id = $2`, [bookingId, singleId])).rows[0].n).toBe('1');
  });

  test('the flat opens at the side; its Putzplan gets a duty, shows it in the weeks, and loses it', async ({ page }) => {
    await page.goto('/admin/accommodation/occupancy');
    await page.getByRole('button', { name: new RegExp(`^Aaa ${flat}(?!,)`) }).click();
    const panel = page.getByRole('dialog', { name: `Aaa ${flat}` });
    await expect(panel).toContainText('Wohnen jetzt');
    await panel.getByRole('link', { name: 'Putzplan' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/accommodation/${flatId}\\?tab=cleaning$`));

    await page.getByRole('button', { name: 'Dienst hinzufügen' }).first().click();
    const form = page.getByRole('dialog', { name: 'Neuer Dienst' });
    await form.getByLabel('Name', { exact: true }).fill('Küche');
    await form.getByLabel('Name auf Englisch').fill('Kitchen');
    await form.getByLabel('Aufgaben, eine je Zeile').fill('Herd putzen\nKühlschrank auswischen');
    await form.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Herd putzen')).toBeVisible();
    // One duty, two rooms: this week one of them cleans the kitchen, the other is free.
    await expect(page.locator('tbody').getByText('Küche', { exact: true })).toHaveCount(4);
    await expect(page.getByRole('link', { name: 'Drucken' })).toBeVisible();

    await page.getByRole('button', { name: 'Löschen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Löschen', exact: true }).click();
    await expect(page.getByText('Diese WG hat noch keinen Putzplan.')).toBeVisible();
  });
});
