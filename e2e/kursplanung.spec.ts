import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * The course-planning board, seen by a signed-in owner.
 *
 * Runs only with a database: it needs course groups and an owner account. The
 * session is opened the way `scripts/admin/check-routes.mjs` does it — a
 * session row and the cookie, no password anywhere — and deleted afterwards.
 * The one write it makes (placing a piece) is undone at the end, so the plan
 * is left as it was found.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('kursplanung', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL, course groups and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let month = '';
  /** Anything written after this moment into a touched group is removed again. */
  let started: Date;

  async function cleanUp(groupIds: readonly string[]) {
    if (groupIds.length === 0) return;
    await client.query(`DELETE FROM plan_assignments WHERE group_id = ANY($1::uuid[]) AND updated_at >= $2`, [groupIds, started]);
  }

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(
      `SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`
    );
    test.skip(rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent)
       VALUES ($1, $2, now() + interval '10 minutes', 'e2e:kursplanung')`,
      [rows[0].id, tokenHash]
    );
    const m = await client.query<{ month: string }>(`SELECT to_char(max(month), 'YYYY-MM') AS month FROM course_groups`);
    month = m.rows[0]?.month ?? '';
    test.skip(!month, 'no course groups');
    started = (await client.query<{ t: Date }>(`SELECT now() AS t`)).rows[0].t;
  });

  test.afterAll(async () => {
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: 'casa_workspace_session', value: token, url: baseURL! }]);
  });

  test('a placed piece survives a reload and can be taken back', async ({ page }) => {
    await page.goto(`/admin/kursplanung?month=${month}`);
    await expect(page.getByRole('heading', { name: 'Kursplanung' })).toBeVisible();

    const socket = page.locator('button[aria-label$=" offen"]').first();
    const piece = page.locator('[role="button"][aria-pressed="false"][draggable="true"]').first();
    test.skip((await socket.count()) === 0 || (await piece.count()) === 0, 'nothing open or nobody free in this month');

    const socketLabel = (await socket.getAttribute('aria-label'))!;
    const groupId = (await socket.getAttribute('data-group'))!;
    const row = (await socket.getAttribute('data-row'))!;
    const week = (await socket.getAttribute('data-week'))!;
    try {
      await piece.click();
      await expect(page.getByText('in der Hand', { exact: false }).first()).toBeVisible();
      await socket.click();
      await expect(page.getByText(/Gespeichert \d\d:\d\d/)).toBeVisible({ timeout: 10_000 });
      await expect(page.locator(`button[aria-label="${socketLabel}"]`)).toHaveCount(0);

      await page.reload();
      await expect(page.locator(`button[aria-label="${socketLabel}"]`)).toHaveCount(0);

      // Take it back: the piece that now sits where the socket was, then "Aus KW … entfernen".
      await page.locator(`[draggable="true"][data-group="${groupId}"][data-row="${row}"][data-week="${week}"]`).click();
      await page.getByRole('button', { name: /^Aus KW \d+ entfernen/ }).click();
      await expect(page.getByText(/Gespeichert \d\d:\d\d/)).toBeVisible({ timeout: 10_000 });
      await expect(page.locator(`button[aria-label="${socketLabel}"]`)).toHaveCount(1);
    } finally {
      await cleanUp([groupId]);
    }
  });

  test('a save against a week a colleague changed meanwhile is refused and undone, and works after a reload', async ({ page }) => {
    await page.goto(`/admin/kursplanung?month=${month}`);
    await expect(page.getByRole('heading', { name: 'Kursplanung' })).toBeVisible();

    const sockets = page.locator('button[aria-label$=" offen"]');
    const piece = page.locator('[role="button"][aria-pressed="false"][draggable="true"]').first();
    test.skip((await sockets.count()) < 2 || (await piece.count()) === 0, 'fewer than two open days, or nobody free, in this month');

    const mine = sockets.first();
    const theirs = sockets.nth(1);
    const mineLabel = (await mine.getAttribute('aria-label'))!;
    const mineGroup = (await mine.getAttribute('data-group'))!;
    const mineRow = (await mine.getAttribute('data-row'))!;
    const week = (await mine.getAttribute('data-week'))!;
    const theirsLabel = (await theirs.getAttribute('aria-label'))!;
    const theirsGroup = (await theirs.getAttribute('data-group'))!;
    const theirsDate = (await theirs.getAttribute('data-date'))!;

    try {
      // The colleague's change: straight into the database, after this page loaded its copy of the week.
      const teacher = await client.query<{ id: string }>(`SELECT id FROM teachers WHERE is_active ORDER BY short_name DESC LIMIT 1`);
      await client.query(`INSERT INTO plan_assignments (group_id, on_date, teacher_id) VALUES ($1, $2, $3)`, [theirsGroup, theirsDate, teacher.rows[0].id]);

      await piece.click();
      await expect(page.getByText('in der Hand', { exact: false }).first()).toBeVisible();
      await mine.click();
      await expect(page.getByText('von jemand anderem geändert')).toBeVisible({ timeout: 10_000 });
      // Undone here, and nothing of it in the database — the colleague's row is the only new one.
      await expect(page.locator(`button[aria-label="${mineLabel}"]`)).toHaveCount(1);
      const written = await client.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM plan_assignments
          WHERE group_id = ANY($1::uuid[]) AND updated_at >= $2 AND NOT (group_id = $3 AND on_date = $4)`,
        [[mineGroup, theirsGroup], started, theirsGroup, theirsDate]
      );
      expect(written.rows[0].n).toBe(0);

      // The reload shows the colleague's piece, and the next save goes through.
      await page.getByRole('button', { name: 'Neu laden' }).click();
      await expect(page.locator(`button[aria-label="${theirsLabel}"]`)).toHaveCount(0, { timeout: 10_000 });
      await page.keyboard.press('Escape');
      await page.locator('[role="button"][aria-pressed="false"][draggable="true"]').first().click();
      await page.locator(`button[aria-label="${mineLabel}"]`).click();
      await expect(page.getByText(/Gespeichert \d\d:\d\d/)).toBeVisible({ timeout: 10_000 });

      await page.locator(`[draggable="true"][data-group="${mineGroup}"][data-row="${mineRow}"][data-week="${week}"]`).click();
      await page.getByRole('button', { name: /^Aus KW \d+ entfernen/ }).click();
      await expect(page.getByText(/Gespeichert \d\d:\d\d/)).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanUp([mineGroup, theirsGroup]);
    }
  });

  test('Kurse and Lehrkräfte render, and the teacher dialog opens from the URL', async ({ page }) => {
    await page.goto(`/admin/kursplanung/kurse?month=${month}`);
    await expect(page.getByRole('heading', { name: 'Kursplanung' })).toBeVisible();
    await expect(page.getByText('Alle Wochen aus Paaren belegen').first()).toBeVisible();

    const { rows } = await client.query<{ id: string; full_name: string }>(
      `SELECT id, full_name FROM teachers WHERE is_active ORDER BY short_name LIMIT 1`
    );
    test.skip(rows.length === 0, 'no teachers');
    await page.goto(`/admin/kursplanung/lehrkraefte?month=${month}&teacher=${rows[0].id}`);
    await expect(page.getByRole('dialog')).toContainText(rows[0].full_name);
    await expect(page.getByRole('button', { name: 'Speichern' })).toBeVisible();
  });
});
