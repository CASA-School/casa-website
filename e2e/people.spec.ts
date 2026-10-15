import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * A person's page (2026-10-15): the hub every record leads to. Their enquiry
 * is one of their „Vorgänge" and open, a closed one is under „Abgeschlossen",
 * and a note written on the person lands in „Notizen und Verlauf" (migration
 * 0026 lets `staff_notes` hold a person).
 *
 * Runs only with a database and an owner account, in German (pinned). The
 * person, their enquiries and the note are deleted afterwards.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('person page', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let personId = '';

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
       VALUES ($1, $2, now() + interval '10 minutes', 'e2e:people')`,
      [rows[0].id, tokenHash]
    );
    personId = (
      await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Pia', 'Prüfperson', 'e2e') RETURNING id`)
    ).rows[0].id;
    await client.query(
      `INSERT INTO enquiries (request_id, locale, first_name, last_name, email, topic, message, source, person_id, status)
       VALUES (gen_random_uuid(), 'de', 'Pia', 'Prüfperson', 'pia@example.com', 'Abendkurs im Januar', 'Gibt es noch Plätze?', 'e2e', $1, 'new'),
              (gen_random_uuid(), 'de', 'Pia', 'Prüfperson', 'pia@example.com', 'Unterkunft im Sommer', 'Danke, hat sich erledigt.', 'e2e', $1, 'done')`,
      [personId]
    );
  });

  test.afterAll(async () => {
    if (!client) return;
    if (personId) {
      await client.query(`DELETE FROM staff_notes WHERE entity = 'person' AND entity_id = $1`, [personId]);
      await client.query(`DELETE FROM staff_activity WHERE entity_id = $1 OR entity_id IN (SELECT id FROM enquiries WHERE person_id = $1)`, [personId]);
      await client.query(`DELETE FROM enquiries WHERE person_id = $1`, [personId]);
      await client.query(`DELETE FROM people WHERE id = $1`, [personId]);
    }
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  test('the person is the hub: open and closed cases, and a note of their own', async ({ page }) => {
    await page.goto(`/admin/people/${personId}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pia Prüfperson');

    // Each group is its heading's own section, inside the Vorgänge card.
    const open = page.getByRole('heading', { name: /^Offen/ }).locator('xpath=..');
    const closed = page.getByRole('heading', { name: /^Abgeschlossen/ }).locator('xpath=..');
    await expect(open).toContainText('Abendkurs im Januar');
    await expect(closed).toContainText('Unterkunft im Sommer');

    await page.getByRole('textbox', { name: 'Neue Notiz' }).fill('Zahlt über die Agentur.');
    await page.getByRole('button', { name: 'Notiz hinzufügen' }).click();
    await expect(page.getByText('Zahlt über die Agentur.')).toBeVisible();
  });
});
