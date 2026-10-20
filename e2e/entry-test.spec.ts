import { createHash, randomBytes } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';
import pg from 'pg';

/**
 * The day-one test (0075, docs/ENTRY_TEST.md) from both sides: the office opens the B1 class's test in
 * the Tagesplan and reads its code; a learner writes on a phone at /test, opens the page again elsewhere
 * (the attempt pauses), a wrong code is refused and the right one lets it go on, and hands in; the panel
 * shows the result, the Excel downloads, and a paper booklet is typed in.
 *
 * A B1.1 intensive course of its own whose first lesson is today, so the card appears; the phones only
 * see today's sittings. Runs only with a database and an owner account, in German. Everything it makes
 * is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());
const EMAIL = `e2e-entry-${Date.now()}@example.com`;

test.describe('day-one placement test', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let startId = '';
  let courseId = '';
  let ours = false;

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    const taken = await client.query(`SELECT 1 FROM entry_test_sittings WHERE on_date = $1::date AND session = 'morning' AND test = 'b1'`, [today]);
    test.skip(taken.rows.length > 0, 'a real B1 test sitting exists today');
    ours = true;
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:entry-test')`,
      [rows[0].id, tokenHash]
    );
    startId = (
      await client.query<{ id: string }>(
        `INSERT INTO course_instances (course_type_id, start_date, end_date, schedule)
         SELECT id, $1::date, $1::date + 25, '{"days": ["Mon", "Tue", "Wed", "Thu", "Fri"], "time": "09:00-12:30"}'::jsonb
           FROM course_types WHERE slug = 'intensive-german' RETURNING id`,
        [today]
      )
    ).rows[0].id;
    courseId = (await client.query<{ id: string }>(`INSERT INTO courses (course_instance_id, level_code, groups, places_per_group) VALUES ($1, 'B1.1', 1, 14) RETURNING id`, [startId])).rows[0].id;
    await client.query(`INSERT INTO course_days (course_id, group_index, on_date) VALUES ($1, 1, $2::date)`, [courseId, today]);
  });

  test.afterAll(async () => {
    if (!client) return;
    // Only a sitting this test could have made: none existed when it began (see beforeAll).
    if (ours) {
      await client.query(`DELETE FROM person_tests WHERE id IN (SELECT a.person_test_id FROM entry_test_attempts a JOIN entry_test_sittings s ON s.id = a.sitting_id WHERE s.on_date = $1::date AND s.session = 'morning' AND s.test = 'b1')`, [today]);
      await client.query(`DELETE FROM entry_test_sittings WHERE on_date = $1::date AND session = 'morning' AND test = 'b1'`, [today]);
    }
    if (courseId) {
      await client.query(`DELETE FROM course_days WHERE course_id = $1`, [courseId]);
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

  const openPanel = async (page: Page) => {
    await page.goto(`/admin/day?date=${today}`);
    await page.getByRole('button', { name: /Vormittag.*Einstufungstest B1 Tag 1/ }).click();
    return page.getByRole('dialog', { name: 'Einstufungstest B1 Tag 1' });
  };

  test('opened in the Tagesplan, written on a phone, paused and released, handed in, exported, paper typed in', async ({ page, browser, baseURL }) => {
    // The office opens the morning B1 test.
    let panel = await openPanel(page);
    await expect(panel).toContainText('B1.1');
    await panel.getByRole('button', { name: 'Test öffnen' }).click();
    await expect(panel.getByTestId('entry-test-code')).toHaveText(/^\d{4}$/);
    const code = (await panel.getByTestId('entry-test-code').textContent())!.trim();

    // A learner starts on a phone.
    const phone = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const first = await phone.newPage();
    await first.goto('/test');
    await first.getByLabel('Vor- und Nachname').fill('Erika Mustermann');
    await first.getByLabel('E-Mail-Adresse').fill(EMAIL);
    await first.getByRole('button', { name: 'Test starten' }).click();
    await expect(first.getByText('Aufgabe 1', { exact: false }).first()).toBeVisible();
    await first.getByRole('button', { name: 'Weiter' }).click();

    // The same e-mail on another phone: it goes on, paused, and only with the code.
    const second = await phone.newPage();
    await second.goto('/test');
    await second.getByLabel('Vor- und Nachname').fill('Erika Mustermann');
    await second.getByLabel('E-Mail-Adresse').fill(EMAIL);
    await second.getByRole('button', { name: 'Test starten' }).click();
    await expect(second.getByText('Test pausiert')).toBeVisible();
    await second.getByLabel('Lehrkraft-Code').fill(code === '9999' ? '1000' : String(Number(code) + 1));
    await second.getByRole('button', { name: 'Freigeben' }).click();
    await expect(second.getByText('Falscher Code.')).toBeVisible();
    await second.getByLabel('Lehrkraft-Code').fill(code);
    await second.getByRole('button', { name: 'Freigeben' }).click();
    await expect(second.getByText('Test pausiert')).toBeHidden();

    // Answers one task and hands in from the overview.
    await second.locator('button[aria-pressed]').first().click();
    await expect(second.locator('button[aria-pressed="true"]')).toHaveCount(1);
    await second.getByRole('button', { name: /\/\s*36/ }).click();
    await second.getByRole('button', { name: 'Abgeben' }).click();
    await second.getByRole('button', { name: 'Abgeben' }).last().click();
    await expect(second.getByText('Vielen Dank!')).toBeVisible();
    await phone.close();

    // The panel shows the result.
    panel = await openPanel(page);
    const attempt = panel.getByTestId('entry-test-attempt').filter({ hasText: 'Erika Mustermann' });
    await expect(attempt).toContainText('/80');
    const stored = await client.query<{ status: string; interruptions: number; max_score: number }>(`SELECT status, interruptions, max_score FROM entry_test_attempts WHERE email = $1`, [EMAIL]);
    expect(stored.rows[0]).toMatchObject({ status: 'submitted', max_score: 80 });
    expect(stored.rows[0].interruptions).toBeGreaterThanOrEqual(1);

    // The Excel download.
    const sitting = (await client.query<{ id: string }>(`SELECT sitting_id AS id FROM entry_test_attempts WHERE email = $1`, [EMAIL])).rows[0].id;
    const file = await page.request.get(`/admin/day/entry-test/export?date=${today}&sitting=${sitting}`);
    expect(file.status()).toBe(200);
    expect(file.headers()['content-type']).toContain('spreadsheetml');
    expect([...(await file.body()).subarray(0, 2)]).toEqual([0x50, 0x4b]);

    // A paper booklet typed in.
    await panel.getByRole('button', { name: 'Papierbogen eintragen' }).click();
    const form = page.getByRole('dialog', { name: 'Papierbogen eintragen' });
    await form.getByLabel('Vor- und Nachname').fill('Max Papier');
    await form.getByRole('radio', { name: 'A', exact: true }).first().check();
    await form.getByRole('group', { name: 'Aufgabe 1', exact: true }).getByRole('radio').first().check();
    await form.getByRole('button', { name: 'Eintragen' }).click();
    await expect.poll(async () => (await client.query(`SELECT 1 FROM entry_test_attempts WHERE sitting_id = $1 AND source = 'paper' AND status = 'submitted'`, [sitting])).rows.length).toBe(1);
    await client.query(`DELETE FROM entry_test_attempts WHERE sitting_id = $1 AND source = 'paper'`, [sitting]);
  });

  test('opened today for a class from the archive (an A2.2 class, a late joiner), written, its results as a PDF page', async ({ page }) => {
    const taken = await client.query(`SELECT 1 FROM entry_test_sittings WHERE on_date = $1::date AND test = 'a2'`, [today]);
    test.skip(taken.rows.length > 0, 'a real A2 test sitting exists today');
    // A second part of A2, in the afternoon, whose first day was a week ago: it writes no test on the card.
    const start = (
      await client.query<{ id: string }>(
        `INSERT INTO course_instances (course_type_id, start_date, end_date, schedule)
         SELECT id, $1::date - 7, $1::date + 20, '{"time": "13:00-17:30"}'::jsonb FROM course_types WHERE slug = 'intensive-german' RETURNING id`,
        [today]
      )
    ).rows[0].id;
    const course = (await client.query<{ id: string }>(`INSERT INTO courses (course_instance_id, level_code, groups, places_per_group) VALUES ($1, 'A2.2', 1, 14) RETURNING id`, [start])).rows[0].id;
    await client.query(`INSERT INTO course_days (course_id, group_index, on_date) VALUES ($1, 1, $2::date - 7), ($1, 1, $2::date)`, [course, today]);
    const dayId = (await client.query<{ id: string }>(`SELECT id FROM course_days WHERE course_id = $1 AND on_date = $2::date`, [course, today])).rows[0].id;
    try {
      await page.goto('/admin/day/tests');
      await page.getByRole('button', { name: 'Heute öffnen' }).click();
      const dialog = page.getByRole('dialog', { name: 'Test heute öffnen' });
      await dialog.getByLabel('Kurs').selectOption(dayId);
      await dialog.getByRole('button', { name: 'Öffnen' }).click();
      await expect(page).toHaveURL(/\/admin\/day\/tests$/);
      await expect(page.getByRole('button', { name: /Nachmittag.*Einstufungstest A2 Tag 1/ }).first()).toContainText(/Offen · Code \d{4}/);

      // A learner writes it through the API and hands it in.
      const email = `pdf-${EMAIL}`;
      const info = (await (await page.request.post('/api/entry-test', { data: { action: 'info' } })).json()).data;
      const sittingId = info.sittings.find((x: { test: string }) => x.test === 'a2').id;
      const started = await page.request.post('/api/entry-test', { data: { action: 'start', name: 'Pia Probe', email, sittingId } });
      const state = (await started.json()).data;
      expect(state.title).toBe('Einstufungstest A2 Tag 1');
      const answers = state.answers.map((_: string, i: number) => (i < 36 ? 'A' : 'richtig'));
      await page.request.post('/api/entry-test', { data: { action: 'submit', token: state.token, answers } });

      await page.goto(`/admin/day/tests/results?date=${today}`);
      const row = page.getByRole('row').filter({ hasText: 'Pia Probe' }).first();
      await expect(row).toContainText('/ 80');
    } finally {
      await client.query(`DELETE FROM entry_test_sittings WHERE on_date = $1::date AND test = 'a2'`, [today]);
      await client.query(`DELETE FROM course_days WHERE course_id = $1`, [course]);
      await client.query(`DELETE FROM courses WHERE id = $1`, [course]);
      await client.query(`DELETE FROM course_instances WHERE id = $1`, [start]);
    }
  });

  test('a past day is archived: closed, its unfinished phone handed in, in the archive with its booklets', async ({ page }) => {
    const yesterday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() - 36 * 3600_000));
    const made = await client.query<{ id: string }>(
      `INSERT INTO entry_test_sittings (on_date, session, test, code, minutes, opened_at) VALUES ($1::date, 'afternoon', 'b1plus', '4711', 40, now() - interval '30 hours')
       ON CONFLICT DO NOTHING RETURNING id`,
      [yesterday]
    );
    test.skip(made.rows.length === 0, 'a real B1+ test sitting exists on that day');
    const sittingId = made.rows[0].id;
    try {
      await client.query(
        `INSERT INTO entry_test_attempts (sitting_id, name, email, version, status, answers, deadline)
         VALUES ($1, 'Archiv Probe', $2, 'A', 'running', '["A"]'::jsonb, now() - interval '29 hours')`,
        [sittingId, `archive-${EMAIL}`]
      );
      await page.goto('/admin/day');
      await page.getByRole('link', { name: 'Einstufungstests' }).click();
      await expect(page).toHaveURL(/\/admin\/day\/tests$/);
      const line = page.getByRole('button', { name: /Einstufungstest B1\+ Tag 1/ });
      await expect(line).toContainText('Archiviert');
      await expect(line).toContainText('1 abgegeben');
      const row = await client.query<{ closed: boolean; status: string; max_score: number }>(
        `SELECT s.closed_at IS NOT NULL AS closed, a.status, a.max_score FROM entry_test_sittings s JOIN entry_test_attempts a ON a.sitting_id = s.id WHERE s.id = $1`,
        [sittingId]
      );
      expect(row.rows[0]).toMatchObject({ closed: true, status: 'expired', max_score: 80 });

      // The booklets come from the same questions as the phones: the reviewed wording is on paper too.
      await page.goto('/admin/day/tests/booklet?kurs=b1&version=A');
      await expect(page.getByText('soll sich spätestens am Donnerstag im Kursbüro melden').first()).toBeVisible();
      await page.goto('/admin/day/tests/qr?kurs=b1');
      await expect(page.getByRole('img', { name: /\/test\?kurs=b1$/ }).first()).toBeVisible();
    } finally {
      await client.query(`DELETE FROM entry_test_sittings WHERE id = $1`, [sittingId]);
    }
  });
});
