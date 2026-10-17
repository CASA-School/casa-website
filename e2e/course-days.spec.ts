import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * Lesson days (2026-10-17, 0045): a course's weekly plan, its days made from it, and a day changed —
 * another teacher when someone is ill (the plan's is kept as the one replaced), another room, a day
 * called off — then the plan's teacher put back on every day ahead. An intensive course's days are the
 * board's: generating them gives Kursplanung its groups. Uses two `.1` courses of a future intensive
 * start with no days yet, and two teachers and two rooms of the database.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('Lesson days', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');
  test.describe.configure({ mode: 'serial' });

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let courseId = '';
  let otherId = '';
  let level = '';
  let groupsBefore: string[] = [];
  let teachers: { id: string; name: string }[] = [];
  let rooms: { id: string; name: string }[] = [];

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    // Two first-half courses of one future intensive start, neither with days or a plan yet.
    const { rows: courses } = await client.query<{ id: string; level_code: string; course_instance_id: string }>(
      `SELECT c.id, c.level_code, c.course_instance_id
         FROM courses c JOIN course_instances i ON i.id = c.course_instance_id JOIN course_types t ON t.id = i.course_type_id
        WHERE t.format = 'intensive' AND i.status <> 'cancelled' AND c.status <> 'cancelled' AND i.start_date > current_date
          AND c.level_code IN ('A1.1', 'A2.1', 'B1.1', 'B2.1') AND (i.session IS NOT NULL OR i.schedule->>'time' ~ '^\\d')
          AND NOT EXISTS (SELECT 1 FROM course_days d JOIN courses o ON o.id = d.course_id WHERE o.course_instance_id = i.id)
          AND NOT EXISTS (SELECT 1 FROM course_week_plans p JOIN courses o ON o.id = p.course_id WHERE o.course_instance_id = i.id)
        ORDER BY i.start_date, c.level_code`
    );
    const start = courses[0]?.course_instance_id;
    const pair = courses.filter((c) => c.course_instance_id === start);
    test.skip(pair.length < 2, 'no future intensive start with two levels and no days');
    [courseId, otherId, level] = [pair[0].id, pair[1].id, pair[0].level_code];
    teachers = (
      await client.query<{ id: string; name: string }>(
        `SELECT m.id, concat_ws(' ', p.first_name, p.last_name) AS name FROM staff_members m JOIN people p ON p.id = m.person_id
          WHERE m.is_active AND EXISTS (SELECT 1 FROM staff_member_roles r WHERE r.staff_member_id = m.id AND r.role_code = 'teaching')
            AND NOT EXISTS (SELECT 1 FROM staff_absences a WHERE a.staff_member_id = m.id AND a.on_date > current_date)
          ORDER BY p.last_name LIMIT 2`
      )
    ).rows;
    rooms = (await client.query<{ id: string; name: string }>(`SELECT id, coalesce(nickname, name) AS name FROM rooms WHERE is_active AND is_bookable AND kind = 'classroom' ORDER BY name LIMIT 2`)).rows;
    test.skip(teachers.length < 2 || rooms.length < 2, 'needs two teachers and two classrooms');
    groupsBefore = (await client.query<{ id: string }>(`SELECT id FROM course_groups`)).rows.map((r) => r.id);
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:course-days')`,
      [rows[0].id, tokenHash]
    );
  });

  test.afterAll(async () => {
    if (!client) return;
    const ids = [courseId, otherId].filter(Boolean);
    if (ids.length) {
      await client.query(`DELETE FROM course_days WHERE course_id = ANY($1::uuid[])`, [ids]);
      await client.query(`DELETE FROM course_week_plans WHERE course_id = ANY($1::uuid[])`, [ids]);
      await client.query(`DELETE FROM course_groups WHERE course_id = ANY($1::uuid[]) AND NOT (id = ANY($2::uuid[]))`, [ids, groupsBefore]);
      await client.query(`DELETE FROM staff_activity WHERE entity_id = ANY($1::uuid[])`, [ids]);
    }
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  const days = (id: string) =>
    client.query<{ on_date: string; dow: number; teacher_id: string | null; room_id: string | null; is_substitute: boolean; replaced_teacher_id: string | null; replaced_room_id: string | null; cancelled: boolean; group_id: string | null }>(
      `SELECT to_char(on_date, 'YYYY-MM-DD') AS on_date, extract(isodow FROM on_date)::int AS dow, teacher_id, room_id, is_substitute, replaced_teacher_id, replaced_room_id, cancelled, group_id
         FROM course_days WHERE course_id = $1 ORDER BY on_date`,
      [id]
    );

  test('a weekly plan makes the days, and a day takes another teacher, another room, or is called off', async ({ page }) => {
    const [a, b] = teachers;
    await page.goto(`/admin/catalogue/courses/${courseId}?tab=plan`);
    for (let d = 1; d <= 5; d++) {
      await page.locator(`select[name="teacher-${d}"]`).selectOption(a.id);
      await page.locator(`select[name="room-${d}"]`).selectOption(rooms[0].id);
    }
    await page.getByRole('button', { name: 'Wochenplan speichern' }).click();
    await expect(page.locator('select[name="teacher-5"]')).toHaveValue(a.id);

    await page.goto(`/admin/catalogue/courses/${courseId}`);
    await page.getByRole('button', { name: 'Kurstage erzeugen' }).click();
    await expect(page.getByRole('button', { name: 'Fehlende Tage erzeugen' })).toBeVisible();
    const made = (await days(courseId)).rows;
    expect(made.length).toBeGreaterThan(20);
    expect(made.every((d) => d.dow <= 5 && d.teacher_id === a.id && d.room_id === rooms[0].id)).toBe(true);
    // The board's groups for the course's two months, and its days on them.
    const { rows: groups } = await client.query<{ phase: string }>(`SELECT phase FROM course_groups WHERE course_id = $1 ORDER BY phase`, [courseId]);
    expect(groups.map((g) => g.phase)).toEqual(['1', '2']);
    expect(made.filter((d) => d.group_id).length).toBeGreaterThan(10);

    // Ill: someone else teaches the first day, in another room.
    const dialog = page.getByRole('dialog');
    await page.getByRole('button', { name: 'Ändern' }).first().click();
    await dialog.locator('select[name="teacherId"]').selectOption(b.id);
    await dialog.locator('select[name="roomId"]').selectOption(rooms[1].id);
    await dialog.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText(`für ${a.name}`)).toBeVisible();
    await expect(page.getByText(`statt ${rooms[0].name}`)).toBeVisible();
    const [first] = (await days(courseId)).rows;
    expect(first).toMatchObject({ teacher_id: b.id, is_substitute: true, replaced_teacher_id: a.id, room_id: rooms[1].id, replaced_room_id: rooms[0].id });

    // The second day is called off, with its reason.
    await page.getByRole('button', { name: 'Ändern' }).nth(1).click();
    await dialog.getByLabel('Fällt aus').check();
    await dialog.getByLabel('Grund').fill('e2e: Lehrkraft krank');
    await dialog.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('e2e: Lehrkraft krank')).toBeVisible();
    expect((await days(courseId)).rows[1].cancelled).toBe(true);
  });

  test('another course that day sees the teacher as taken', async ({ page }) => {
    const [, b] = teachers;
    await page.goto(`/admin/catalogue/courses/${otherId}`);
    await page.getByRole('button', { name: 'Kurstage erzeugen' }).click();
    await expect(page.getByRole('button', { name: 'Fehlende Tage erzeugen' })).toBeVisible();
    await page.getByRole('button', { name: 'Ändern' }).first().click();
    await expect(page.getByRole('dialog').locator('select[name="teacherId"] option', { hasText: `${b.name} · unterrichtet ${level}` })).toHaveCount(1);
  });

  test('the plan’s teacher goes back onto every day ahead', async ({ page }) => {
    const [a] = teachers;
    await page.goto(`/admin/catalogue/courses/${courseId}?tab=plan`, { waitUntil: 'networkidle' });
    // The confirmation opens once the page is hydrated.
    await expect(async () => {
      await page.getByRole('button', { name: 'Lehrkräfte übernehmen' }).click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await page.getByRole('dialog').getByRole('button', { name: 'Übernehmen' }).click();
    await expect(page.getByText(`für ${a.name}`)).toHaveCount(0);
    const rows = (await days(courseId)).rows;
    expect(rows[0]).toMatchObject({ teacher_id: a.id, is_substitute: false, replaced_teacher_id: null });
    // A day called off stays off.
    expect(rows[1].cancelled).toBe(true);
  });
});
