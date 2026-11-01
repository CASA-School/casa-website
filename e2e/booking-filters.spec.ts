import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
test.describe('workspace booking worklists', () => {
  test.skip(!DATABASE_URL, 'needs the local database and an owner');
  let db: pg.Client;
  let owner = '', token = '', hash = '', type = '';
  const people: string[] = [], bookings: string[] = [];
  const surname = `Filtertest${randomUUID().slice(0, 8)}`;
  test.beforeAll(async () => {
    db = new pg.Client({ connectionString: DATABASE_URL }); await db.connect();
    owner = (await db.query(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active LIMIT 1`)).rows[0]?.id;
    test.skip(!owner, 'no owner');
    type = (await db.query(`SELECT id FROM course_types WHERE slug = 'evening-german'`)).rows[0]?.id;
    test.skip(!type, 'no evening course type');
    token = randomBytes(32).toString('base64url'); hash = createHash('sha256').update(token).digest('hex');
    await db.query(`INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '10 minutes')`, [owner, hash]);
    for (const [name, level, balance] of [['Ada', 'B1.1', 100], ['Zoe', 'A2.1', 50]]) {
      const person = (await db.query(`INSERT INTO people (first_name, last_name, created_by) VALUES ($1, $2, 'e2e') RETURNING id`, [name, surname])).rows[0].id;
      people.push(person);
      const booking = (await db.query(`INSERT INTO bookings (person_id, status, course_type_id) VALUES ($1, 'confirmed', $2) RETURNING id`, [person, type])).rows[0].id;
      bookings.push(booking);
      await db.query(`INSERT INTO booking_periods (booking_id, start_date, end_date, level_code) VALUES ($1, current_date + 7, current_date + 35, $2)`, [booking, level]);
      await db.query(`INSERT INTO booking_charges (booking_id, kind, description, amount) VALUES ($1, 'tuition', 'E2E course', $2)`, [booking, balance]);
    }
  });
  test.afterAll(async () => {
    if (!db) return;
    for (const id of bookings) await db.query(`DELETE FROM bookings WHERE id = $1`, [id]);
    for (const id of people) await db.query(`DELETE FROM people WHERE id = $1`, [id]);
    if (hash) await db.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [hash]);
    await db.end();
  });
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: 'casa_workspace_session', value: token, url: baseURL! }, { name: 'casa_ws_lang', value: 'en', url: baseURL! }]);
  });
  test('filters and sorts with branded controls and no saved-view row', async ({ page }) => {
    await page.goto(`/admin/bookings?filter=all&q=${surname}&type=${type}`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('row').filter({ hasText: `Ada ${surname}` })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: `Zoe ${surname}` })).toBeVisible();
    await page.getByRole('button', { name: 'Starting level: All levels', exact: true }).click();
    await page.getByRole('menuitem', { name: 'B1', exact: true }).click();
    await expect(page).toHaveURL(/level=B1/);
    await expect(page.getByRole('row').filter({ hasText: `Ada ${surname}` })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: `Zoe ${surname}` })).toHaveCount(0);
    await page.getByRole('link', { name: 'Sort by Balance' }).click();
    await expect(page.getByRole('columnheader', { name: 'Sort by Balance' })).toHaveAttribute('aria-sort', 'ascending');
    await expect(page.getByRole('button', { name: 'Save view', exact: true })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Saved views', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: /^Filters/ }).click();
    const panel = page.getByRole('dialog', { name: 'Filter bookings' });
    await expect(panel.getByRole('combobox', { name: 'Booking status' })).toHaveValue('all');
    await expect(panel.getByRole('combobox', { name: 'Booking status' }).locator('option').filter({ hasText: 'Unpaid' })).toHaveText('Unpaid · 1');
  });
  test('task search opens a relevant list and preserves exact record search', async ({ page }) => {
    await page.goto('/admin/bookings', { waitUntil: 'networkidle' });
    await page.keyboard.press('ControlOrMeta+k');
    const box = page.getByRole('textbox', { name: 'Search the workspace' });
    await box.fill(`unpaid evening B1 ${surname}`);
    const worklist = page.getByRole('option').filter({ hasText: 'Bookings: Unpaid' });
    await expect(worklist).toBeVisible();
    await worklist.click();
    await expect(page).toHaveURL(/filter=unclear/);
    await expect(page.getByRole('row').filter({ hasText: `Ada ${surname}` })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: `Zoe ${surname}` })).toHaveCount(0);
    const number = (await db.query(`SELECT number FROM bookings WHERE id = $1`, [bookings[0]])).rows[0].number;
    await page.goto(`/admin/bookings?filter=all&q=${number}`);
    await expect(page.getByRole('row').filter({ hasText: `Ada ${surname}` })).toBeVisible();
  });
  test('a new course task replaces incompatible context in the local list search', async ({ page }) => {
    await page.goto(`/admin/bookings?category=intensive&session=morning&month=2027-01&level=A1&q=${surname}`, { waitUntil: 'networkidle' });
    const search = page.locator('.ws-list-bar').getByRole('searchbox', { name: 'Search' });
    await search.fill(`unpaid evening B1 ${surname}`);
    await search.press('Enter');
    await expect(page.getByRole('row').filter({ hasText: `Ada ${surname}` })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: `Zoe ${surname}` })).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get('category')).not.toBe('intensive');
    expect(new URL(page.url()).searchParams.has('month')).toBe(false);
    expect(new URL(page.url()).searchParams.has('session')).toBe(false);
  });
  test('course-start boundaries narrow the booked dates', async ({ page }) => {
    const dates = (await db.query(`SELECT (current_date + 8)::text AS after, (current_date + 6)::text AS before, current_date::text AS today, (current_date + 14)::text AS until`)).rows[0];
    const base = `/admin/bookings?filter=all&q=${surname}`;
    await page.goto(`${base}&from=${dates.after}`);
    await expect(page.getByRole('row').filter({ hasText: surname })).toHaveCount(0);
    await page.goto(`${base}&to=${dates.before}`);
    await expect(page.getByRole('row').filter({ hasText: surname })).toHaveCount(0);
    await page.goto(`${base}&from=${dates.today}&to=${dates.until}`);
    await expect(page.getByRole('row').filter({ hasText: surname })).toHaveCount(2);
  });
  test('phone rows keep the full name and put the reminder in the action menu', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto(`/admin/bookings?filter=unclear&q=${surname}`, { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const row = page.getByRole('row').filter({ hasText: `Ada ${surname}` });
    await expect(row.getByRole('link', { name: 'Remind', exact: true })).not.toBeVisible();
    await row.getByRole('button', { name: /^Actions:/ }).click();
    await expect(page.getByRole('menuitem', { name: 'Remind', exact: true })).toBeVisible();
  });

});
