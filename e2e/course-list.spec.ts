import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * The course list (2026-10-17): a view per kind of work — the intensive courses (morning and afternoon
 * on one page), the evening by Monday + Wednesday and Tuesday + Thursday, the rest — current or past; under each start
 * its courses, a course's parallel groups one row each with their own teachers (at most two) and room.
 * Makes its own evening start in April 2027 with a course of two groups and their lesson days.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('Course list', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');
  test.describe.configure({ mode: 'serial' });

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let startId = '';
  let courseId = '';
  let teachers: { id: string; short: string }[] = [];

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    const { rows: type } = await client.query<{ id: string }>(`SELECT id FROM course_types WHERE format = 'evening' ORDER BY position LIMIT 1`);
    test.skip(type.length === 0, 'no evening course type');
    teachers = (
      await client.query<{ id: string; short: string }>(
        `SELECT id, short_name AS short FROM staff_members WHERE is_active AND nullif(trim(short_name), '') IS NOT NULL ORDER BY short_name LIMIT 3`
      )
    ).rows;
    test.skip(teachers.length < 3, 'needs three colleagues with a short name');
    // Tuesday + Thursday evenings, from Tue 13 Apr 2027, within the list's six months ahead.
    startId = (
      await client.query<{ id: string }>(
        `INSERT INTO course_instances (course_type_id, start_date, end_date, capacity, schedule, status, session, on_website)
         VALUES ($1, '2027-04-13', '2027-06-24', 14, '{"days":["Tue","Thu"],"time":"18:30-20:00"}', 'scheduled', 'evening', false) RETURNING id`,
        [type[0].id]
      )
    ).rows[0].id;
    courseId = (await client.query<{ id: string }>(`INSERT INTO courses (course_instance_id, level_code, groups) VALUES ($1, 'B1.1', 2) RETURNING id`, [startId])).rows[0].id;
    // Group 1 by the first two colleagues, with a substitute day by the third; group 2 by the third.
    const days = ['2027-04-13', '2027-04-15', '2027-04-20', '2027-04-22'];
    for (const [i, day] of days.entries()) {
      await client.query(`INSERT INTO course_days (course_id, group_index, on_date, teacher_id) VALUES ($1, 1, $2::date, $3)`, [courseId, day, teachers[i % 2].id]);
      await client.query(`INSERT INTO course_days (course_id, group_index, on_date, teacher_id) VALUES ($1, 2, $2::date, $3)`, [courseId, day, teachers[2].id]);
    }
    await client.query(`INSERT INTO course_days (course_id, group_index, on_date, teacher_id, is_substitute) VALUES ($1, 1, '2027-04-27', $2, true)`, [courseId, teachers[2].id]);
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:course-list')`,
      [rows[0].id, tokenHash]
    );
  });

  test.afterAll(async () => {
    if (!client) return;
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

  test('a view per kind of work, current or past', async ({ page }) => {
    await page.goto('/admin/catalogue');
    const views = page.getByRole('navigation', { name: 'Ansichten' });
    for (const name of [/^Intensiv/, /^Abend/, /^Weitere/, /^Kursarten/]) await expect(views.getByRole('link', { name })).toBeVisible();
    await page.getByRole('link', { name: 'Vergangen' }).click();
    await expect(page).toHaveURL(/time=past/);
    await expect(page.getByRole('link', { name: 'Aktuell' })).toBeVisible();
  });

  test('the evening by its days, a course’s groups apart, each with its own main teachers', async ({ page }) => {
    await page.goto('/admin/catalogue?view=evening');
    const tt = page.getByRole('columnheader', { name: /^Dienstag \+ Donnerstag/ });
    await expect(tt).toBeVisible();
    const start = page.locator(`tr[data-start="${startId}"]`);
    await expect(start).toContainText('Di + Do');
    // The course's first row carries its level; each group is a row of its own with its main teachers.
    const g1 = page.locator('tr').filter({ has: page.locator(`a[href="/admin/catalogue/courses/${courseId}"]`) });
    await expect(g1).toContainText(`${teachers[0].short} · ${teachers[1].short}`);
    // The substitute is not a main teacher of group 1; group 2 has its own.
    await expect(g1).not.toContainText(teachers[2].short);
    await expect(g1.locator('xpath=following-sibling::tr[1]')).toContainText(teachers[2].short);
    await expect(page.getByText('Gruppen', { exact: false })).toHaveCount(0);
  });
});
