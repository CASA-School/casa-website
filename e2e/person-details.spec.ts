import { createHash, randomBytes } from 'node:crypto';

import { expect, test, type BrowserContext } from '@playwright/test';
import pg from 'pg';

/**
 * Everything about a learner (2026-10-16, migration 0029): the details SchoolMan holds — some of
 * them telc asks for — an address in Bremen, and a bank account, which a colleague adds as well as
 * an owner (the module `private_data` is the team's); a colleague whose right was withdrawn on the
 * Team screen has no bank tab. The page is in tabs: a save returns to the tab it was made on.
 *
 * Runs only with a database and an owner account, in German (pinned). The person, the test
 * colleague and both sessions are deleted afterwards.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('person details', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');
  // In order: the last test withdraws the colleague's right that the one before uses.
  test.describe.configure({ mode: 'serial' });

  let client: pg.Client;
  let personId = '';
  let staffId = '';
  const sessions: { token: string; hash: string }[] = [];

  const session = async (userId: string) => {
    const token = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '10 minutes', 'e2e:details')`,
      [userId, hash]
    );
    sessions.push({ token, hash });
    return token;
  };
  const signIn = async (context: BrowserContext, baseURL: string, token: string) =>
    context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL },
      { name: 'casa_ws_lang', value: 'de', url: baseURL },
    ]);

  let ownerToken = '';
  let staffToken = '';

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    ownerToken = await session(rows[0].id);
    staffId = (
      await client.query<{ id: string }>(
        `INSERT INTO staff_users (email, name, role, password_hash) VALUES ('e2e-details@example.com', 'E2E Kollegin', 'staff', 'x') RETURNING id`
      )
    ).rows[0].id;
    staffToken = await session(staffId);
    personId = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Tia', 'Telcfall', 'e2e') RETURNING id`)).rows[0].id;
  });

  test.afterAll(async () => {
    if (!client) return;
    if (personId) {
      await client.query(`DELETE FROM staff_activity WHERE entity = 'person' AND entity_id = $1`, [personId]);
      await client.query(`DELETE FROM people WHERE id = $1`, [personId]);
    }
    for (const s of sessions) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [s.hash]);
    if (staffId) {
      await client.query(`DELETE FROM staff_module_access WHERE staff_user_id = $1`, [staffId]);
      await client.query(`DELETE FROM staff_users WHERE id = $1`, [staffId]);
    }
    await client.end();
  });

  test('the learner details and an address in Bremen', async ({ page, context, baseURL }) => {
    await signIn(context, baseURL!, ownerToken);
    await page.goto(`/admin/people/${personId}`);

    await page.getByRole('button', { name: 'Bearbeiten', exact: true }).first().click();
    const editor = page.getByRole('dialog');
    await editor.getByLabel('Muttersprache').fill('Spanisch');
    await editor.getByText('Weitere persönliche Angaben', { exact: true }).click();
    await editor.getByLabel('Geburtsort').fill('Valparaíso');
    await editor.getByLabel('Passnummer').fill('P1234567');
    await editor.getByRole('button', { name: 'Adressen', exact: true }).click();
    await editor.getByLabel('Straße und Hausnummer').first().fill('Am Dobben 14');
    await editor.getByLabel('PLZ', { exact: true }).first().fill('28203');
    await editor.getByLabel('Ort', { exact: true }).first().fill('Bremen');
    await editor.getByLabel('Land', { exact: true }).first().fill('Deutschland');
    await editor.getByRole('button', { name: 'Kontakt', exact: true }).click();
    await editor.getByRole('button', { name: 'E-Mail hinzufügen' }).click();
    await editor.getByLabel('E-Mail-Adresse', { exact: true }).fill('tia@example.invalid');
    await editor.getByRole('radio', { name: 'Bevorzugte Adresse' }).check();
    await editor.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(editor).not.toBeVisible();
    await page.getByRole('tab', { name: 'Persönliche Daten' }).click();
    const details = page.getByRole('heading', { name: 'Persönliche Angaben', exact: true }).locator('xpath=ancestor::section[1]');
    await expect(details).toContainText('Spanisch');
    await expect(details).toContainText('Valparaíso');
    await expect(details).toContainText('P1234567');
    const contacts = page.getByRole('heading', { name: 'Kontakt & Adressen' }).locator('xpath=ancestor::section[1]');
    await expect(contacts).toContainText('tia@example.invalid');
    await expect(contacts).toContainText('Am Dobben 14');
    await expect(contacts).toContainText('28203 Bremen');
    const saved = (await client.query(`SELECT birth_place, mother_tongue FROM people WHERE id = $1`, [personId])).rows[0];
    expect(saved).toEqual({ birth_place: 'Valparaíso', mother_tongue: 'Spanisch' });

  });

  test('a dirty editor stays open, and a stale draft cannot overwrite a colleague', async ({ page, context, baseURL }) => {
    await signIn(context, baseURL!, ownerToken);
    await page.goto(`/admin/people/${personId}?tab=details`);
    await page.getByRole('button', { name: 'Bearbeiten', exact: true }).first().click();
    const editor = page.getByRole('dialog');
    await editor.getByLabel('Vorname', { exact: true }).fill('Draft name');
    await page.keyboard.press('Escape');
    await expect(editor.getByText('Änderungen noch nicht gespeichert.')).toBeVisible();
    await editor.getByRole('button', { name: 'Weiter bearbeiten' }).click();
    await client.query(`UPDATE people SET last_name = 'Kollegenstand' WHERE id = $1`, [personId]);
    await editor.getByRole('button', { name: 'Speichern', exact: true }).click();
    await expect(editor.getByRole('alert')).toContainText('inzwischen geändert');
    await expect(editor.getByLabel('Vorname', { exact: true })).toHaveValue('Draft name');
    expect((await client.query(`SELECT first_name FROM people WHERE id = $1`, [personId])).rows[0].first_name).toBe('Tia');
    await editor.getByRole('button', { name: 'Abbrechen', exact: true }).click();
    await editor.getByRole('button', { name: 'Verwerfen' }).click();
    await client.query(`UPDATE people SET last_name = 'Telcfall' WHERE id = $1`, [personId]);
  });

  test('a colleague adds a bank account and corrects it', async ({ page, context, baseURL }) => {
    await signIn(context, baseURL!, staffToken);
    await page.goto(`/admin/people/${personId}?tab=bank`);
    const accounts = page.getByRole('heading', { name: 'Bankverbindungen' }).locator('xpath=ancestor::section[1]');
    await accounts.getByRole('button', { name: 'Konto hinzufügen' }).click();
    await page.getByLabel('IBAN').fill('de89 3704 0044 0532 0130 00');
    await page.getByRole('dialog').getByRole('button', { name: 'Konto hinzufügen' }).click();
    await expect(accounts).toContainText('DE89 3704 0044 0532 0130 00');

    await accounts.getByRole('button', { name: 'Ändern' }).click();
    await page.getByLabel('Bank', { exact: true }).fill('Sparkasse Bremen');
    await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();
    await expect(accounts).toContainText('Sparkasse Bremen');
    // Removing an account is for owners and administrators.
    await expect(accounts.getByRole('button', { name: 'Entfernen' })).toHaveCount(0);
  });

  test('view access hides editing and withheld booking access yields no task shortcuts', async ({ page, context, baseURL }) => {
    await client.query(`INSERT INTO staff_module_access (staff_user_id, module, level) VALUES ($1, 'people', 'view'), ($1, 'bookings', 'none')`, [staffId]);
    await signIn(context, baseURL!, staffToken);
    await page.goto(`/admin/people/${personId}?tab=details`);
    await expect(page.getByRole('button', { name: 'Bearbeiten', exact: true })).toHaveCount(0);
    const response = await page.request.post('/admin/search', { data: { q: 'unpaid evening B1' } });
    expect(response.ok()).toBe(true);
    expect((await response.json()).data.views).toEqual([]);
    await client.query(`DELETE FROM staff_module_access WHERE staff_user_id = $1 AND module IN ('people', 'bookings')`, [staffId]);
  });

  test('a colleague whose right was withdrawn has no bank tab', async ({ page, context, baseURL }) => {
    await client.query(`INSERT INTO staff_module_access (staff_user_id, module, level) VALUES ($1, 'private_data', 'none')`, [staffId]);
    await signIn(context, baseURL!, staffToken);
    await page.goto(`/admin/people/${personId}?tab=bank`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tia Telcfall');
    await expect(page.getByRole('tab', { name: 'Persönliche Daten' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Bankverbindung' })).toHaveCount(0);
    await expect(page.getByRole('tab', { selected: true })).toHaveText('Übersicht');
    await expect(page.getByText('DE89')).toHaveCount(0);
  });
});
