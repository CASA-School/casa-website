import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * The staff register (2026-10-17, migration 0039). A colleague is created with a role and is not a
 * learner; a contract goes in its own tab; the oral part of an exam takes a licence valid on the day;
 * a course start shows who teaches its classes on the Kursplanung board, and counts the board's
 * groups; a colleague the board names leaves instead of being deleted; Kursplanung adds a teacher.
 *
 * Runs only with a database and an owner account, in German (pinned). The course start and its board
 * month lie in 2031, where nothing else plans. Everything is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

test.describe('staff register', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');
  test.describe.configure({ mode: 'serial' });

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let sittingId = '';
  let startId = '';
  let staffId = '';
  const groupIds: string[] = [];

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:staff')`,
      [rows[0].id, tokenHash]
    );
    sittingId = (
      await client.query<{ id: string }>(
        `INSERT INTO exam_sessions (exam_type_id, starts_at, ends_at, registration_deadline, capacity, status)
         SELECT id, (current_date + 60) + time '09:00', (current_date + 60) + time '17:00', current_date + 20, 10, 'scheduled'
           FROM exam_types WHERE code = 'telc_b2' RETURNING id`
      )
    ).rows[0].id;
    // An intensive morning start on 3 March 2031: the board's March 2031 is its first month.
    startId = (
      await client.query<{ id: string }>(
        `INSERT INTO course_instances (course_type_id, start_date, end_date, schedule)
         SELECT id, '2031-03-03', '2031-04-25', '{"days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "time": "09:00-12:30"}'::jsonb
           FROM course_types WHERE slug = 'intensive-german' RETURNING id`
      )
    ).rows[0].id;
    await client.query(`INSERT INTO courses (course_instance_id, level_code, groups, places_per_group) VALUES ($1, 'B1.1', 1, 14)`, [startId]);
  });

  test.afterAll(async () => {
    if (!client) return;
    const staff = (await client.query<{ id: string; person_id: string }>(`SELECT s.id, s.person_id FROM staff_members s JOIN people p ON p.id = s.person_id WHERE p.last_name = 'Personaltest'`)).rows;
    const staffIds = staff.map((s) => s.id);
    if (groupIds.length) await client.query(`DELETE FROM plan_assignments WHERE group_id = ANY($1::uuid[])`, [groupIds]);
    await client.query(`DELETE FROM course_groups WHERE month IN ('2031-03-01', '2031-04-01')`);
    await client.query(`DELETE FROM exam_session_examiners WHERE staff_member_id = ANY($1::uuid[])`, [staffIds]);
    await client.query(`DELETE FROM staff_activity WHERE entity_id = ANY($1::uuid[])`, [[...staffIds, sittingId, startId].filter(Boolean)]);
    await client.query(`DELETE FROM staff_activity WHERE entity = 'kursplanung.group' AND detail->>'month' IN ('2031-03', '2031-04')`);
    await client.query(`DELETE FROM staff_members WHERE id = ANY($1::uuid[])`, [staffIds]);
    await client.query(`DELETE FROM emails WHERE person_id = ANY($1::uuid[])`, [staff.map((s) => s.person_id)]);
    await client.query(`DELETE FROM people WHERE id = ANY($1::uuid[])`, [staff.map((s) => s.person_id)]);
    if (startId) {
      await client.query(`DELETE FROM waitlist_entries WHERE course_instance_id = $1`, [startId]);
      const booked = (await client.query<{ booking_id: string }>(`SELECT booking_id FROM booking_periods WHERE course_instance_id = $1`, [startId])).rows.map((r) => r.booking_id);
      await client.query(`DELETE FROM staff_activity WHERE entity_id = ANY($1::uuid[])`, [booked]);
      await client.query(`DELETE FROM bookings WHERE id = ANY($1::uuid[])`, [booked]);
      await client.query(`DELETE FROM people WHERE last_name = 'Gruppentest' AND created_by = 'e2e'`);
      await client.query(`DELETE FROM course_instances WHERE id = $1`, [startId]);
    }
    if (sittingId) await client.query(`DELETE FROM exam_sessions WHERE id = $1`, [sittingId]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  test('a new colleague is created with a role and lands on their page', async ({ page }) => {
    await page.goto('/admin/staff');
    await page.getByRole('button', { name: 'Neu', exact: true }).last().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Vorname').fill('Erika');
    await dialog.getByLabel('Nachname').fill('Personaltest');
    await dialog.getByLabel('Prüfer:in').check();
    await dialog.getByRole('button', { name: 'Anlegen' }).click();
    await expect(page).toHaveURL(/\/admin\/staff\/[0-9a-f-]{36}$/);
    staffId = UUID.exec(page.url())![0];
    await expect(page.getByRole('heading', { name: 'Erika Personaltest' })).toBeVisible();

    const { rows } = await client.query<{ short_name: string; roles: string[] }>(
      `SELECT s.short_name, array_agg(r.role_code ORDER BY r.role_code) AS roles FROM staff_members s JOIN staff_member_roles r ON r.staff_member_id = s.id WHERE s.id = $1 GROUP BY s.short_name`,
      [staffId]
    );
    expect(rows).toEqual([{ short_name: 'Erika P', roles: ['examiner'] }]);
  });

  test('their person is not a learner', async ({ page }) => {
    const { rows } = await client.query<{ person_id: string }>(`SELECT person_id FROM staff_members WHERE id = $1`, [staffId]);
    await page.goto(`/admin/people/${rows[0].person_id}`);
    await expect(page).toHaveURL(new RegExp(`/admin/staff/${staffId}$`));
    await page.goto('/admin/people?q=Personaltest');
    await expect(page.locator('main')).not.toContainText('Erika Personaltest');
  });

  test('a contract is recorded in its own tab', async ({ page }) => {
    await page.goto(`/admin/staff/${staffId}?tab=contracts`);
    await page.getByRole('button', { name: 'Vertrag hinzufügen' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Art').selectOption({ label: 'Honorarkraft' });
    await dialog.getByLabel('Stunden pro Woche').fill('12');
    await dialog.getByRole('button', { name: 'Vertrag hinzufügen' }).click();
    await expect(page.getByText('Läuft')).toBeVisible();
    const { rows } = await client.query<{ kind: string; weekly_hours: string }>(`SELECT kind, weekly_hours::text FROM staff_contracts WHERE staff_member_id = $1`, [staffId]);
    expect(rows).toEqual([{ kind: 'freelance', weekly_hours: '12.0' }]);
  });

  test('the oral part takes a licence valid on the day', async ({ page }) => {
    const assign = async () => {
      await page.goto(`/admin/catalogue/exams/${sittingId}`);
      await page.getByRole('button', { name: 'Eintragen' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Person').selectOption({ label: 'Erika Personaltest' });
      await dialog.getByLabel('Aufgabe').selectOption({ label: 'Mündliche Prüfung' });
      await dialog.getByRole('button', { name: 'Eintragen' }).click();
    };
    await assign();
    await expect(page.locator('p[role="alert"]')).toContainText('braucht es eine Lizenz für telc Deutsch B2');

    await page.goto(`/admin/staff/${staffId}?tab=exams`);
    await page.getByRole('button', { name: 'Eintragen' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Prüfung').selectOption({ label: 'telc Deutsch B2' });
    await dialog.getByLabel('Lizenznummer').fill('E2E-4711');
    await dialog.getByRole('button', { name: 'Lizenz eintragen' }).click();
    await expect(page.getByText('E2E-4711')).toBeVisible();

    await assign();
    await expect(page).toHaveURL(new RegExp(`/admin/catalogue/exams/${sittingId}$`));
    await expect(page.locator('main')).toContainText('Mündliche Prüfung');
    await expect(page.locator('main')).not.toContainText('Keine gültige Lizenz');
    await page.goto(`/admin/staff/${staffId}?tab=exams`);
    await expect(page.getByRole('link', { name: /telc Deutsch B2/ })).toBeVisible();
  });

  test('a course start shows who teaches its classes and counts the board’s groups', async ({ page }) => {
    for (const index of [1, 2]) {
      groupIds.push(
        (
          await client.query<{ id: string }>(
            `INSERT INTO course_groups (month, shift, level, phase, group_index, registrations) VALUES ('2031-03-01', 'morning', 'B1', '1', $1, 14) RETURNING id`,
            [index]
          )
        ).rows[0].id
      );
    }
    await client.query(`INSERT INTO plan_assignments (group_id, on_date, teacher_id) VALUES ($1, '2031-03-04', $2)`, [groupIds[0], staffId]);

    await page.goto(`/admin/catalogue/${startId}`);
    await expect(page.locator('main')).toContainText('Unterricht');
    await expect(page.getByRole('link', { name: 'Erika Personaltest' })).toHaveAttribute('href', `/admin/staff/${staffId}?tab=teaching`);
    await expect(page.locator('#level-B1\\.1')).toContainText('2 Gruppen à 14 · 28 Plätze');

    await page.goto('/admin/kursplanung/kurse?month=2031-03');
    await expect(page.getByRole('link', { name: 'Kursstart 3. März' }).first()).toHaveAttribute('href', new RegExp(`/admin/catalogue/${startId}`));
  });

  test('a group opened on the course start is opened on the board', async ({ page }) => {
    // One place per group, both taken, and a third learner waiting: the level is full.
    const course = (
      await client.query<{ id: string }>(`UPDATE courses SET places_per_group = 1 WHERE course_instance_id = $1 AND level_code = 'B1.1' RETURNING id`, [startId])
    ).rows[0].id;
    for (const name of ['Ada', 'Bo', 'Cy']) {
      const person = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ($1, 'Gruppentest', 'e2e') RETURNING id`, [name])).rows[0].id;
      if (name === 'Cy') {
        await client.query(`INSERT INTO waitlist_entries (person_id, course_instance_id, level_code, course_id, rank) VALUES ($1, $2, 'B1.1', $3, 1)`, [person, startId, course]);
        continue;
      }
      const booking = (await client.query<{ id: string }>(`INSERT INTO bookings (person_id, status) VALUES ($1, 'confirmed') RETURNING id`, [person])).rows[0].id;
      await client.query(
        `INSERT INTO booking_periods (booking_id, course_instance_id, start_date, end_date, kind, level_code, course_id) VALUES ($1, $2, '2031-03-03', '2031-04-25', 'initial', 'B1.1', $3)`,
        [booking, startId, course]
      );
    }

    await page.goto(`/admin/catalogue/${startId}`);
    await page.locator('#level-B1\\.1').getByRole('button', { name: 'Weitere Gruppe eröffnen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Gruppe eröffnen' }).click();
    await expect(page.locator('#level-B1\\.1')).toContainText('3 Gruppen à 1 · 3 Plätze');

    const { rows } = await client.query<{ group_index: number }>(
      `SELECT group_index FROM course_groups WHERE month = '2031-03-01' AND shift = 'morning' AND level = 'B1' AND phase = '1' ORDER BY group_index`
    );
    expect(rows.map((r) => r.group_index)).toEqual([1, 2, 3]);
  });

  test('a colleague the board names leaves instead of being deleted', async ({ page }) => {
    await page.goto(`/admin/staff/${staffId}`);
    await page.getByRole('button', { name: 'Löschen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();
    await expect(page.locator('p[role="alert"]')).toContainText('scheidet aus statt gelöscht zu werden');

    await page.getByRole('button', { name: 'Ausgeschieden' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Ausgeschieden' }).click();
    await expect(page.getByText('Ehemalig', { exact: true })).toBeVisible();
    await page.goto('/admin/staff?view=former');
    await expect(page.locator('main')).toContainText('Erika Personaltest');
  });

  test('Kursplanung adds a teacher and opens their rules', async ({ page }) => {
    await page.goto('/admin/kursplanung/lehrkraefte');
    await page.getByRole('button', { name: 'Lehrkraft anlegen' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Vorname').fill('Moritz');
    await dialog.getByLabel('Nachname').fill('Personaltest');
    await expect(dialog.getByLabel('Unterricht')).toBeChecked();
    await dialog.getByRole('button', { name: 'Anlegen' }).click();
    await expect(page).toHaveURL(/\/admin\/kursplanung\/lehrkraefte\?teacher=[0-9a-f-]{36}$/);
    await expect(page.getByRole('dialog')).toContainText('Moritz Personaltest');
  });
});
