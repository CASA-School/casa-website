import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * „Rundmail" and a person's addresses (2026-11-01). Two learners in an evening course today: one with
 * an address of their own and an older agency address, one whose only address is an agency's. The
 * group's mail ticks the first at their own address and lists the second apart, not ticked; the person
 * page labels the agency's address and marks the own one as the main one. A second address added there
 * becomes the main one when ticked, and is removed after the confirmation.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything made is deleted afterwards.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('group mail and addresses', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');
  test.describe.configure({ mode: 'serial' });

  let client: pg.Client;
  let token = '';
  let hash = '';
  let orgId = '';
  const people: string[] = [];
  const stamp = Date.now().toString(36);
  const agency = `buero-${stamp}@agentur-e2e.example`;
  const own = `ada-${stamp}@privat-e2e.example`;

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const owner = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(owner.rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    hash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '10 minutes', 'e2e:group-mail')`,
      [owner.rows[0].id, hash]
    );
    orgId = (await client.query<{ id: string }>(`INSERT INTO organisations (name, kind, language, email) VALUES ($1, 'agency', 'de', $2) RETURNING id`, [`Agentur E2E ${stamp}`, agency])).rows[0].id;
    const evening = await client.query<{ id: string }>(`SELECT id FROM course_types WHERE slug = 'evening-german'`);
    test.skip(evening.rows.length === 0, 'no evening course type');
    for (const [first, emails] of [
      ['Ada', [own, agency]],
      ['Bea', [agency]],
    ] as const) {
      const id = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ($1, $2, 'e2e') RETURNING id`, [first, `Rundmail${stamp}`])).rows[0].id;
      people.push(id);
      // The agency's address came first and was the main one, as SchoolMan often has it.
      for (const [i, address] of [...emails].reverse().entries()) {
        await client.query(`INSERT INTO emails (person_id, address, normalized, is_primary, created_at) VALUES ($1, $2, $2, $3, now() - make_interval(days => $4))`, [
          id,
          address,
          address === agency,
          10 - i,
        ]);
      }
      const booking = (
        await client.query<{ id: string }>(`INSERT INTO bookings (person_id, status, course_type_id) VALUES ($1, 'confirmed', $2) RETURNING id`, [id, evening.rows[0].id])
      ).rows[0].id;
      await client.query(`INSERT INTO booking_periods (booking_id, start_date, end_date) VALUES ($1, current_date - 7, current_date + 30)`, [booking]);
    }
  });

  test.afterAll(async () => {
    if (!client) return;
    for (const id of people) {
      await client.query(`DELETE FROM booking_periods WHERE booking_id IN (SELECT id FROM bookings WHERE person_id = $1)`, [id]);
      await client.query(`DELETE FROM bookings WHERE person_id = $1`, [id]);
      await client.query(`DELETE FROM staff_activity WHERE entity = 'person' AND entity_id = $1`, [id]);
      await client.query(`DELETE FROM people WHERE id = $1`, [id]);
    }
    if (orgId) await client.query(`DELETE FROM organisations WHERE id = $1`, [orgId]);
    if (hash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [hash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  test('the evening course as a group: own addresses ticked, an agency apart', async ({ page }) => {
    await page.goto('/admin/mail/groups');
    await expect(page.getByRole('heading', { name: 'Rundmail', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Abendkurs/ })).toBeVisible();

    await page.goto('/admin/mail?to=learners:evening');
    await expect(page.getByText('Teilnehmende · Abendkurs').first()).toBeVisible();
    await page.getByRole('button', { name: 'Auswählen' }).click();
    const dialog = page.getByRole('dialog');
    const ada = dialog.locator('li', { hasText: `Ada Rundmail${stamp}` });
    await expect(ada).toContainText(own);
    await expect(ada.getByRole('checkbox')).toBeChecked();
    await expect(dialog.getByText('Nur über Agentur')).toBeVisible();
    const bea = dialog.locator('li', { hasText: `Bea Rundmail${stamp}` });
    await expect(bea).toContainText(agency);
    await expect(bea.getByRole('checkbox')).not.toBeChecked();
  });

  test('several addresses on the person, one the main one', async ({ page }) => {
    await page.goto(`/admin/people/${people[0]}?tab=details`);
    const contact = page.getByRole('heading', { name: 'Kontakt' }).locator('xpath=ancestor::section[1]');
    const ownRow = contact.locator('li', { hasText: own });
    await expect(ownRow).toContainText('Hauptadresse');
    await expect(contact.locator('li', { hasText: agency })).toContainText(`Agentur E2E ${stamp}`);

    await contact.getByRole('button', { name: 'E-Mail hinzufügen' }).click();
    await page.getByLabel('E-Mail-Adresse').fill(`ada-neu-${stamp}@privat-e2e.example`);
    await page.getByRole('dialog').getByText('Hauptadresse').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Hinzufügen' }).click();
    await expect(contact.locator('li', { hasText: `ada-neu-${stamp}` })).toContainText('Hauptadresse');
    await expect(ownRow).not.toContainText('Hauptadresse');

    await contact.locator('li', { hasText: `ada-neu-${stamp}` }).getByRole('button', { name: 'Entfernen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Entfernen' }).click();
    await expect(contact.locator('li', { hasText: `ada-neu-${stamp}` })).toHaveCount(0);
    await expect(ownRow).toContainText('Hauptadresse');
  });
});
