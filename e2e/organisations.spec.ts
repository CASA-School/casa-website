import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * Organisations (2026-10-18, migration 0057). An agency is created with its name and kind, the rest
 * revealed once both are in; a contact and a commission term are added on its page; it is listed in
 * its view; and an organisation nothing names is deleted after the confirmation, its contact and
 * commission with it.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
const NAME = 'Orgtest Sprachreisen E2E';

test.describe('organisations', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');
  test.describe.configure({ mode: 'serial' });

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let organisationId = '';

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:organisations')`,
      [rows[0].id, tokenHash]
    );
  });

  test.afterAll(async () => {
    if (!client) return;
    const ids = (await client.query<{ id: string }>(`SELECT id FROM organisations WHERE name = $1`, [NAME])).rows.map((r) => r.id);
    if (organisationId) ids.push(organisationId);
    await client.query(`DELETE FROM staff_activity WHERE entity = 'organisation' AND entity_id = ANY($1::uuid[])`, [ids]);
    await client.query(`DELETE FROM organisations WHERE id = ANY($1::uuid[])`, [ids]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  test('an agency is created with its name and kind, the rest revealed once both are in', async ({ page }) => {
    await page.goto('/admin/organisations');
    await page.getByRole('button', { name: 'Neue Organisation', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name', { exact: true }).fill(NAME);
    await expect(dialog.getByLabel('Land')).toBeHidden();
    await dialog.getByLabel('Art').selectOption({ label: 'Agentur' });
    await dialog.getByLabel('Land').selectOption({ label: 'Italien' });
    await dialog.getByLabel('Wir schreiben auf').selectOption({ label: 'Englisch' });
    await dialog.getByLabel('E-Mail').fill('info@orgtest.example');
    await dialog.getByRole('button', { name: 'Anlegen' }).click();

    await expect(page).toHaveURL(/\/admin\/organisations\/[0-9a-f-]{36}$/);
    organisationId = UUID.exec(page.url())![0];
    await expect(page.getByRole('heading', { name: NAME })).toBeVisible();
    await expect(page.locator('main')).toContainText('Italien · auf Englisch');

    const { rows } = await client.query(`SELECT kind, country_code, language, email, is_active FROM organisations WHERE id = $1`, [organisationId]);
    expect(rows).toEqual([{ kind: 'agency', country_code: 'IT', language: 'en', email: 'info@orgtest.example', is_active: true }]);
  });

  test('a contact is added on its page', async ({ page }) => {
    await page.goto(`/admin/organisations/${organisationId}`);
    await page.getByRole('button', { name: 'Kontakt hinzufügen' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Anrede').selectOption({ label: 'Frau' });
    await dialog.getByLabel('Vorname').fill('Erika');
    await dialog.getByLabel('Nachname').fill('Orgtest');
    await dialog.getByLabel('Funktion').fill('Leitung');
    await dialog.getByLabel('E-Mail').fill('erika@orgtest.example');
    await dialog.getByRole('button', { name: 'Kontakt hinzufügen' }).click();

    await expect(page.getByText('Frau Erika Orgtest')).toBeVisible();
    const { rows } = await client.query(`SELECT salutation, first_name, last_name, role, email FROM organisation_contacts WHERE organisation_id = $1`, [organisationId]);
    expect(rows).toEqual([{ salutation: 'ms', first_name: 'Erika', last_name: 'Orgtest', role: 'Leitung', email: 'erika@orgtest.example' }]);
  });

  test('an agency’s commission is added and shown in the head', async ({ page }) => {
    await page.goto(`/admin/organisations/${organisationId}`);
    await page.getByRole('button', { name: 'Provision eintragen' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Provision in %').fill('15');
    await expect(dialog.getByLabel('Auf')).toHaveValue('tuition');
    await dialog.getByRole('button', { name: 'Provision eintragen' }).click();

    await expect(page.locator('dd', { hasText: '15 % auf Kurspreis' })).toBeVisible();
    const { rows } = await client.query(`SELECT charge_type_code, percentage::text FROM agency_commissions WHERE organisation_id = $1`, [organisationId]);
    expect(rows).toEqual([{ charge_type_code: 'tuition', percentage: '15.00' }]);
  });

  test('it is listed among the agencies and found by its contact', async ({ page }) => {
    await page.goto('/admin/organisations?view=agency&q=Orgtest');
    await expect(page.getByRole('link', { name: 'Agenturen' })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('main')).toContainText(NAME);
    await expect(page.locator('main')).toContainText('Erika Orgtest');

    await page.goto('/admin/organisations?q=erika%40orgtest.example');
    await expect(page.locator('main')).toContainText(NAME);

    await page.goto('/admin/organisations?view=company&q=Orgtest');
    await expect(page.locator('main')).not.toContainText(NAME);
  });

  test('deleted after the confirmation, its contact and commission with it', async ({ page }) => {
    await page.goto(`/admin/organisations/${organisationId}`);
    await page.getByRole('button', { name: 'Löschen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();
    await expect(page).toHaveURL(/\/admin\/organisations$/);

    const { rows } = await client.query<{ organisations: string; contacts: string; commissions: string }>(
      `SELECT (SELECT count(*) FROM organisations WHERE id = $1) AS organisations,
              (SELECT count(*) FROM organisation_contacts WHERE organisation_id = $1) AS contacts,
              (SELECT count(*) FROM agency_commissions WHERE organisation_id = $1) AS commissions`,
      [organisationId]
    );
    expect(rows[0]).toEqual({ organisations: '0', contacts: '0', commissions: '0' });
    const trail = await client.query<{ action: string }>(`SELECT action FROM staff_activity WHERE entity = 'organisation' AND entity_id = $1 ORDER BY id`, [organisationId]);
    expect(trail.rows.map((r) => r.action)).toEqual([
      'organisation_created',
      'organisation_contact_added',
      'organisation_commission_added',
      'organisation_deleted',
    ]);
  });
});
