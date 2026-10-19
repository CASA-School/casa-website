import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * The Tagesplan (2026-10-19): FileMaker's calendar, Cmd+1, as pages opened from the top bar. A task is
 * written onto a day, its state chosen from a menu, folded away when done, changed and deleted; one
 * left open yesterday is carried onto today. The tiles open side panels: reception's usual shift, and
 * a colleague reported ill. On a day with lessons, a learner is found by name on „Kurse", the class
 * opens at the side with its attendance sheet, and the room plan draws it. The views keep the day.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything it makes is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('Tagesplan', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let ownerId = '';
  let personId = '';
  let staffId = '';
  let today = '';
  const stamp = randomBytes(3).toString('hex');

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    ownerId = rows[0].id;
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:day')`,
      [ownerId, tokenHash]
    );
    today = (await client.query<{ d: string }>(`SELECT to_char((now() AT TIME ZONE 'Europe/Berlin')::date, 'YYYY-MM-DD') AS d`)).rows[0].d;
    // A reception colleague with a shift on every weekday.
    personId = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Tara', 'Tagesplantest', 'e2e') RETURNING id`)).rows[0].id;
    staffId = (await client.query<{ id: string }>(`INSERT INTO staff_members (person_id, short_name, desk, is_active) VALUES ($1, 'Tara T.', 'front', true) RETURNING id`, [personId])).rows[0].id;
    await client.query(
      `INSERT INTO staff_shifts (staff_member_id, weekday, starts_at, ends_at) SELECT $1, w, '07:45', '14:15' FROM generate_series(1, 7) w`,
      [staffId]
    );
  });

  test.afterAll(async () => {
    if (!client) return;
    await client.query(`DELETE FROM day_tasks WHERE body LIKE $1`, [`%Tagesplantest ${stamp}%`]);
    if (staffId) await client.query(`DELETE FROM staff_absences WHERE staff_member_id = $1`, [staffId]);
    if (staffId) await client.query(`DELETE FROM staff_members WHERE id = $1`, [staffId]);
    if (personId) await client.query(`DELETE FROM people WHERE id = $1`, [personId]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  test('a task: written onto a day, done from its menu, changed, deleted', async ({ page }) => {
    // A Wednesday far enough ahead that SchoolMan has nothing on it.
    await page.goto('/admin/day?date=2027-06-16');
    await expect(page.getByRole('heading', { level: 1, name: 'Tagesplan' })).toBeVisible();
    const tasks = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Aufgaben' }) });

    // One quiet line; the time and whom it is for come once a colleague starts.
    await tasks.getByPlaceholder(/^Neue Aufgabe für/).fill(`Kopierer prüfen — Tagesplantest ${stamp}`);
    await tasks.getByLabel('Uhrzeit').fill('10:15');
    await tasks.getByRole('button', { name: 'Hinzufügen' }).click();
    const row = tasks.getByRole('listitem').filter({ hasText: `Tagesplantest ${stamp}` });
    await expect(row).toContainText('10:15');
    await expect(row).toContainText('Offen');

    // Done, chosen from the menu: who and when are kept, and the task folds away under „Erledigt".
    await row.getByRole('button', { name: 'Stand' }).click();
    await page.getByRole('menuitem', { name: 'Erledigt' }).click();
    await expect.poll(async () => (await client.query<{ status: string; done_by: string }>(`SELECT status, done_by FROM day_tasks WHERE body LIKE $1`, [`%Tagesplantest ${stamp}%`])).rows[0]).toEqual({
      status: 'done',
      done_by: ownerId,
    });
    await tasks.locator('summary', { hasText: 'Erledigt' }).click();
    await expect(row).toContainText('Erledigt');

    // Changed in its dialog.
    await row.hover();
    await row.getByRole('button', { name: 'Ändern' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Aufgabe').fill(`Kopierer und Drucker prüfen — Tagesplantest ${stamp}`);
    await dialog.getByRole('button', { name: 'Speichern' }).click();
    await expect.poll(async () => (await client.query(`SELECT 1 FROM day_tasks WHERE body LIKE $1`, [`Kopierer und Drucker prüfen — Tagesplantest ${stamp}`])).rowCount).toBe(1);

    // Deleted, after the confirmation.
    await page.reload();
    await tasks.locator('summary', { hasText: 'Erledigt' }).click();
    await row.hover();
    await row.getByRole('button', { name: 'Ändern' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Aufgabe löschen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Löschen', exact: true }).click();
    await expect.poll(async () => (await client.query(`SELECT 1 FROM day_tasks WHERE body LIKE $1`, [`%Tagesplantest ${stamp}%`])).rowCount).toBe(0);
  });

  test('a task left open yesterday is carried onto today', async ({ page }) => {
    await client.query(`INSERT INTO day_tasks (on_date, body, created_by) VALUES ($1::date - 1, $2, $3)`, [today, `Rückruf Agentur — Tagesplantest ${stamp}`, ownerId]);
    await page.goto('/admin/day');
    await expect(page.getByText('Von den Tagen davor, noch offen')).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: `Rückruf Agentur — Tagesplantest ${stamp}` })).toBeVisible();
  });

  test('the tiles open side panels: reception shows the usual shift; reported ill, the colleague is away', async ({ page }) => {
    // Absences are kept for weekdays only, as on a colleague's page.
    test.skip(new Date(`${today}T12:00:00Z`).getUTCDay() % 6 === 0, 'today is a weekend');
    await page.goto('/admin/day');
    await page.getByRole('button', { name: /^Im Haus/ }).click();
    const desk = page.getByRole('dialog', { name: 'Im Haus' });
    await expect(desk.getByRole('listitem').filter({ hasText: 'Tara Tagesplantest' })).toContainText('07:45–14:15');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /^Abwesend/ }).click();
    await page.getByRole('dialog', { name: 'Abwesend' }).getByRole('button', { name: 'Abwesenheit eintragen' }).click();
    const form = page.getByRole('dialog', { name: 'Abwesenheit eintragen' });
    await form.getByLabel('Wer').selectOption({ label: 'Tara Tagesplantest' });
    await form.getByLabel('Grund').selectOption({ label: 'Krank' });
    await form.getByRole('button', { name: 'Eintragen' }).click();
    await expect.poll(async () => (await client.query(`SELECT 1 FROM staff_absences WHERE staff_member_id = $1 AND reason = 'Krank'`, [staffId])).rowCount).toBeGreaterThan(0);

    await page.goto('/admin/day');
    await expect(page.getByRole('button', { name: /^Abwesend/ })).toContainText('Tara');
    await page.getByRole('button', { name: /^Abwesend/ }).click();
    await expect(page.getByRole('dialog', { name: 'Abwesend' }).getByRole('listitem').filter({ hasText: 'Tara Tagesplantest' })).toContainText('Krank');
  });

  test('the courses and the room plan of a day: a learner found by name, a class at the side, its attendance sheet', async ({ page }) => {
    const lesson = await client.query<{ on_date: string; label: string; last_name: string; full: string }>(
      `SELECT to_char(d.on_date, 'YYYY-MM-DD') AS on_date, coalesce(c.level_code, c.title) AS label, p.last_name, concat_ws(' ', p.first_name, p.last_name) AS full
         FROM course_days d JOIN courses c ON c.id = d.course_id
         JOIN booking_periods bp ON bp.course_id = d.course_id AND bp.start_date <= d.on_date AND bp.end_date >= d.on_date AND (bp.group_index IS NULL OR bp.group_index = d.group_index)
         JOIN bookings b ON b.id = bp.booking_id AND b.status IN ('reserved', 'confirmed') AND b.deleted_at IS NULL
         JOIN people p ON p.id = b.person_id AND p.deleted_at IS NULL AND length(p.last_name) > 3
        WHERE NOT d.cancelled AND d.on_date BETWEEN current_date - 30 AND current_date + 30 AND c.level_code IS NOT NULL
        ORDER BY abs(d.on_date - current_date), p.last_name LIMIT 1`
    );
    test.skip(lesson.rowCount === 0, 'no lessons with learners near today');
    const { on_date, label, last_name, full } = lesson.rows[0];

    await page.goto(`/admin/day/courses?date=${on_date}`);
    await page.getByPlaceholder('Name, Raum oder Kurs').fill(last_name);
    const found = page.getByRole('row').filter({ hasText: full });
    await expect(found.first()).toBeVisible();
    await found.first().click();
    const panel = page.getByRole('dialog');
    await expect(panel).toContainText(full);
    await panel.getByRole('link', { name: 'Anwesenheitsliste' }).click();
    // The class's sheet for four weeks, not the day's: weeks across, the learner on a row.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Anwesenheitsliste');
    await expect(page).toHaveURL(/\/admin\/day\/attendance\?course=[0-9a-f-]{36}&group=\d&from=\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByRole('columnheader', { name: /^KW \d+/ })).toHaveCount(4);
    await expect(page.getByRole('row').filter({ hasText: full.split(' ').at(-1)! }).first()).toBeVisible();

    await page.goto(`/admin/day/rooms?date=${on_date}`);
    await page.getByRole('button', { name: new RegExp(`^${label.replace(/[.+]/g, '\\$&')}`) }).first().click();
    await expect(page.getByRole('dialog')).toContainText('Teilnehmende');
  });

  test('the top bar opens it; the views and the week strip keep and move the day', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('link', { name: 'Tagesplan' }).first().click();
    await expect(page).toHaveURL(/\/admin\/day$/);
    await page.getByRole('link', { name: 'Nächster Tag' }).click();
    await expect(page).toHaveURL(/\/admin\/day\?date=\d{4}-\d{2}-\d{2}$/);
    await page.getByRole('navigation', { name: 'Ansichten des Tages' }).getByRole('link', { name: /Kurse/ }).click();
    await expect(page).toHaveURL(/\/admin\/day\/courses\?date=\d{4}-\d{2}-\d{2}$/);
    await page.getByRole('link', { name: 'Heute', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/day\/courses$/);
  });
});
