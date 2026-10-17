import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * Bildungszeit (2026-10-17): booked into a week's two intensive classes — the newest start's at its
 * first half and the previous start's at its second — with each class's places checked for those
 * weeks. Uses the intensive starts the seeds give the database, and the first week the wizard offers.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('Bildungszeit', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');
  test.describe.configure({ mode: 'serial' });

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let beaId = '';
  let cemId = '';
  let danId = '';
  let startId = '';
  let placesBefore: { groups: number; places_per_group: number } | null = null;
  // Intensive courses around today that SchoolMan has closed, opened for the run and closed again after:
  // these tests book open classes; a full one is the third test's.
  let reopened: string[] = [];

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:bildungszeit')`,
      [rows[0].id, tokenHash]
    );
    beaId = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Bea', 'Bildungstest', 'e2e') RETURNING id`)).rows[0].id;
    cemId = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Cem', 'Bildungstest', 'e2e') RETURNING id`)).rows[0].id;
    danId = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Dan', 'Bildungstest', 'e2e') RETURNING id`)).rows[0].id;
    reopened = (
      await client.query<{ id: string }>(
        `UPDATE courses c SET bookable = true
           FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
          WHERE c.course_instance_id = i.id AND t.format = 'intensive' AND NOT c.bookable
            AND i.end_date >= current_date - 70 AND i.start_date <= current_date + 70
         RETURNING c.id`
      )
    ).rows.map((r) => r.id);
  });

  test.afterAll(async () => {
    if (!client) return;
    const people = [beaId, cemId, danId].filter(Boolean);
    const bookings = (await client.query<{ id: string }>(`SELECT id FROM bookings WHERE person_id = ANY($1::uuid[])`, [people])).rows.map((r) => r.id);
    await client.query(`DELETE FROM staff_activity WHERE entity_id = ANY($1::uuid[])`, [[...people, ...bookings]]);
    await client.query(`DELETE FROM bookings WHERE id = ANY($1::uuid[])`, [bookings]);
    await client.query(`DELETE FROM people WHERE id = ANY($1::uuid[])`, [people]);
    if (startId) {
      if (placesBefore)
        await client.query(`UPDATE courses SET groups = $2, places_per_group = $3 WHERE course_instance_id = $1 AND level_code = 'B1.1'`, [
          startId,
          placesBefore.groups,
          placesBefore.places_per_group,
        ]);
      else await client.query(`UPDATE courses SET groups = 1, places_per_group = 14 WHERE course_instance_id = $1 AND level_code = 'B1.1'`, [startId]);
    }
    if (reopened.length) await client.query(`UPDATE courses SET bookable = false WHERE id = ANY($1::uuid[])`, [reopened]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  /** The wizard up to the two classes: Bildungszeit, the first week offered, one week. */
  async function toClasses(page: import('@playwright/test').Page, personId: string) {
    const dialog = page.getByRole('dialog');
    await page.goto(`/admin/people/${personId}`);
    await page.getByRole('button', { name: 'Neue Buchung' }).click();
    await dialog.getByRole('button', { name: /^Einen Kurs/ }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await dialog.getByRole('button', { name: /^Bildungszeit/ }).click();
    await dialog.getByRole('button', { name: /^KW \d+/ }).first().click();
    await dialog.getByRole('button', { name: '1 Woche' }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    return dialog;
  }

  test('a Bildungszeit learner is booked into the morning and the afternoon class of a week', async ({ page }) => {
    const dialog = await toClasses(page, beaId);
    await expect(dialog).toContainText('In welche Kurse?');
    // Choosing B1.1 takes the same level's other half for the other class.
    await dialog.getByRole('button', { name: /^B1\.1/ }).click();
    await expect(dialog.getByRole('button', { name: /^B1\.2/ })).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: 'Nein' }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await dialog.getByRole('button', { name: 'Nein' }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await expect(dialog).toContainText('Bildungszeit');
    await dialog.getByRole('button', { name: 'Buchung anlegen' }).click();
    await expect(page).toHaveURL(/\/admin\/bookings\/[0-9a-f-]{36}$/);
    const bookingId = page.url().split('/').pop()!;

    // Two periods of the same week.
    const { rows: periods } = await client.query<{ level_code: string; start_date: string; end_date: string; course_instance_id: string; dow: number }>(
      `SELECT level_code, to_char(start_date, 'YYYY-MM-DD') AS start_date, to_char(end_date, 'YYYY-MM-DD') AS end_date, course_instance_id,
              extract(isodow FROM start_date)::int AS dow
         FROM booking_periods WHERE booking_id = $1 ORDER BY level_code`,
      [bookingId]
    );
    expect(periods.map((p) => p.level_code)).toEqual(['B1.1', 'B1.2']);
    expect(periods[0].dow).toBe(1);
    expect(periods[1].start_date).toBe(periods[0].start_date);
    expect(periods[1].end_date).toBe(periods[0].end_date);
    // B1.1 on the newest intensive start that Monday, B1.2 on the one before it: the two classes.
    const { rows: newest } = await client.query<{ id: string }>(
      `SELECT i.id FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
        WHERE t.format = 'intensive' AND i.status <> 'cancelled' AND i.start_date <= $1::date ORDER BY i.start_date DESC LIMIT 2`,
      [periods[0].start_date]
    );
    startId = newest[0].id;
    expect(periods.map((p) => p.course_instance_id)).toEqual([newest[0].id, newest[1].id]);

    // A booking of the Bildungszeit course, priced as one week of it.
    const { rows: booking } = await client.query<{ slug: string; description: string }>(
      `SELECT t.slug, c.description FROM bookings b JOIN course_types t ON t.id = b.course_type_id
         JOIN booking_charges c ON c.booking_id = b.id AND c.kind = 'tuition' WHERE b.id = $1`,
      [bookingId]
    );
    expect(booking[0].slug).toBe('bildungszeit');
    // Written in German (2026-10-17): the course type's German name and the week.
    expect(booking[0].description).toMatch(/^Bildungszeit · \d{2}\.\d{2}\.\d{2} – /);
  });

  test('two weeks: a new course starting in between gives the second week its own two classes', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await page.goto(`/admin/people/${danId}`);
    await page.getByRole('button', { name: 'Neue Buchung' }).click();
    await dialog.getByRole('button', { name: /^Einen Kurs/ }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await dialog.getByRole('button', { name: /^Bildungszeit/ }).click();
    await dialog.getByRole('button', { name: /^KW \d+/ }).first().click();
    await dialog.getByRole('button', { name: '2 Wochen' }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await dialog.getByRole('button', { name: /^A2\.1/ }).click();
    await dialog.getByRole('button', { name: 'Nein' }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await dialog.getByRole('button', { name: 'Nein' }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await dialog.getByRole('button', { name: 'Buchung anlegen' }).click();
    await expect(page).toHaveURL(/\/admin\/bookings\/[0-9a-f-]{36}$/);
    const bookingId = page.url().split('/').pop()!;

    const { rows: periods } = await client.query<{ level_code: string; start_date: string; end_date: string; course_instance_id: string }>(
      `SELECT level_code, to_char(start_date, 'YYYY-MM-DD') AS start_date, to_char(end_date, 'YYYY-MM-DD') AS end_date, course_instance_id
         FROM booking_periods WHERE booking_id = $1 ORDER BY start_date, level_code`,
      [bookingId]
    );
    const monday = periods[0].start_date;
    // The two newest intensive starts in each of the two weeks: a new one in between starts a new part.
    const starts = async (day: string) =>
      (
        await client.query<{ id: string }>(
          `SELECT i.id FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
            WHERE t.format = 'intensive' AND i.status <> 'cancelled' AND i.start_date <= $1::date ORDER BY i.start_date DESC LIMIT 2`,
          [day]
        )
      ).rows.map((r) => r.id);
    const week1 = await starts(monday);
    const week2 = await starts(new Date(Date.parse(`${monday}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10));
    if (week1[0] === week2[0]) {
      expect(periods.map((p) => [p.level_code, p.course_instance_id])).toEqual([
        ['A2.1', week1[0]],
        ['A2.2', week1[1]],
      ]);
      expect(periods[0].end_date > periods[0].start_date).toBe(true);
    } else {
      // The class that was at its first half continues at its second: the same course, the next half.
      expect(periods.map((p) => [p.level_code, p.course_instance_id])).toEqual([
        ['A2.1', week1[0]],
        ['A2.2', week1[1]],
        ['A2.1', week2[0]],
        ['A2.2', week2[1]],
      ]);
      expect(week2[1]).toBe(week1[0]);
      await expect(page.locator('main')).toContainText('4 Zeiträume');
    }
  });

  test('a class with no place left that week is marked, and booking it anyway stays possible', async ({ page }) => {
    // One place in the newest start's B1.1, and Bea in it that week.
    const before = await client.query<{ groups: number; places_per_group: number }>(
      `SELECT groups, places_per_group FROM courses WHERE course_instance_id = $1 AND level_code = 'B1.1'`,
      [startId]
    );
    placesBefore = before.rows[0] ?? null;
    await client.query(
      `INSERT INTO courses (course_instance_id, level_code, groups, places_per_group) VALUES ($1, 'B1.1', 1, 1)
       ON CONFLICT (course_instance_id, level_code) WHERE level_code IS NOT NULL DO UPDATE SET groups = 1, places_per_group = 1`,
      [startId]
    );

    // The board's groups of that course count as its groups (0045): one place each, and the places
    // beyond Bea's taken by Dan that week.
    const { rows: board } = await client.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM course_groups g JOIN courses c ON c.id = g.course_id
        WHERE c.course_instance_id = $1 AND c.level_code = 'B1.1' AND g.phase = '1'`,
      [startId]
    );
    const places = Math.max(1, board[0].n);
    for (let i = 1; i < places; i++) {
      const extra = (await client.query<{ id: string }>(`INSERT INTO bookings (person_id, status) VALUES ($1, 'confirmed') RETURNING id`, [danId])).rows[0].id;
      await client.query(
        `INSERT INTO booking_periods (booking_id, course_instance_id, course_id, start_date, end_date, level_code)
         SELECT $1, p.course_instance_id, p.course_id, p.start_date, p.end_date, p.level_code
           FROM booking_periods p JOIN bookings b ON b.id = p.booking_id WHERE b.person_id = $2 AND p.level_code = 'B1.1' LIMIT 1`,
        [extra, beaId]
      );
    }

    const dialog = await toClasses(page, cemId);
    await expect(dialog.getByRole('button', { name: /^B1\.1/ })).toContainText('voll');
    await dialog.getByRole('button', { name: /^B1\.1/ }).click();
    await expect(dialog).toContainText(`B1.1 ist in dieser Zeit voll: ${places} von ${places} Plätzen`);
    await dialog.getByRole('button', { name: 'Nein' }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await dialog.getByRole('button', { name: 'Nein' }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await expect(dialog.getByRole('status')).toContainText(`B1.1 ist in dieser Zeit voll (${places} von ${places} Plätzen).`);
    await expect(dialog.getByRole('button', { name: 'Trotzdem buchen' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Buchung anlegen' })).toHaveCount(0);
  });
});
