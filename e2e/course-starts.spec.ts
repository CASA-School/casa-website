import { createHash, randomBytes } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';
import pg from 'pg';

/**
 * A course start, planned and kept right (2026-10-17, audit of the planning screens):
 *
 * - „Termin planen" reads an en dash in the hours, fills empty hours from the time of day, makes the
 *   courses with the places per group given, keeps the start off the website until ticked, and opens it.
 * - The start's „Bearbeiten" puts it on the website; one planned here and never used is deleted.
 * - Kursplanung offers no slot before the start's first day (the planning month opens on the Monday
 *   of the week the 1st falls in).
 * - The course page marks a teacher who is away on a day, and counts the day as without a teacher.
 * - A `.2` learner waiting on the running course of the start before shows on the start they asked
 *   for, and a closed course has no free place on either screen.
 *
 * Runs only with a database and an owner account, in German (pinned). Its starts are in 2030 and
 * everything it makes is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('course starts', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');
  test.describe.configure({ mode: 'serial' });

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let ownerId = '';
  const starts: string[] = [];
  const people: string[] = [];
  let staffId = '';

  const startByTitle = async (title: string) => (await client.query<{ id: string }>(`SELECT id FROM course_instances WHERE title = $1`, [title])).rows[0]?.id;

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    ownerId = rows[0].id;
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:course-starts')`,
      [ownerId, tokenHash]
    );
  });

  test.afterAll(async () => {
    if (!client) return;
    for (const title of ['E2E Termin Vormittag', 'E2E Termin Spezial', 'E2E Termin Nachmittag']) {
      const id = await startByTitle(title);
      if (id && !starts.includes(id)) starts.push(id);
    }
    if (starts.length) {
      const courses = (await client.query<{ id: string }>(`SELECT id FROM courses WHERE course_instance_id = ANY($1::uuid[])`, [starts])).rows.map((r) => r.id);
      await client.query(`DELETE FROM course_groups WHERE course_id = ANY($1::uuid[])`, [courses]);
      await client.query(`DELETE FROM staff_activity WHERE entity_id = ANY($1::uuid[])`, [[...starts, ...courses]]);
      await client.query(`DELETE FROM course_instances WHERE id = ANY($1::uuid[])`, [starts]);
    }
    if (staffId) {
      await client.query(`DELETE FROM staff_absences WHERE staff_member_id = $1`, [staffId]);
      await client.query(`DELETE FROM staff_member_roles WHERE staff_member_id = $1`, [staffId]);
      await client.query(`DELETE FROM staff_members WHERE id = $1`, [staffId]);
    }
    if (people.length) await client.query(`DELETE FROM people WHERE id = ANY($1::uuid[])`, [people]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  /** „Termin planen" from the course list, filled as a colleague would. */
  async function plan(page: Page, f: { type: string; start: string; end: string; session?: string; time?: string; title: string }) {
    await page.goto('/admin/catalogue');
    const dialog = page.getByRole('dialog');
    await expect(async () => {
      await page.getByRole('button', { name: 'Termin planen' }).first().click();
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await dialog.locator('select[name="courseTypeId"]').selectOption({ label: f.type });
    for (const [field, value] of [
      ['#cohort-start', f.start],
      ['#cohort-end', f.end],
    ] as const) {
      await dialog.locator(field).click();
      await dialog.locator(field).fill(value);
      await page.keyboard.press('Tab');
      await dialog.locator('h2').first().click();
    }
    if (f.session) await dialog.locator('#cohort-session').selectOption(f.session);
    if (f.time !== undefined) await dialog.locator('#cohort-time').fill(f.time);
    await dialog.locator('#cohort-title').fill(f.title);
    await expect(dialog.locator('input[name="onWebsite"]')).not.toBeChecked();
    await dialog.getByRole('button', { name: 'Termin planen' }).click();
  }

  test('„Termin planen" reads the hours, stays off the website and opens the new start', async ({ page }) => {
    // Empty hours on a morning start: the morning's.
    await plan(page, { type: 'Intensivkurs', start: '04.03.2030', end: '26.04.2030', session: 'morning', time: '', title: 'E2E Termin Vormittag' });
    await expect(page).toHaveURL(/\/admin\/catalogue\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1, name: 'E2E Termin Vormittag' })).toBeVisible();
    await expect(page.getByText('Nicht auf der Website')).toBeVisible();
    const id = page.url().split('/').pop()!;
    starts.push(id);
    const { rows } = await client.query<{ schedule: { time: string }; on_website: boolean; places: number[] }>(
      `SELECT i.schedule, i.on_website, array_agg(c.places_per_group) AS places FROM course_instances i JOIN courses c ON c.course_instance_id = i.id WHERE i.id = $1 GROUP BY i.id`,
      [id]
    );
    expect(rows[0].schedule.time).toBe('09:00-12:30');
    expect(rows[0].on_website).toBe(false);
    expect(rows[0].places.length).toBe(6);
    expect(rows[0].places.every((n) => n === 14)).toBe(true);

    // Hours typed with an en dash and spaces.
    await plan(page, { type: 'Spezialkurs', start: '06.05.2030', end: '28.06.2030', time: '18:30 – 20:00', title: 'E2E Termin Spezial' });
    await expect(page.getByRole('heading', { level: 1, name: 'E2E Termin Spezial' })).toBeVisible();
    starts.push(page.url().split('/').pop()!);
    expect((await client.query<{ time: string }>(`SELECT schedule->>'time' AS time FROM course_instances WHERE id = $1`, [starts[1]])).rows[0].time).toBe('18:30-20:00');
  });

  test('a start goes on the website from its page, and one planned by mistake is deleted', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await page.goto(`/admin/catalogue/${starts[1]}`);
    await expect(async () => {
      await page.getByRole('button', { name: 'Bearbeiten', exact: true }).first().click();
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await dialog.locator('input[name="onWebsite"]').check();
    await dialog.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Nicht auf der Website')).toHaveCount(0);
    expect((await client.query<{ on_website: boolean }>(`SELECT on_website FROM course_instances WHERE id = $1`, [starts[1]])).rows[0].on_website).toBe(true);

    await page.getByRole('button', { name: 'Termin löschen' }).click();
    await dialog.getByRole('button', { name: 'Löschen' }).click();
    await expect(page).toHaveURL(/\/admin\/catalogue$/);
    expect(await startByTitle('E2E Termin Spezial')).toBeUndefined();
  });

  test('Kursplanung has no slot before the start, and the course page marks a teacher who is away', async ({ page }) => {
    const course = (await client.query<{ id: string }>(`SELECT id FROM courses WHERE course_instance_id = $1 AND level_code = 'A1.1'`, [starts[0]])).rows[0].id;
    await page.goto(`/admin/catalogue/courses/${course}`);
    await page.getByRole('button', { name: 'Kurstage erzeugen' }).click();
    await expect(page.getByRole('button', { name: 'Fehlende Tage erzeugen' })).toBeVisible();
    const group = (await client.query<{ id: string }>(`SELECT id FROM course_groups WHERE course_id = $1 AND month = '2030-03-01'`, [course])).rows[0].id;

    // March 2030 opens on Monday 25 February; the start is Monday 4 March.
    await page.goto('/admin/kursplanung?month=2030-03');
    await page.getByRole('button', { name: 'Monat', exact: true }).click();
    await expect(page.locator(`button[data-group="${group}"][data-date="2030-03-04"]`)).toHaveCount(1);
    expect(await page.locator(`button[data-group="${group}"]`).evaluateAll((els) => els.filter((e) => (e as HTMLElement).dataset.date! < '2030-03-04').length)).toBe(0);

    // A teacher of the course's first two days, away on the first.
    const person = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('E2E', 'Lehrkraft', 'e2e') RETURNING id`)).rows[0].id;
    people.push(person);
    staffId = (await client.query<{ id: string }>(`INSERT INTO staff_members (short_name, person_id) VALUES ('E2E L', $1) RETURNING id`, [person])).rows[0].id;
    const days = (await client.query<{ id: string; on_date: string }>(`SELECT id, to_char(on_date, 'YYYY-MM-DD') AS on_date FROM course_days WHERE course_id = $1 ORDER BY on_date LIMIT 2`, [course])).rows;
    await client.query(`UPDATE course_days SET teacher_id = $2 WHERE id = ANY($1::uuid[])`, [days.map((d) => d.id), staffId]);
    await client.query(`INSERT INTO staff_absences (staff_member_id, on_date, reason) VALUES ($1, $2, 'Krank')`, [staffId, days[0].on_date]);
    const total = (await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM course_days WHERE course_id = $1`, [course])).rows[0].n;

    await page.goto(`/admin/catalogue/courses/${course}`);
    // The week grid names the teacher by their short name, and marks the day they are away.
    const taught = page.getByRole('cell').filter({ hasText: 'E2E L' });
    await expect(taught.first()).toContainText('Krank');
    await expect(taught.nth(1)).not.toContainText('Krank');
    // Every day but the one the teacher is there for.
    await expect(page.getByText('Ohne Lehrkraft').locator('..')).toContainText(String(total - 1));
  });

  test('a joiner waiting on the running course shows on their start, and a closed course has no free place', async ({ page }) => {
    // An afternoon start while the morning one runs: its A2.2 is the morning start's A2.1.
    const next = (
      await client.query<{ id: string }>(
        `INSERT INTO course_instances (course_type_id, start_date, end_date, capacity, schedule, status, session, title, on_website, created_by)
         SELECT id, '2030-04-01', '2030-05-23', 14, '{"days":["Mon","Tue","Wed","Thu"],"time":"13:00-17:30"}', 'scheduled', 'afternoon', 'E2E Termin Nachmittag', false, $1
           FROM course_types WHERE slug = 'intensive-german' RETURNING id`,
        [ownerId]
      )
    ).rows[0].id;
    starts.push(next);
    const running = (await client.query<{ id: string }>(`SELECT id FROM courses WHERE course_instance_id = $1 AND level_code = 'A2.1'`, [starts[0]])).rows[0].id;
    const person = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('E2E', 'Nachrücker', 'e2e') RETURNING id`)).rows[0].id;
    people.push(person);
    await client.query(
      `INSERT INTO waitlist_entries (person_id, course_instance_id, level_code, course_id, rank, source) VALUES ($1, $2, 'A2.2', $3, extract(epoch FROM now()), 'office')`,
      [person, next, running]
    );

    // Closed: full on both screens.
    await client.query(`UPDATE courses SET bookable = false WHERE id = $1`, [running]);
    await page.goto(`/admin/catalogue/${next}`);
    const card = page.locator('#level-A2\\.2');
    await expect(card).toContainText('Voll');
    await expect(card).toContainText('im laufenden Kurs A2.1');
    await expect(card.getByRole('listitem').filter({ hasText: 'E2E Nachrücker' })).toBeVisible();
    await page.goto('/admin/catalogue/waitlist?view=waiting&q=Nachr%C3%BCcker');
    await expect(page.getByText(/A2\.2 · voll/)).toBeVisible();

    // Open again: a place is free for the learner, the same on both.
    await client.query(`UPDATE courses SET bookable = true WHERE id = $1`, [running]);
    await page.goto(`/admin/catalogue/${next}`);
    await expect(card.getByRole('status')).toContainText('E2E Nachrücker');
    await page.goto('/admin/catalogue/waitlist?view=free&q=Nachr%C3%BCcker');
    await expect(page.getByText(/A2\.2 · 14 Plätze frei/)).toBeVisible();
  });
});
