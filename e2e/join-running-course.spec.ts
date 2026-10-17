import { createHash, randomBytes } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';
import pg from 'pg';

import { isSchoolClosed } from '../src/config/school-closures';

/**
 * Joining a course already running (2026-10-17): the wizard asks „Einstieg ab" for a start that has
 * begun, the booking starts on that Monday and is priced for the weeks from it, and a learner joining an
 * intensive course from its fifth teaching week starts at the `.2` step — in that start's own course,
 * not the one before. Uses the intensive start running today that still has a week after this one.
 *
 * SchoolMan's learners per course and week (0050) and its closed courses would make the course full;
 * they are set aside for the run and put back after. Runs only with a database and an owner account,
 * in German (pinned). Everything made here is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;

type Start = { id: string; start_date: string; end_date: string; last_monday: string };

const ddmmyy = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(2, 4)}`;
const addDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

test.describe('Joining a running course', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');
  test.describe.configure({ mode: 'serial' });

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  const people: string[] = [];
  let start: Start | null = null;
  let future: { id: string; start_date: string; end_date: string } | null = null;
  let ownCourse = '';
  // Set aside for the run: SchoolMan's weekly learners on the start's courses, and the courses it closed.
  let weekly: { course_id: string; monday: string; learners: number; read_at: string }[] = [];
  let reopened: string[] = [];

  const person = async (first: string) => {
    const id = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ($1, 'Audittest', 'e2e') RETURNING id`, [first])).rows[0].id;
    people.push(id);
    return id;
  };

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:join-running-course')`,
      [rows[0].id, tokenHash]
    );
    // The intensive start running today with at least one more week; its last Monday is in its second half.
    start =
      (
        await client.query<Start>(
          `SELECT i.id, to_char(i.start_date, 'YYYY-MM-DD') AS start_date, to_char(i.end_date, 'YYYY-MM-DD') AS end_date,
                  to_char(date_trunc('week', i.end_date), 'YYYY-MM-DD') AS last_monday
             FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
            WHERE t.format = 'intensive' AND i.status <> 'cancelled' AND i.start_date < current_date AND i.end_date >= current_date + 7
            ORDER BY i.start_date DESC LIMIT 1`
        )
      ).rows[0] ?? null;
    test.skip(!start, 'no intensive course running with a week left');
    future =
      (
        await client.query<{ id: string; start_date: string; end_date: string }>(
          `SELECT i.id, to_char(i.start_date, 'YYYY-MM-DD') AS start_date, to_char(i.end_date, 'YYYY-MM-DD') AS end_date
             FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
            WHERE t.format = 'intensive' AND i.status <> 'cancelled' AND i.start_date > current_date
            ORDER BY i.start_date LIMIT 1`
        )
      ).rows[0] ?? null;
    await client.query(
      `INSERT INTO courses (course_instance_id, level_code) VALUES ($1, 'B1.1') ON CONFLICT (course_instance_id, level_code) WHERE level_code IS NOT NULL DO NOTHING`,
      [start!.id]
    );
    ownCourse = (await client.query<{ id: string }>(`SELECT id FROM courses WHERE course_instance_id = $1 AND level_code = 'B1.1'`, [start!.id])).rows[0].id;
    weekly = (
      await client.query(
        `DELETE FROM course_week_learners WHERE course_id IN (SELECT id FROM courses WHERE course_instance_id = $1)
         RETURNING course_id, to_char(monday, 'YYYY-MM-DD') AS monday, learners, read_at`,
        [start!.id]
      )
    ).rows;
    reopened = (
      await client.query<{ id: string }>(`UPDATE courses SET bookable = true WHERE course_instance_id = $1 AND NOT bookable AND status <> 'cancelled' RETURNING id`, [start!.id])
    ).rows.map((r) => r.id);
  });

  test.afterAll(async () => {
    if (!client) return;
    const bookings = (await client.query<{ id: string }>(`SELECT id FROM bookings WHERE person_id = ANY($1::uuid[])`, [people])).rows.map((r) => r.id);
    await client.query(`DELETE FROM staff_activity WHERE entity_id = ANY($1::uuid[])`, [[...people, ...bookings]]);
    await client.query(`DELETE FROM bookings WHERE id = ANY($1::uuid[])`, [bookings]);
    await client.query(`DELETE FROM people WHERE id = ANY($1::uuid[])`, [people]);
    for (const w of weekly) {
      await client.query(`INSERT INTO course_week_learners (course_id, monday, learners, read_at) VALUES ($1, $2::date, $3, $4) ON CONFLICT DO NOTHING`, [
        w.course_id,
        w.monday,
        w.learners,
        w.read_at,
      ]);
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

  /** From the level step: no books, no stay, the booking made. Its id. */
  async function finish(page: Page) {
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Nein' }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await dialog.getByRole('button', { name: 'Nein' }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await dialog.getByRole('button', { name: 'Buchung anlegen' }).click();
    await expect(page).toHaveURL(/\/admin\/bookings\/[0-9a-f-]{36}$/);
    return page.url().split('/').pop()!;
  }

  const periodsOf = async (bookingId: string) =>
    (
      await client.query<{ level_code: string; start_date: string; end_date: string; course_instance_id: string; course_id: string }>(
        `SELECT level_code, to_char(start_date, 'YYYY-MM-DD') AS start_date, to_char(end_date, 'YYYY-MM-DD') AS end_date, course_instance_id, course_id
           FROM booking_periods WHERE booking_id = $1`,
        [bookingId]
      )
    ).rows;

  test('a link from the course joins in the last week at B1.2, in this start’s own course', async ({ page }) => {
    const id = await person('Lea');
    const s = start!;
    await page.goto(`/admin/people/${id}?book=1&cohort=${s.id}&level=B1.1&from=${s.last_monday}`);
    const dialog = page.getByRole('dialog');
    // The week came with the link: the wizard opens at the level, moved to the second half.
    await expect(dialog.locator('[aria-current="step"]')).toContainText('Niveau');
    await expect(dialog.getByRole('button', { name: /^B1\.2/ })).toHaveClass(/casa-ink-deep/);
    await expect(dialog).toContainText(`Einstieg ab ${ddmmyy(s.last_monday)}`);
    await expect(dialog).not.toContainText('Wie viel von B1?');
    const bookingId = await finish(page);

    const [period] = await periodsOf(bookingId);
    expect(period).toMatchObject({ level_code: 'B1.2', start_date: s.last_monday, end_date: s.end_date, course_instance_id: s.id, course_id: ownCourse });
    // One week, priced as one week.
    const { rows: tuition } = await client.query<{ description: string; amount: string }>(
      `SELECT description, amount FROM booking_charges WHERE booking_id = $1 AND kind = 'tuition'`,
      [bookingId]
    );
    expect(tuition[0].description).toBe(`Intensivkurs B1.2 · ${ddmmyy(s.last_monday)} – ${ddmmyy(s.end_date)}`);
    const { rows: rate } = await client.query<{ amount: string }>(
      `SELECT r.amount FROM rates r JOIN course_types t ON t.id = r.course_type_id
        WHERE t.slug = 'intensive-german' AND r.scope = 'course_type' AND r.min_quantity = 1 AND r.max_quantity = 1
          AND r.valid_from <= $1::date AND (r.valid_to IS NULL OR r.valid_to >= $1::date) ORDER BY r.valid_from DESC LIMIT 1`,
      [s.start_date]
    );
    if (rate[0]) expect(Number(tuition[0].amount)).toBe(Number(rate[0].amount));
    // Places are counted per week: the joiner is in the course's last week only.
    const { rows: weeks } = await client.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM generate_series(date_trunc('week', $1::date), $2::date, interval '7 days')`,
      [period.start_date, period.end_date]
    );
    expect(weeks[0].n).toBe(1);
  });

  test('in the wizard a running start asks „Einstieg ab", the next Monday chosen', async ({ page }) => {
    const id = await person('Max');
    const s = start!;
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());
    const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
    const monday = weekday === 0 ? today : addDays(today, 7 - weekday);
    test.skip(isSchoolClosed(monday), 'the school is closed next week');
    const dialog = page.getByRole('dialog');
    await page.goto(`/admin/people/${id}`);
    await page.getByRole('button', { name: 'Neue Buchung' }).click();
    await dialog.getByRole('button', { name: /^Einen Kurs/ }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await dialog.getByRole('button', { name: /^Intensivkurs/ }).click();
    await dialog.getByRole('button', { name: new RegExp(`${ddmmyy(s.start_date).replace(/\./g, '\\.')} – ${ddmmyy(s.end_date).replace(/\./g, '\\.')}`) }).click();
    await expect(dialog).toContainText('Einstieg ab');
    const chosen = dialog.getByRole('button', { name: new RegExp(`Mo ${monday.slice(8, 10)}\\.${monday.slice(5, 7)}\\.`) });
    await expect(chosen).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await dialog.getByRole('button', { name: /^B1\.1/ }).click();
    const bookingId = await finish(page);

    // From that Monday to the end, in this start's B1.1 course — at B1.1 or, past its fourth week, B1.2.
    const [period] = await periodsOf(bookingId);
    expect(period).toMatchObject({ start_date: monday, end_date: s.end_date, course_instance_id: s.id, course_id: ownCourse });
    expect(['B1.1', 'B1.2']).toContain(period.level_code);
  });

  test('a start not yet begun asks nothing new', async ({ page }) => {
    test.skip(!future, 'no intensive start ahead');
    const id = await person('Ina');
    await page.goto(`/admin/people/${id}?book=1&cohort=${future!.id}&level=B1.1&from=${addDays(future!.start_date, 14)}`);
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('[aria-current="step"]')).toContainText('Niveau');
    await expect(dialog).toContainText('Wie viel von B1?');
    await expect(dialog).not.toContainText('Einstieg ab');
    await expect(dialog.locator('input[name="joinFrom"]')).toHaveCount(0);
  });

  test('a new person made from a course’s „Buchen" lands at the start, the level and the week', async ({ page }) => {
    const s = start!;
    await page.goto('/admin/people?new=1&then=book');
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Vorname').fill('Ole');
    await dialog.getByLabel('Nachname').fill('Audittest');
    // The course's form carries these as hidden fields.
    await dialog.locator('form').first().evaluate(
      (form, fields) => {
        for (const [name, value] of Object.entries(fields)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          form.appendChild(input);
        }
      },
      { cohort: s.id, level: 'B1.1', from: s.last_monday }
    );
    await dialog.getByRole('button', { name: 'Weiter zur Buchung' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/people/[0-9a-f-]{36}\\?book=1&cohort=${s.id}&level=B1\\.1&from=${s.last_monday}$`));
    people.push(new URL(page.url()).pathname.split('/').pop()!);
    await expect(page.getByRole('dialog')).toContainText(`Einstieg ab ${ddmmyy(s.last_monday)}`);
  });
});
