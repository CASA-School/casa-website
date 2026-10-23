import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * A class from the Tagesplan's „Kurse" (2026-10-19): the list of its learners with their addresses for
 * the teacher, and its room and teacher changed from the class's panel — on one day, or from that day to
 * the end of the course — after a confirmation that says what changes. A course of its own in May 2032,
 * so no real class is touched.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything it makes is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const DAYS = ['2032-05-03', '2032-05-04', '2032-05-05'];

test.describe('a class from the Tagesplan', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let startId = '';
  let courseId = '';
  let personId = '';
  let bookingId = '';
  let teachers: { id: string; name: string }[] = [];
  let rooms: { id: string; name: string }[] = [];
  const stamp = randomBytes(3).toString('hex');

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:day-lessons')`,
      [rows[0].id, tokenHash]
    );
    teachers = (
      await client.query<{ id: string; name: string }>(
        // By the board's name, „Vorname N." (0081), as the Tagesplan shows a teacher.
        `SELECT m.id, coalesce(m.short_name, concat_ws(' ', p.first_name, p.last_name)) AS name FROM staff_members m JOIN people p ON p.id = m.person_id
          WHERE m.is_active AND EXISTS (SELECT 1 FROM staff_member_roles r WHERE r.staff_member_id = m.id AND r.role_code = 'teaching')
          ORDER BY p.first_name, p.last_name LIMIT 2`
      )
    ).rows;
    rooms = (await client.query<{ id: string; name: string }>(`SELECT id, coalesce(nickname, name) AS name FROM rooms WHERE is_active AND is_bookable AND kind = 'classroom' ORDER BY name LIMIT 2`)).rows;
    test.skip(teachers.length < 2 || rooms.length < 2, 'needs two teachers and two classrooms');
    startId = (
      await client.query<{ id: string }>(
        `INSERT INTO course_instances (course_type_id, start_date, end_date, schedule)
         SELECT id, '2032-05-03', '2032-05-28', '{"days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "time": "09:00-12:30"}'::jsonb
           FROM course_types WHERE slug = 'intensive-german' RETURNING id`
      )
    ).rows[0].id;
    courseId = (await client.query<{ id: string }>(`INSERT INTO courses (course_instance_id, level_code, groups, places_per_group) VALUES ($1, 'B1.1', 1, 14) RETURNING id`, [startId])).rows[0].id;
    for (const weekday of [1, 2, 3, 4, 5]) {
      await client.query(
        `INSERT INTO course_week_plans (course_id, group_index, weekday, starts_at, ends_at, teacher_id, room_id) VALUES ($1, 1, $2, '09:00', '12:30', $3, $4)`,
        [courseId, weekday, teachers[0].id, rooms[0].id]
      );
    }
    for (const day of DAYS) {
      await client.query(`INSERT INTO course_days (course_id, group_index, on_date, teacher_id, room_id) VALUES ($1, 1, $2, $3, $4)`, [courseId, day, teachers[0].id, rooms[0].id]);
    }
    personId = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Lena', 'Listentest', 'e2e') RETURNING id`)).rows[0].id;
    await client.query(`INSERT INTO emails (person_id, address, normalized, is_primary) VALUES ($1, $2, $2, true)`, [personId, `lena.${stamp}@example.org`]);
    bookingId = (await client.query<{ id: string }>(`INSERT INTO bookings (person_id, status) VALUES ($1, 'confirmed') RETURNING id`, [personId])).rows[0].id;
    await client.query(`INSERT INTO booking_periods (booking_id, course_id, start_date, end_date) VALUES ($1, $2, '2032-05-03', '2032-05-28')`, [bookingId, courseId]);
  });

  test.afterAll(async () => {
    if (!client) return;
    if (bookingId) await client.query(`DELETE FROM bookings WHERE id = $1`, [bookingId]);
    if (personId) await client.query(`DELETE FROM people WHERE id = $1`, [personId]);
    if (courseId) {
      await client.query(`DELETE FROM course_days WHERE course_id = $1`, [courseId]);
      await client.query(`DELETE FROM course_week_plans WHERE course_id = $1`, [courseId]);
      await client.query(`DELETE FROM courses WHERE id = $1`, [courseId]);
    }
    if (startId) await client.query(`DELETE FROM course_instances WHERE id = $1`, [startId]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const openClass = async (page: import('@playwright/test').Page) => {
    await page.goto(`/admin/day/courses?date=${DAYS[0]}`);
    await page.getByRole('row').filter({ hasText: 'B1.1' }).first().click();
    return page.getByRole('dialog', { name: /^B1\.1/ });
  };

  test('the list for the teacher: the class with names and addresses', async ({ page }) => {
    const panel = await openClass(page);
    await panel.getByRole('link', { name: 'Liste für die Lehrkraft' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Teilnehmerliste B1.1');
    await expect(page.getByRole('row').filter({ hasText: 'Listentest, Lena' })).toContainText(`lena.${stamp}@example.org`);
    // The mail to the teacher on the workspace's mail screen (2026-10-23): the list in the text.
    await page.getByRole('link', { name: new RegExp(`^E-Mail an ${escape(teachers[0].name)}`) }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Teilnehmerliste an /);
    await expect(page.getByRole('textbox', { name: 'Text' })).toHaveValue(new RegExp(`lena\\.${stamp}@example\\.org`));
    await expect(page.getByRole('button', { name: 'Im Mailprogramm öffnen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Direkt senden' })).toBeVisible();
  });

  test('the room on one day, then the teacher from that day on — each after saying what changes', async ({ page }) => {
    let panel = await openClass(page);
    const roomForm = panel.locator('form').filter({ hasText: 'Raum ändern' });
    await roomForm.getByRole('button', { name: 'Raum', exact: true }).click();
    await page.getByRole('menuitem', { name: new RegExp(`^${escape(rooms[1].name)}`) }).click();
    await roomForm.getByRole('radio', { name: /^Nur am/ }).check();
    await roomForm.getByRole('button', { name: 'Raum ändern' }).click();
    const confirm = page.getByRole('dialog', { name: 'Raum ändern?' });
    await expect(confirm).toContainText(`in ${rooms[1].name} statt ${rooms[0].name}`);
    await confirm.getByRole('button', { name: 'Ja, ändern' }).click();
    await expect
      .poll(async () => (await client.query<{ room_id: string }>(`SELECT room_id FROM course_days WHERE course_id = $1 ORDER BY on_date`, [courseId])).rows.map((r) => r.room_id))
      .toEqual([rooms[1].id, rooms[0].id, rooms[0].id]);

    panel = await openClass(page);
    const teacherForm = panel.locator('form').filter({ hasText: 'Lehrkraft ändern' });
    await teacherForm.getByRole('button', { name: 'Lehrkraft', exact: true }).click();
    await page.getByRole('menuitem', { name: new RegExp(`^${escape(teachers[1].name)}`) }).click();
    await teacherForm.getByRole('radio', { name: /bis Kursende$/ }).check();
    await teacherForm.getByRole('button', { name: 'Lehrkraft ändern' }).click();
    const sure = page.getByRole('dialog', { name: 'Lehrkraft ändern?' });
    await expect(sure).toContainText('bis zum Kursende');
    await sure.getByRole('button', { name: 'Ja, ändern' }).click();
    await expect
      .poll(async () => (await client.query<{ teacher_id: string; is_substitute: boolean }>(`SELECT teacher_id, is_substitute FROM course_days WHERE course_id = $1 ORDER BY on_date`, [courseId])).rows)
      .toEqual(DAYS.map(() => ({ teacher_id: teachers[1].id, is_substitute: false })));
    const plan = await client.query<{ teacher_id: string }>(`SELECT DISTINCT teacher_id FROM course_week_plans WHERE course_id = $1`, [courseId]);
    expect(plan.rows).toEqual([{ teacher_id: teachers[1].id }]);
  });

  /*
   * A class without a room (Rahman, 2026-10-21): „Raum zuweisen" where its room would be, the free rooms
   * that seat it and „Online" (0077) one click each, from that day to the end of the course; the Raumplan
   * then shows it under „Online", below the building.
   */
  test('a class without a room gets one from the Raumplan — here Online, to the end of the course', async ({ page }) => {
    await client.query(`UPDATE course_days SET room_id = NULL, replaced_room_id = NULL WHERE course_id = $1`, [courseId]);
    await client.query(`UPDATE course_week_plans SET room_id = NULL WHERE course_id = $1`, [courseId]);
    const online = (await client.query<{ id: string }>(`SELECT r.id FROM rooms r JOIN locations l ON l.id = r.location_id WHERE l.kind = 'online' AND r.name = 'Online 1'`)).rows[0];
    test.skip(!online, 'needs the room Online 1 (0077)');

    await page.goto(`/admin/day/rooms?date=${DAYS[0]}`);
    await page.getByRole('button', { name: 'Raum zuweisen' }).click();
    const panel = page.getByRole('dialog', { name: /^B1\.1/ });
    await expect(panel).toContainText('Diese Gruppe hat noch keinen Raum.');
    const roomForm = panel.locator('form').filter({ hasText: 'Frei und passend' });
    await roomForm.getByRole('button', { name: 'Online 1', exact: true }).click();
    await expect(roomForm.getByRole('radio', { name: /bis Kursende$/ })).toBeChecked();
    await roomForm.getByRole('button', { name: 'Raum zuweisen' }).click();
    const confirm = page.getByRole('dialog', { name: 'Raum zuweisen?' });
    await expect(confirm).toContainText('ist B1.1 in Online 1');
    await confirm.getByRole('button', { name: 'Ja, zuweisen' }).click();
    await expect
      .poll(async () => (await client.query<{ room_id: string }>(`SELECT room_id FROM course_days WHERE course_id = $1 ORDER BY on_date`, [courseId])).rows.map((r) => r.room_id))
      .toEqual(DAYS.map(() => online.id));

    await page.goto(`/admin/day/rooms?date=${DAYS[1]}`);
    await expect(page.getByRole('button', { name: 'Raum zuweisen' })).toHaveCount(0);
    await expect(page.getByText('Online 1', { exact: true })).toBeVisible();
  });
});
