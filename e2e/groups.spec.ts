import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * Group visits (2026-10-18, migration 0058). A visit is created with its name, who, when and how many
 * revealed once the name is in; it is listed as asked for and found by its name; it is confirmed after
 * the confirmation and then listed as coming; a note is written on it; and one nothing names is deleted
 * after the confirmation, its note with it.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
const NAME = 'Gruppentest Liceo E2E';

test.describe('group visits', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');
  test.describe.configure({ mode: 'serial' });

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let groupId = '';

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:groups')`,
      [rows[0].id, tokenHash]
    );
  });

  test.afterAll(async () => {
    if (!client) return;
    const ids = (await client.query<{ id: string }>(`SELECT id FROM group_visits WHERE name = $1`, [NAME])).rows.map((r) => r.id);
    if (groupId) ids.push(groupId);
    await client.query(`DELETE FROM staff_activity WHERE entity = 'group_visit' AND entity_id = ANY($1::uuid[])`, [ids]);
    await client.query(`DELETE FROM staff_notes WHERE entity = 'group_visit' AND entity_id = ANY($1::uuid[])`, [ids]);
    await client.query(`DELETE FROM group_visits WHERE id = ANY($1::uuid[])`, [ids]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  test('a visit is created with its name, who, when and how many revealed once it is in', async ({ page }) => {
    await page.goto('/admin/groups');
    await page.getByRole('button', { name: 'Neue Gruppe', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Land')).toBeHidden();
    await dialog.getByLabel('Name', { exact: true }).fill(NAME);
    await dialog.getByLabel('Land').selectOption({ label: 'Italien' });
    await dialog.getByLabel('Teilnehmende').fill('20');
    await dialog.getByLabel('Begleitung').fill('2');
    await dialog.getByLabel('Alter von').fill('15');
    await dialog.getByLabel('bis', { exact: true }).fill('16');
    await dialog.getByLabel('Niveau').selectOption('A2');
    await dialog.getByLabel('Anreise', { exact: true }).fill('2027-04-04');
    await dialog.getByLabel('Anreise', { exact: true }).press('Tab');
    await dialog.getByLabel('Abreise', { exact: true }).fill('2027-04-17');
    await dialog.getByLabel('Abreise', { exact: true }).press('Tab');
    await dialog.getByRole('button', { name: 'Anlegen' }).click();

    await expect(page).toHaveURL(/\/admin\/groups\/[0-9a-f-]{36}$/);
    groupId = UUID.exec(page.url())![0];
    await expect(page.getByRole('heading', { name: NAME })).toBeVisible();
    await expect(page.locator('main')).toContainText('20 + 2 Begleitung');

    const { rows } = await client.query(
      `SELECT status, country_code, participants, escorts, age_from, age_to, level, arrival::text, departure::text FROM group_visits WHERE id = $1`,
      [groupId]
    );
    expect(rows).toEqual([
      { status: 'open', country_code: 'IT', participants: 20, escorts: 2, age_from: 15, age_to: 16, level: 'A2', arrival: '2027-04-04', departure: '2027-04-17' },
    ]);
  });

  test('it is listed as asked for and found by its name', async ({ page }) => {
    await page.goto('/admin/groups?view=open&q=Gruppentest');
    await expect(page.getByRole('link', { name: 'Angefragt' })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('main')).toContainText(NAME);

    await page.goto('/admin/groups?q=Gruppentest');
    await expect(page.locator('main')).not.toContainText(NAME);
  });

  test('confirmed after the confirmation, and then listed as coming', async ({ page }) => {
    await page.goto(`/admin/groups/${groupId}`);
    await page.getByRole('button', { name: 'Bestätigen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Bestätigen' }).click();
    await expect(page.locator('main')).toContainText('Bestätigt');

    await page.goto('/admin/groups?q=Gruppentest');
    await expect(page.locator('main')).toContainText(NAME);
    const { rows } = await client.query(`SELECT status FROM group_visits WHERE id = $1`, [groupId]);
    expect(rows).toEqual([{ status: 'confirmed' }]);
  });

  test('a note is written on it', async ({ page }) => {
    await page.goto(`/admin/groups/${groupId}`);
    await page.getByLabel('Neue Notiz').fill('Bus vom Flughafen bestellt.');
    await page.getByRole('button', { name: 'Notiz hinzufügen' }).click();
    await expect(page.getByText('Bus vom Flughafen bestellt.')).toBeVisible();
    const { rows } = await client.query(`SELECT body FROM staff_notes WHERE entity = 'group_visit' AND entity_id = $1`, [groupId]);
    expect(rows).toEqual([{ body: 'Bus vom Flughafen bestellt.' }]);
  });

  test('deleted after the confirmation, its note with it', async ({ page }) => {
    await page.goto(`/admin/groups/${groupId}`);
    await page.getByRole('button', { name: 'Löschen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();
    await expect(page).toHaveURL(/\/admin\/groups$/);

    const { rows } = await client.query<{ groups: string; notes: string }>(
      `SELECT (SELECT count(*) FROM group_visits WHERE id = $1) AS groups,
              (SELECT count(*) FROM staff_notes WHERE entity = 'group_visit' AND entity_id = $1) AS notes`,
      [groupId]
    );
    expect(rows[0]).toEqual({ groups: '0', notes: '0' });
    const trail = await client.query<{ action: string }>(
      `SELECT action FROM staff_activity WHERE entity = 'group_visit' AND entity_id = $1 AND action <> 'note_added' ORDER BY id`,
      [groupId]
    );
    expect(trail.rows.map((r) => r.action)).toEqual(['group_created', 'group_status_changed', 'group_deleted']);
  });
});
