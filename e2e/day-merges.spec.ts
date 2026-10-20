import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * A group taught with its parallel group (0074, 2026-10-20): from the class's panel in the Tagesplan, for
 * three days, with a reason; the Raumplan shows one class in the host's room and the Kurse list says where
 * the group is; from the middle day on the merge is lifted and the group has its room and teacher back.
 * A course of its own in June 2032 with two groups, so no real class is touched.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything it makes is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const DAYS = ['2032-06-07', '2032-06-08', '2032-06-09'];

test.describe('merging parallel groups', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let startId = '';
  let courseId = '';
  let teachers: { id: string }[] = [];
  let rooms: { id: string; name: string }[] = [];

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:day-merges')`,
      [rows[0].id, tokenHash]
    );
    teachers = (
      await client.query<{ id: string }>(
        `SELECT m.id FROM staff_members m JOIN people p ON p.id = m.person_id
          WHERE m.is_active AND EXISTS (SELECT 1 FROM staff_member_roles r WHERE r.staff_member_id = m.id AND r.role_code = 'teaching')
          ORDER BY p.first_name, p.last_name LIMIT 2`
      )
    ).rows;
    rooms = (await client.query<{ id: string; name: string }>(`SELECT id, coalesce(nickname, name) AS name FROM rooms WHERE is_active AND is_bookable AND kind = 'classroom' ORDER BY name LIMIT 2`)).rows;
    test.skip(teachers.length < 2 || rooms.length < 2, 'needs two teachers and two classrooms');
    startId = (
      await client.query<{ id: string }>(
        `INSERT INTO course_instances (course_type_id, start_date, end_date, schedule)
         SELECT id, '2032-06-07', '2032-07-02', '{"days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "time": "09:00-12:30"}'::jsonb
           FROM course_types WHERE slug = 'intensive-german' RETURNING id`
      )
    ).rows[0].id;
    courseId = (await client.query<{ id: string }>(`INSERT INTO courses (course_instance_id, level_code, groups, places_per_group) VALUES ($1, 'B2.1', 2, 14) RETURNING id`, [startId])).rows[0].id;
    for (const group of [1, 2]) {
      for (const weekday of [1, 2, 3, 4, 5]) {
        await client.query(
          `INSERT INTO course_week_plans (course_id, group_index, weekday, starts_at, ends_at, teacher_id, room_id) VALUES ($1, $2, $3, '09:00', '12:30', $4, $5)`,
          [courseId, group, weekday, teachers[group - 1].id, rooms[group - 1].id]
        );
      }
      for (const day of DAYS) {
        await client.query(`INSERT INTO course_days (course_id, group_index, on_date, teacher_id, room_id) VALUES ($1, $2, $3, $4, $5)`, [
          courseId,
          group,
          day,
          teachers[group - 1].id,
          rooms[group - 1].id,
        ]);
      }
    }
  });

  test.afterAll(async () => {
    if (!client) return;
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

  const group2 = async () =>
    (
      await client.query<{ on_date: string; merged: boolean; room_id: string | null; teacher_id: string | null; merge_reason: string | null; hosts: string }>(
        `SELECT to_char(d.on_date, 'YYYY-MM-DD') AS on_date, d.merged, d.room_id, d.teacher_id, d.merge_reason,
                (SELECT count(*) FROM course_day_merges m WHERE m.guest_day_id = d.id)::text AS hosts
           FROM course_days d WHERE d.course_id = $1 AND d.group_index = 2 ORDER BY d.on_date`,
        [courseId]
      )
    ).rows;

  test('merged for three days with a reason, shown as one class, lifted from the middle day on', async ({ page }) => {
    // Group 2 joins group 1 from Monday to Wednesday.
    await page.goto(`/admin/day/courses?date=${DAYS[0]}`);
    await page.getByRole('row').filter({ hasText: 'B2.1' }).filter({ hasText: rooms[1].name }).click();
    const panel = page.getByRole('dialog', { name: /^B2\.1/ });
    const form = panel.locator('form').filter({ hasText: 'Zusammenlegen mit' });
    await form.getByRole('checkbox').check();
    await form.getByRole('radio', { name: /^Bis/ }).check();
    await form.locator('input[type="date"]').fill(DAYS[2]);
    await form.getByRole('combobox').selectOption('sick');
    await form.getByRole('button', { name: 'Zusammenlegen' }).click();
    const confirm = page.getByRole('dialog', { name: 'Zusammenlegen?' });
    await expect(confirm).toContainText(`bei B2.1 (${rooms[0].name})`);
    await confirm.getByRole('button', { name: 'Ja, zusammenlegen' }).click();
    await expect.poll(async () => (await group2()).map((d) => [d.merged, d.room_id, d.teacher_id, d.merge_reason, d.hosts])).toEqual(
      DAYS.map(() => [true, null, null, 'sick', '1'])
    );

    // One class in the host's room; the group says where it is.
    await page.goto(`/admin/day/rooms?date=${DAYS[1]}`);
    await expect(page.getByRole('button', { name: /\+ B2\.1/ })).toBeVisible();
    await page.goto(`/admin/day/courses?date=${DAYS[1]}`);
    const guest = page.getByRole('row').filter({ hasText: `bei B2.1 · ${rooms[0].name}` });
    await expect(guest).toContainText('Krankheit');

    // Lifted from Tuesday on: Monday stays merged, Tuesday and Wednesday have their room and teacher back.
    await guest.click();
    const lift = page.getByRole('dialog', { name: /^B2\.1/ }).locator('form').filter({ hasText: 'Zusammenlegung aufheben' });
    await lift.getByRole('radio', { name: /^Ab/ }).check();
    await lift.getByRole('button', { name: 'Aufheben' }).click();
    await page.getByRole('dialog', { name: 'Zusammenlegung aufheben?' }).getByRole('button', { name: 'Ja, aufheben' }).click();
    await expect.poll(async () => (await group2()).map((d) => [d.merged, d.room_id, d.teacher_id, d.hosts])).toEqual([
      [true, null, null, '1'],
      [false, rooms[1].id, teachers[1].id, '0'],
      [false, rooms[1].id, teachers[1].id, '0'],
    ]);
  });
});
