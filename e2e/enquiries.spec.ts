import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * The enquiry queue: the last seven days by day, „Erledigt" in one click, the
 * history behind it (2026-10-14). An enquiry sent today sits under „Heute";
 * closing it keeps it under its day, marked, and takes it out of the open count;
 * „Wieder öffnen" undoes it. It is not in the history, and a search finds it.
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
      await client.query(`DELETE FROM staff_activity WHERE entity = 'enquiry' AND entity_id = $1`, [enquiryId]);
      await client.query(`DELETE FROM enquiries WHERE id = $1`, [enquiryId]);
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
    await expect(row).toContainText('In Bearbeitung');
    expect(await tally('working')).toBe(working + 1);

    // Today is not history; a search looks through every week and finds it.
    await page.goto('/admin/enquiries?view=history');
    await expect(page.getByRole('listitem').filter({ hasText: name })).toHaveCount(0);
    await page.goto(`/admin/enquiries?q=${encodeURIComponent(NAME.last)}`);
    await expect(page.getByRole('listitem').filter({ hasText: name })).toHaveCount(1);
  });
});
