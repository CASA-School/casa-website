import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * The waiting list (2026-10-16, migration 0031), end to end. A level with one place, taken: the
 * booking wizard sees it is full and puts the next learner on its waiting list instead. A
 * cancellation frees the place; the course start's page names who is next; the place is offered,
 * held for them, and booked — and the booking closes their place in the queue by itself.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('waiting list', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let instanceId = '';
  let firstId = '';
  let firstBookingId = '';
  let nextId = '';

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:waitlist')`,
      [rows[0].id, tokenHash]
    );
    instanceId = (
      await client.query<{ id: string }>(
        `INSERT INTO course_instances (course_type_id, start_date, end_date, capacity, schedule, status, title)
         SELECT id, current_date + 40, current_date + 95, 15, '{"days":["Mon","Tue","Wed","Thu","Fri"],"time":"09:00-12:30"}', 'scheduled', 'E2E Warteliste'
           FROM course_types WHERE slug = 'intensive-german' RETURNING id`
      )
    ).rows[0].id;
    // B1.1 in this start: one place.
    await client.query(`INSERT INTO course_level_places (course_instance_id, level_code, groups, places_per_group) VALUES ($1, 'B1.1', 1, 1)`, [instanceId]);
    const person = async (first: string, last: string) =>
      (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ($1, $2, 'e2e') RETURNING id`, [first, last])).rows[0].id;
    firstId = await person('Anna', 'Erstbuchung');
    nextId = await person('Ben', 'Wartetest');
    firstBookingId = (await client.query<{ id: string }>(`INSERT INTO bookings (person_id, status) VALUES ($1, 'confirmed') RETURNING id`, [firstId])).rows[0].id;
    await client.query(
      `INSERT INTO booking_periods (booking_id, course_instance_id, start_date, end_date, level_code)
       SELECT $1, id, start_date, end_date, 'B1.1' FROM course_instances WHERE id = $2`,
      [firstBookingId, instanceId]
    );
  });

  test.afterAll(async () => {
    if (!client) return;
    const people = [firstId, nextId].filter(Boolean);
    const bookings = (await client.query<{ id: string }>(`SELECT id FROM bookings WHERE person_id = ANY($1::uuid[])`, [people])).rows.map((r) => r.id);
    await client.query(`DELETE FROM staff_activity WHERE entity_id = ANY($1::uuid[])`, [[...people, ...bookings, instanceId].filter(Boolean)]);
    if (instanceId) await client.query(`DELETE FROM waitlist_entries WHERE course_instance_id = $1`, [instanceId]);
    await client.query(`DELETE FROM payments WHERE booking_id = ANY($1::uuid[])`, [bookings]);
    await client.query(`DELETE FROM bookings WHERE id = ANY($1::uuid[])`, [bookings]);
    if (instanceId) await client.query(`DELETE FROM course_instances WHERE id = $1`, [instanceId]);
    await client.query(`DELETE FROM people WHERE id = ANY($1::uuid[])`, [people]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  test('full → waiting list; a place frees up, is offered, held and booked, and the queue closes itself', async ({ page }) => {
    const dialog = page.getByRole('dialog');

    // The wizard sees B1.1 is full and offers the waiting list.
    await page.goto(`/admin/people/${nextId}`);
    await page.getByRole('button', { name: 'Neue Buchung' }).click();
    await dialog.getByRole('button', { name: /^Einen Kurs/ }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await dialog.getByRole('button', { name: /^Intensive German/ }).click();
    await dialog.getByRole('button', { name: /^E2E Warteliste/ }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await dialog.getByRole('button', { name: /^B1\.1/ }).click();
    await expect(dialog).toContainText('B1.1 ist voll');
    await dialog.getByRole('button', { name: 'Nein' }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await dialog.getByRole('button', { name: 'Nein' }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await expect(dialog).toContainText('Auf der Warteliste wäre Ben Wartetest Nr. 1');
    await dialog.getByRole('button', { name: 'Auf die Warteliste' }).click();

    // On the course start's page, first in B1.1's queue.
    await expect(page).toHaveURL(new RegExp(`/admin/catalogue/${instanceId}`));
    const level = page.locator('#level-B1\\.1');
    await expect(level).toContainText('Voll');
    await expect(level.getByRole('listitem').filter({ hasText: 'Ben Wartetest' })).toContainText('1');

    // A cancellation frees the place: the page names who is next, and the place is offered.
    await client.query(`UPDATE bookings SET status = 'cancelled', cancelled_at = now() WHERE id = $1`, [firstBookingId]);
    await page.reload();
    const banner = level.getByRole('status');
    await expect(banner).toContainText('1 Platz frei');
    await expect(banner).toContainText('Ben Wartetest');
    await banner.getByRole('button', { name: 'Platz anbieten' }).click();
    await expect(level.getByRole('listitem').filter({ hasText: 'Ben Wartetest' })).toContainText('Platz angeboten');

    // Booked from the row: the wizard knows the place is held for him.
    await level.getByRole('button', { name: 'Buchen', exact: true }).click();
    await expect(dialog).toContainText('der Platz ist für diese Person reserviert');
    await dialog.getByRole('button', { name: 'Nein' }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await dialog.getByRole('button', { name: 'Nein' }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await dialog.getByRole('button', { name: 'Buchung anlegen' }).click();
    await expect(page).toHaveURL(/\/admin\/bookings\/[0-9a-f-]{36}$/);

    // The queue closed itself with the booking.
    const { rows } = await client.query<{ status: string; booking_id: string | null }>(
      `SELECT status, booking_id FROM waitlist_entries WHERE course_instance_id = $1 AND person_id = $2`,
      [instanceId, nextId]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('booked');
    expect(rows[0].booking_id).not.toBeNull();
    await page.goto(`/admin/people/${nextId}?tab=cases`);
    await expect(page.getByRole('tabpanel').getByText('Gebucht').first()).toBeVisible();
  });
});
