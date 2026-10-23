import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * The enquiry queue: the last seven days by day, „Erledigt" in one click, the
 * history behind it (2026-10-14). An enquiry sent today sits under „Heute";
 * closing it keeps it under its day, marked, and takes it out of the open count;
 * „Wieder öffnen" undoes it. It is not in the history, and a search finds it.
 * On its page, a colleague takes it, moves it along, writes a note, and the
 * reply opens in the language it was written in.
 *
 * Runs only with a database and an owner account, in German (the default,
 * pinned in case the account chose English). The enquiry it writes is deleted
 * afterwards with its activity.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const NAME = { first: 'Edda', last: 'Prüfanfrage' };

test.describe('enquiries', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let enquiryId = '';
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
       VALUES ($1, $2, now() + interval '10 minutes', 'e2e:enquiries')`,
      [rows[0].id, tokenHash]
    );
    enquiryId = (
      await client.query<{ id: string }>(
        `INSERT INTO enquiries (request_id, locale, first_name, last_name, email, topic, message, source)
         VALUES ($1, 'de', $2, $3, 'edda.pruefanfrage@example.com', 'Abendkurs im November', 'Gibt es noch Plätze?', 'e2e')
         RETURNING id`,
        [randomUUID(), NAME.first, NAME.last]
      )
    ).rows[0].id;
  });

  test.afterAll(async () => {
    if (!client) return;
    if (enquiryId) {
      await client.query(`DELETE FROM staff_notes WHERE entity = 'enquiry' AND entity_id = $1`, [enquiryId]);
      await client.query(`DELETE FROM staff_activity WHERE entity = 'enquiry' AND entity_id = $1`, [enquiryId]);
      await client.query(`DELETE FROM enquiries WHERE id = $1`, [enquiryId]);
    }
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

  test('a new enquiry is under Heute; „Erledigt" keeps it there, closed, and takes it out of the open count', async ({ page }) => {
    const name = `${NAME.first} ${NAME.last}`;
    const tally = async (tone: 'new' | 'working') => {
      const count = page.locator(`[data-tally="${tone}"] b`);
      return (await count.count()) ? Number((await count.innerText()).replace(/\D+/g, '')) : 0;
    };

    await page.goto('/admin/enquiries');
    const today = page.locator('section', { has: page.getByRole('heading', { name: 'Heute' }) });
    const row = today.getByRole('listitem').filter({ hasText: name });
    await expect(row).toContainText('Abendkurs im November');
    const fresh = await tally('new');
    const working = await tally('working');

    await row.getByRole('button', { name: 'Erledigt' }).click();
    await expect(row.getByRole('button', { name: 'Wieder öffnen' })).toBeVisible();
    await expect(row).toContainText('Erledigt');
    expect(await tally('new')).toBe(fresh - 1);

    await row.getByRole('button', { name: 'Wieder öffnen' }).click();
    await expect(row).toContainText('In Arbeit');
    expect(await tally('working')).toBe(working + 1);

    // Today is not history; a search looks through every week and finds it.
    await page.goto('/admin/enquiries?view=history');
    await expect(page.getByRole('listitem').filter({ hasText: name })).toHaveCount(0);
    await page.goto(`/admin/enquiries?q=${encodeURIComponent(NAME.last)}`);
    await expect(page.getByRole('listitem').filter({ hasText: name })).toHaveCount(1);
  });

  test('on the enquiry: take it, move it along, write a note, reply in its language', async ({ page }) => {
    await page.goto(`/admin/enquiries/${enquiryId}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${NAME.first} ${NAME.last}`);

    await page.getByRole('button', { name: 'Übernehmen' }).click();
    await expect(page.getByText('Zuständig: du')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Übernehmen' })).toHaveCount(0);

    // Three states (2026-10-21): Offen, In Arbeit, Erledigt.
    await page.getByRole('button', { name: 'Offen' }).click();
    await expect(page.getByRole('button', { name: 'Offen' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'In Arbeit' }).click();
    await expect(page.getByRole('button', { name: 'In Arbeit' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Wer sich darum kümmert' }).click();
    await page.getByRole('menuitem', { name: 'Niemand' }).click();
    await expect(page.getByText('Zuständig: niemand')).toBeVisible();

    await page.getByRole('textbox', { name: 'Neue Notiz' }).fill('Angerufen, Platzanfrage an den Kurs weitergegeben.');
    await page.getByRole('button', { name: 'Notiz hinzufügen' }).click();
    await expect(page.getByText('Angerufen, Platzanfrage an den Kurs weitergegeben.')).toBeVisible();

    // Written in German, so the reply on the mail screen opens with a German greeting.
    await page.getByRole('link', { name: 'Antworten' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E-Mail schreiben');
    await expect(page.getByRole('textbox', { name: 'Text' })).toHaveValue(new RegExp(`^Hallo ${NAME.first},`));
    await expect(page.getByRole('button', { name: 'Direkt senden' })).toBeVisible();
  });

  test('a learner’s enquiry leads to an offer or straight to a booking', async ({ page }) => {
    personId = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ($1, $2, 'e2e') RETURNING id`, [NAME.first, NAME.last])).rows[0].id;
    await client.query(`UPDATE enquiries SET person_id = $2 WHERE id = $1`, [enquiryId, personId]);
    await page.goto(`/admin/enquiries/${enquiryId}`);
    await expect(page.getByRole('link', { name: 'Angebot erstellen' })).toHaveAttribute('href', `/admin/offers/new?enquiry=${enquiryId}`);
    await page.getByRole('button', { name: 'Weiter mit …' }).click();
    await page.getByRole('menuitem', { name: 'Zu einem Kurs anmelden' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/people/${personId}\\?book=1$`));
    await expect(page.getByRole('dialog')).toContainText(`${NAME.first} ${NAME.last} buchen`);
  });

  /*
   * 0076 (2026-10-21): a website contact is no learner until a colleague acts. Off the register, then
   * „Als Teilnehmende/n anlegen"; „Organisation zuordnen" adds the sender as the organisation's contact;
   * spam leaves every list, and „Löschen" removes the enquiry.
   */
  test('a website contact is off Teilnehmende until a colleague acts; organisation, spam, delete', async ({ page }) => {
    await client.query(`UPDATE people SET listed = false WHERE id = $1`, [personId]);
    const orgName = `Prüfagentur ${randomUUID().slice(0, 6)}`;
    const orgId = (await client.query<{ id: string }>(`INSERT INTO organisations (name, kind, language) VALUES ($1, 'agency', 'de') RETURNING id`, [orgName])).rows[0].id;
    try {
      await page.goto(`/admin/people?q=${encodeURIComponent(NAME.last)}`);
      await expect(page.getByRole('link', { name: new RegExp(NAME.last) })).toHaveCount(0);

      await page.goto(`/admin/enquiries/${enquiryId}`);
      await expect(page.getByText('Noch nicht in Teilnehmende')).toBeVisible();
      await page.getByRole('button', { name: 'Weiter mit …' }).click();
      await page.getByRole('menuitem', { name: 'Als Teilnehmende/n anlegen' }).click();
      await expect(page.getByText('Noch nicht in Teilnehmende')).toHaveCount(0);
      expect((await client.query<{ listed: boolean }>(`SELECT listed FROM people WHERE id = $1`, [personId])).rows[0].listed).toBe(true);

      await page.getByRole('button', { name: 'Weiter mit …' }).click();
      await page.getByRole('menuitem', { name: 'Organisation zuordnen …' }).click();
      await page.getByRole('textbox', { name: 'Organisation suchen' }).fill(orgName);
      await page.getByRole('option', { name: new RegExp(orgName) }).click();
      await page.getByRole('button', { name: 'Zuordnen' }).click();
      await expect(page.getByRole('link', { name: orgName })).toBeVisible();
      const contacts = await client.query(`SELECT 1 FROM organisation_contacts WHERE organisation_id = $1 AND email = 'edda.pruefanfrage@example.com'`, [orgId]);
      expect(contacts.rowCount).toBe(1);

      await page.getByRole('button', { name: 'Weiter mit …' }).click();
      await page.getByRole('menuitem', { name: 'Als Spam markieren' }).click();
      await expect(page.locator('header').getByText('Spam', { exact: true })).toBeVisible();
      await expect.poll(async () => (await client.query<{ status: string }>(`SELECT status FROM enquiries WHERE id = $1`, [enquiryId])).rows[0].status).toBe('spam');
      await page.reload();

      await page.getByRole('button', { name: 'Weiter mit …' }).click();
      await page.getByRole('menuitem', { name: 'Löschen …' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();
      await expect(page).toHaveURL(/\/admin\/enquiries$/);
      expect((await client.query<{ gone: boolean }>(`SELECT deleted_at IS NOT NULL AS gone FROM enquiries WHERE id = $1`, [enquiryId])).rows[0].gone).toBe(true);
    } finally {
      await client.query(`UPDATE enquiries SET organisation_id = NULL WHERE id = $1`, [enquiryId]);
      await client.query(`DELETE FROM organisation_contacts WHERE organisation_id = $1`, [orgId]);
      await client.query(`DELETE FROM staff_activity WHERE entity = 'organisation' AND entity_id = $1`, [orgId]);
      await client.query(`DELETE FROM organisations WHERE id = $1`, [orgId]);
    }
  });
});
