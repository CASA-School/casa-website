import { createHash, randomBytes } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';
import pg from 'pg';

/**
 * Offers, built and sent by a signed-in owner (docs/OFFERS.md).
 *
 * Runs only with a database and an owner account; the session is opened the
 * way `scripts/admin/check-routes.mjs` does it. Every offer and organisation
 * the run creates is deleted afterwards with its activity, and the standard
 * texts are put back as they were.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const ORGANISATION = 'Istituto Pacinotti Venezia';

test.describe('offers', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let started: Date;
  let texts: { language: string; part: string; body: string }[] = [];

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
       VALUES ($1, $2, now() + interval '10 minutes', 'e2e:offers')`,
      [rows[0].id, tokenHash]
    );
    texts = (await client.query(`SELECT language, part, body FROM offer_texts`)).rows;
    started = (await client.query<{ t: Date }>(`SELECT now() AS t`)).rows[0].t;
  });

  test.afterAll(async () => {
    if (!client) return;
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM offers WHERE created_at >= $1`, [started]);
    const ids = rows.map((r) => r.id);
    await client.query(`DELETE FROM staff_activity WHERE (entity = 'offer' AND entity_id = ANY($1::uuid[])) OR (entity = 'offer_text' AND created_at >= $2)`, [ids, started]);
    await client.query(`DELETE FROM offers WHERE id = ANY($1::uuid[])`, [ids]);
    await client.query(`DELETE FROM organisations WHERE name = $1 AND created_at >= $2`, [ORGANISATION, started]);
    await client.query(`DELETE FROM offer_texts`);
    for (const t of texts) await client.query(`INSERT INTO offer_texts (language, part, body) VALUES ($1, $2, $3)`, [t.language, t.part, t.body]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: 'casa_workspace_session', value: token, url: baseURL! }]);
  });

  async function newGroupOffer(page: Page) {
    await page.goto('/admin/offers/new');
    await page.getByLabel('Who the offer is for').fill(ORGANISATION);
    await page.getByRole('button', { name: /New organisation · a group offer/ }).click();
    await expect(page).toHaveURL(/\/admin\/offers\/[0-9a-f-]{36}$/);
  }

  const saved = (page: Page) => expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });
  const done = (page: Page) => page.getByRole('button', { name: 'Done' }).click();

  test('an offer is built on one page, written on the letter, and frozen when sent', async ({ page }) => {
    await newGroupOffer(page);
    const main = page.locator('main');

    await page.getByRole('button', { name: 'Dates: change' }).click();
    await page.getByLabel('Arrival').fill('2027-04-11');
    await page.getByLabel('Departure').fill('2027-04-24');
    await done(page);
    await page.getByRole('button', { name: 'Group: change' }).click();
    const participants = page.getByLabel('Participants', { exact: true });
    await participants.fill('12');
    await participants.blur();
    await done(page);
    await saved(page);

    // Two weeks from the group price list: 290 + 20 + 450 + 120 + 50 + 120 + 30.
    await expect(main).toContainText('1.080,00 €');
    await expect(main).toContainText('12.960,00 €');

    // A price typed over the list price is kept and shown as a change.
    await page.getByText('German course', { exact: true }).click();
    const price = page.getByRole('textbox', { name: /^Price per person: German course/ });
    await price.fill('140');
    await price.blur();
    await done(page);
    await expect(page.getByLabel('Checks')).toContainText('instead of 145 €');
    await saved(page);

    await page.getByRole('button', { name: 'Recipient: change' }).click();
    await page.getByLabel('Email').fill('gruppi@example.it');
    await done(page);
    await saved(page);

    await page.reload();
    await expect(main).toContainText('12 participants');
    await expect(main).toContainText('1.070,00 €');

    // The letter is the other tab, written where it stands.
    await page.getByRole('link', { name: 'Letter' }).click();
    await expect(page).toHaveURL(/\/letter$/);
    const letter = page.locator('article').first();
    await expect(letter).toContainText('Total for the group (12 participants)');
    await expect(letter).toContainText('€12,840.00');

    await page.getByRole('button', { name: 'Change title' }).click();
    await page.getByRole('textbox', { name: 'Title' }).fill('German and culture in Bremen');
    await done(page);
    await saved(page);
    await expect(letter).toContainText('German and culture in Bremen');

    await page.getByRole('button', { name: /^Send/ }).click();
    await page.getByRole('button', { name: 'Mark as sent' }).click();
    await expect(page).toHaveURL(/ok=sent/);
    await expect(page.getByText(/· Sent$/)).toBeVisible();

    const id = page.url().split('/').pop()!.split('?')[0];
    const { rows } = await client.query<{ status: string; versions: string; subject: string }>(
      `SELECT o.status, (SELECT count(*) FROM offer_versions WHERE offer_id = o.id) AS versions,
              (SELECT document->'letter'->>'subject' FROM offer_versions WHERE offer_id = o.id) AS subject
         FROM offers o WHERE o.id = $1`,
      [id]
    );
    expect(rows[0]).toMatchObject({ status: 'sent', versions: '1' });
    expect(rows[0].subject).toContain('German and culture in Bremen');
  });

  test('an opening changed on the letter becomes the standard for every offer', async ({ page }) => {
    await newGroupOffer(page);
    await page.goto(`${page.url()}/letter`);
    await page.getByRole('button', { name: 'Change opening' }).click();
    const opening = page.getByRole('textbox', { name: 'Opening' });
    await opening.fill('Thank you for thinking of CASA for your group. Here is what we suggest:');
    await expect(page.getByText('Only this offer')).toBeVisible();
    await page.getByRole('button', { name: 'Save as standard' }).click();
    // The text is the standard now, so this offer follows it again.
    await expect(page.getByText('Standard text', { exact: true })).toBeVisible();
    await expect(page.getByText('Only this offer')).toHaveCount(0);

    const { rows } = await client.query<{ body: string }>(`SELECT body FROM offer_texts WHERE language = 'en' AND part = 'intro'`);
    expect(rows[0]?.body).toBe('Thank you for thinking of CASA for your group. Here is what we suggest:');
  });

  test("a colleague's save in between is not overwritten", async ({ page }) => {
    await newGroupOffer(page);
    const id = page.url().split('/').pop()!;
    await client.query(`UPDATE offers SET revision = revision + 1, participants = 30 WHERE id = $1`, [id]);

    await page.getByRole('button', { name: 'Group: change' }).click();
    const participants = page.getByLabel('Participants', { exact: true });
    await participants.fill('8');
    await participants.blur();
    await expect(page.getByText('A colleague has changed this offer in the meantime.', { exact: false })).toBeVisible({ timeout: 10_000 });

    const { rows } = await client.query<{ participants: number }>(`SELECT participants FROM offers WHERE id = $1`, [id]);
    expect(rows[0].participants).toBe(30);
  });
});
