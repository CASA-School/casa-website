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
    await page.getByLabel('Muttersprache').fill('Spanisch');
    await page.getByLabel('Geburtsort').fill('Valparaíso');
    await page.getByLabel('Passnummer').fill('P1234567');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.getByRole('tab', { name: 'Persönliche Daten' }).click();
    const details = page.getByRole('heading', { name: 'Person', exact: true }).locator('xpath=ancestor::section[1]');
    await expect(details).toContainText('Spanisch');
    await expect(details).toContainText('Valparaíso');
    await expect(details).toContainText('P1234567');

    const addresses = page.getByRole('heading', { name: 'Adressen' }).locator('xpath=ancestor::section[1]');
    await addresses.getByRole('button', { name: 'Hinzufügen' }).first().click();
    await page.getByLabel('Straße und Hausnummer').fill('Am Dobben 14');
    await page.getByLabel('PLZ').fill('28203');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByRole('tab', { selected: true })).toHaveText('Persönliche Daten');
    await expect(addresses).toContainText('Am Dobben 14');
    await expect(addresses).toContainText('28203 Bremen');

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
