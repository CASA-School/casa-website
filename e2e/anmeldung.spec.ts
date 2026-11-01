import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

import { openCoursesAroundToday } from './support/open-courses';

/**
 * One Anmeldung, worked as one (0097, 2026-10-27): Meike's test sent the intensive course from A1 to C1
 * and telc B2 at once and the workspace showed seven records. Here a path A1 → C1 (A1 with a start, C1
 * without a date yet) and an exam without a sitting are one row in the inbox and one page; „1 Position
 * buchen" books A1, C1 is named as having no date, and declining the rest closes the Anmeldung by itself.
 *
 * Uses an intensive start ahead from the database. Runs only with a database and an owner account, in
 * German (pinned). Everything it makes is deleted afterwards.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('an Anmeldung of several lines', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let personId = '';
  let registrationId = '';
  const lines = { a1: '', c1: '', exam: '' };
  let courses: { restore: () => Promise<void> } | null = null;

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    courses = await openCoursesAroundToday(client);
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    const { rows: starts } = await client.query<{ id: string; course_type_id: string }>(
      `SELECT i.id, i.course_type_id FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
        WHERE t.format = 'intensive' AND i.status <> 'cancelled' AND i.start_date > current_date
          AND i.end_date - i.start_date BETWEEN 52 AND 53
        ORDER BY i.start_date LIMIT 1`
    );
    test.skip(starts.length === 0, 'no intensive start of eight weeks ahead');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:anmeldung')`,
      [rows[0].id, tokenHash]
    );
    personId = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by, listed) VALUES ('Anja', 'Anmeldepfad', 'e2e', false) RETURNING id`)).rows[0].id;
    registrationId = (
      await client.query<{ id: string }>(`INSERT INTO registrations (request_id, person_id, locale) VALUES ($1, $2, 'de') RETURNING id`, [randomUUID(), personId])
    ).rows[0].id;
    const course = (instance: string | null, label: string, level: string, code: string) =>
      client
        .query<{ id: string }>(
          `INSERT INTO course_registrations (request_id, registration_id, course_type_id, course_instance_id, course_type_label, course_instance_label,
             salutation, first_name, last_name, email, phone, nationality_raw, birth_date_raw, declared_level_raw, declared_level_code, locale, person_id)
           VALUES ($1, $2, $3, $4, 'Intensivkurse', $5, 'ms', 'Anja', 'Anmeldepfad', 'anja.anmeldepfad@example.org', '+49 421 000',
             'Deutschland', '2000-01-09', $6, $7, 'de', $8) RETURNING id`,
          [randomUUID(), registrationId, starts[0].course_type_id, instance, label, level, code, personId]
        )
        .then((r) => r.rows[0].id);
    lines.a1 = await course(starts[0].id, '', 'A1 komplett · 8 Wochen', 'A1.1');
    lines.c1 = await course(null, 'Termin wird noch festgelegt', 'C1 komplett · 8 Wochen', 'C1.1');
    lines.exam = (
      await client.query<{ id: string }>(
        `INSERT INTO exam_registrations (request_id, registration_id, exam_type_label, registration_type, salutation, first_name, last_name, email, phone,
           nationality_raw, birth_date_raw, locale, person_id)
         VALUES ($1, $2, 'telc Deutsch B2', 'full', 'ms', 'Anja', 'Anmeldepfad', 'anja.anmeldepfad@example.org', '+49 421 000', 'Deutschland', '2000-01-09', 'de', $3)
         RETURNING id`,
        [randomUUID(), registrationId, personId]
      )
    ).rows[0].id;
  });

  test.afterAll(async () => {
    if (!client) return;
    if (personId) {
      const bookings = (await client.query<{ id: string }>(`SELECT id FROM bookings WHERE person_id = $1`, [personId])).rows.map((r) => r.id);
      const ids = [personId, registrationId, ...Object.values(lines), ...bookings].filter(Boolean);
      await client.query(`DELETE FROM staff_activity WHERE entity_id = ANY($1::uuid[])`, [ids]);
      await client.query(`DELETE FROM staff_notes WHERE entity_id = ANY($1::uuid[])`, [ids]);
      await client.query(`DELETE FROM bookings WHERE id = ANY($1::uuid[])`, [bookings]);
      if (registrationId) await client.query(`DELETE FROM registrations WHERE id = $1`, [registrationId]);
      await client.query(`DELETE FROM people WHERE id = $1`, [personId]);
    }
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await courses?.restore();
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  test('one row and one page; the open line booked at once; declining the rest closes it', async ({ page }) => {
    await page.goto('/admin/registrations?q=Anmeldepfad');
    const row = page.getByRole('listitem').filter({ hasText: 'Anja Anmeldepfad' });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('A1 → C1 + telc Deutsch B2');

    await page.goto(`/admin/registrations/${registrationId}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Anja Anmeldepfad');
    await expect(page.locator('li[id^="line-"]')).toHaveCount(3);
    await expect(page.locator('main')).toContainText('C1 hat noch keinen Termin.');

    // Person first (2026-11-01): nothing is booked until the sender is decided — here someone new.
    await expect(page.getByRole('button', { name: '1 Position buchen' })).toHaveCount(0);
    await expect(page.locator(`#line-${lines.a1}`).getByRole('link', { name: 'Buchen' })).toHaveAttribute('href', /\?person=1$/);
    await page.getByRole('link', { name: 'Person klären' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Neue Person anlegen' }).click();
    await expect(page.getByText('Neu bei CASA', { exact: true })).toBeVisible();

    // Only A1 has a start: the quick way books it alone, one booking pointing at its line.
    await page.getByRole('button', { name: '1 Position buchen' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('checkbox', { name: /A1/ })).toBeChecked();
    await dialog.getByRole('button', { name: 'Buchen', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('1 Buchung angelegt.');
    await expect(page.locator(`#line-${lines.a1}`)).toContainText(/Gebucht · B-\d{4}-\d{4}/);
    await expect(page.getByRole('button', { name: 'In Arbeit' })).toHaveAttribute('aria-pressed', 'true');
    const { rows: booked } = await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM bookings WHERE source_registration_id = $1`, [lines.a1]);
    expect(booked[0].n).toBe(1);

    // Declined, each after a confirmation; the last one closes the Anmeldung.
    for (const line of [lines.c1, lines.exam]) {
      await page.locator(`#line-${line}`).getByRole('button', { name: 'Weitere Aktionen' }).click();
      await page.getByRole('menuitem', { name: 'Absagen' }).click();
      await page.locator(`#line-${line}`).getByRole('button', { name: 'Absagen' }).click();
      await expect(page.locator(`#line-${line}`)).toContainText('Abgesagt');
    }
    await expect(page.getByRole('button', { name: 'Erledigt' })).toHaveAttribute('aria-pressed', 'true');
    const { rows: status } = await client.query<{ status: string }>(`SELECT status::text AS status FROM registrations WHERE id = $1`, [registrationId]);
    expect(status[0].status).toBe('done');
  });
});
