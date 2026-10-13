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
const LEARNER = { first: 'Lena', last: 'Probelernerin' };

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
    texts = (await client.query(`SELECT language, part, body FROM letter_texts WHERE kind = 'offer'`)).rows;
    started = (await client.query<{ t: Date }>(`SELECT now() AS t`)).rows[0].t;
  });

  test.afterAll(async () => {
    if (!client) return;
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM offers WHERE created_at >= $1`, [started]);
    const ids = rows.map((r) => r.id);
    await client.query(`DELETE FROM staff_activity WHERE (entity = 'offer' AND entity_id = ANY($1::uuid[])) OR (entity = 'letter_text' AND created_at >= $2)`, [ids, started]);
    await client.query(`DELETE FROM letters WHERE offer_id = ANY($1::uuid[])`, [ids]);
    await client.query(`DELETE FROM offers WHERE id = ANY($1::uuid[])`, [ids]);
    await client.query(`DELETE FROM organisations WHERE name = $1 AND created_at >= $2`, [ORGANISATION, started]);
    const people = await client.query<{ id: string }>(`SELECT id FROM people WHERE first_name = $1 AND last_name = $2 AND created_at >= $3`, [
      LEARNER.first,
      LEARNER.last,
      started,
    ]);
    const personIds = people.rows.map((r) => r.id);
    await client.query(`DELETE FROM staff_activity WHERE entity = 'person' AND entity_id = ANY($1::uuid[])`, [personIds]);
    await client.query(`DELETE FROM people WHERE id = ANY($1::uuid[])`, [personIds]);
    await client.query(`DELETE FROM letter_texts WHERE kind = 'offer'`);
    for (const t of texts) {
      await client.query(`INSERT INTO letter_texts (kind, language, part, body) VALUES ('offer', $1, $2, $3)`, [t.language, t.part, t.body]);
    }
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: 'casa_workspace_session', value: token, url: baseURL! }]);
  });

  /** Through the wizard: a school nobody has had an offer before, on the default package. */
  async function newGroupOffer(page: Page) {
    await page.goto('/admin/offers/new');
    await page.getByLabel('Who the offer is for').fill(ORGANISATION);
    await page.getByRole('button', { name: /as new/ }).click();
    // "Istituto …" reads as a school.
    await expect(page.getByRole('radio', { name: 'School' })).toHaveAttribute('aria-checked', 'true');
    const next = page.getByRole('button', { name: 'Continue' });
    await next.click();
    await expect(page.getByRole('radio', { name: /Katze/ })).toHaveAttribute('aria-checked', 'true');
    await next.click();
    await next.click();
    await page.getByRole('button', { name: 'Create offer' }).click();
    await expect(page).toHaveURL(/\/admin\/offers\/[0-9a-f-]{36}$/);
  }

  const saved = (page: Page) => expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 });
  const done = (page: Page) => page.getByRole('button', { name: 'Done' }).click();

  test('a package offer prices itself, saves itself, is written on the letter and frozen when sent', async ({ page }) => {
    await newGroupOffer(page);
    const main = page.locator('main');

    await page.getByRole('button', { name: 'Dates: change' }).click();
    await page.getByLabel('Arrival').fill('2027-04-11');
    await page.getByLabel('Departure').fill('2027-04-24');
    await done(page);
    await page.getByRole('button', { name: 'The group: change' }).click();
    const participants = page.getByLabel('Participants', { exact: true });
    await participants.fill('12');
    await participants.blur();
    await done(page);
    await saved(page);

    // Katze, the default package: 1,130 € a person, as on the groups page.
    await expect(page.getByRole('radio', { name: /Katze/ })).toHaveAttribute('aria-checked', 'true');
    await expect(main).toContainText('1.130,00 €');
    await expect(main).toContainText('13.560,00 €');

    // Esel prices the same stay block by block, from the same sheet.
    await page.getByRole('radio', { name: /Esel/ }).click();
    await expect(main).toContainText('1.044,00 €');
    await page.getByRole('radio', { name: /Katze/ }).click();

    // A price typed over the package price is kept and shown as a change.
    await page.getByRole('button', { name: 'Katze package: change' }).click();
    const price = page.getByRole('textbox', { name: /^Price per participant/ });
    await price.fill('1100');
    await price.blur();
    await done(page);
    await expect(page.getByLabel('Checks')).toContainText('1100 € instead of 1130 €');
    await saved(page);

    await page.getByRole('button', { name: 'Recipient: change' }).click();
    await page.getByLabel('Email').fill('gruppi@example.it');
    await done(page);
    await saved(page);

    await page.reload();
    await expect(main).toContainText('12 participants');
    await expect(main).toContainText('13.200,00 €');

    // The letter is the other tab, written where it stands.
    await page.getByRole('link', { name: 'Letter', exact: true }).click();
    await expect(page).toHaveURL(/\/letter$/);
    const letter = page.locator('article').first();
    await expect(letter).toContainText('Katze package · 2 weeks of exploring');
    await expect(letter).toContainText('Total for the group (12 participants)');
    await expect(letter).toContainText('€13,200.00');

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
      `SELECT o.status, (SELECT count(*) FROM letters WHERE offer_id = o.id) AS versions,
              (SELECT subject FROM letters WHERE offer_id = o.id) AS subject
         FROM offers o WHERE o.id = $1`,
      [id]
    );
    expect(rows[0]).toMatchObject({ status: 'sent', versions: '1' });
    expect(rows[0].subject).toContain('German and culture in Bremen');
  });

  test('a package takes what the group wants on top: an afternoon, a transfer, a reduction', async ({ page }) => {
    await newGroupOffer(page);
    const main = page.locator('main');
    await page.getByRole('radio', { name: /Hahn/ }).click();
    await expect(main).toContainText('595,00 €');

    await page.getByRole('button', { name: 'More afternoons: change' }).click();
    await page.getByRole('button', { name: /Hafenrundfahrt/ }).click();
    await done(page);
    await expect(main).toContainText('622,00 €');

    await page.getByRole('button', { name: '+ Add an extra' }).click();
    await page.getByRole('menuitem', { name: 'Airport transfer' }).click();
    await page.getByRole('button', { name: /^Airport transfer.*: change$/ }).click();
    const price = page.getByRole('textbox', { name: 'Price', exact: true });
    await price.fill('35');
    await price.blur();
    await done(page);
    await expect(main).toContainText('657,00 €');

    await page.getByRole('button', { name: '+ Add an extra' }).click();
    await page.getByRole('menuitem', { name: 'A reduction' }).click();
    await page.getByRole('button', { name: 'Reduction: change' }).click();
    const less = page.getByRole('textbox', { name: 'Taken off, per person' });
    await less.fill('20');
    await less.blur();
    await done(page);
    await expect(main).toContainText('637,00 €');
    await saved(page);

    await page.getByRole('link', { name: 'Letter', exact: true }).click();
    const letter = page.locator('article').first();
    await expect(letter).toContainText('Additional programme: Hafenrundfahrt');
    await expect(letter).toContainText('Airport transfer (both ways)');
    await expect(letter).toContainText('€637.00');
  });

  test('an opening changed on the letter becomes the standard for every offer', async ({ page }) => {
    await newGroupOffer(page);
    await page.goto(`${page.url()}/letter`);
    await page.getByRole('button', { name: 'Change opening' }).click();
    const opening = page.getByRole('textbox', { name: 'Opening' });
    await opening.fill('Thank you for thinking of CASA for your group. Here is what we suggest:');
    const bar = page.getByRole('toolbar', { name: 'Opening' });
    await expect(bar.getByText('Only this letter', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save as standard' }).click();
    // The text is the standard now, so this offer follows it again.
    await expect(bar.getByText('Standard text', { exact: true })).toBeVisible();
    await expect(page.getByText('Only this letter', { exact: true })).toHaveCount(0);

    const { rows } = await client.query<{ body: string }>(
      `SELECT body FROM letter_texts WHERE kind = 'offer' AND language = 'en' AND part = 'intro'`
    );
    expect(rows[0]?.body).toBe('Thank you for thinking of CASA for your group. Here is what we suggest:');
  });

  test('a learner’s course: the level, its books, the enrolment fee, a room — and the time of day on the letter', async ({ page }) => {
    await page.goto('/admin/offers/new');
    await page.getByRole('radio', { name: 'Learners' }).click();
    await page.getByLabel('Who the offer is for').fill(`${LEARNER.first} ${LEARNER.last}`);
    await page.getByRole('button', { name: /as new/ }).click();
    const next = page.getByRole('button', { name: 'Continue' });
    await next.click();

    // A learner's offer is a course: no packages, the intensive course first, the next morning term.
    await expect(page.getByRole('radio', { name: /Katze/ })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: /^Intensive German/ })).toHaveAttribute('aria-checked', 'true');
    await page.locator('[class*="termGrid"] button').first().click();
    await page.getByRole('button', { name: 'B2 complete', exact: true }).click();
    const onOffer = page.locator('[class*="lineList"]');
    await expect(onOffer).toContainText('940,00 €');
    await expect(onOffer).toContainText('Kontext B2.1');
    await expect(onOffer).toContainText('First registration at CASA');
    await page.getByRole('checkbox', { name: /^Accommodation/ }).check();
    // Rent for the course's whole weeks, the placement fee and the deposit of a first stay.
    await expect(onOffer.getByRole('checkbox', { name: /^Accommodation/ })).toBeChecked();
    await expect(onOffer).toContainText(/Accommodation\s*1\.\d{3},00\s€/);

    await next.click();
    await expect(page.getByLabel('Title on the letter')).toHaveValue('Intensivkurs B2 komplett');
    await page.getByRole('button', { name: 'Create offer' }).click();
    await expect(page).toHaveURL(/\/admin\/offers\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { name: 'Intensive German B2 complete', level: 2 })).toBeVisible();
    // The team sees the time of day; the letter gives the learner the hours.
    await expect(page.locator('[class*="courseFacts"]')).toContainText('Mornings');

    await page.getByRole('link', { name: 'Letter', exact: true }).click();
    await expect(page).toHaveURL(/\/letter$/);
    const letter = page.locator('article').first();
    await expect(letter).toContainText('Intensivkurs B2 komplett');
    await expect(letter).toContainText('Vormittags, Mo–Fr 09:00–12:30');
    await expect(letter).toContainText('Einschreibegebühr');
    await expect(letter).toContainText('Kaution Unterkunft (rückerstattbar)');
  });

  test("a colleague's save in between is not overwritten", async ({ page }) => {
    await newGroupOffer(page);
    const id = page.url().split('/').pop()!;
    await client.query(`UPDATE offers SET revision = revision + 1, participants = 30 WHERE id = $1`, [id]);

    await page.getByRole('button', { name: 'The group: change' }).click();
    const participants = page.getByLabel('Participants', { exact: true });
    await participants.fill('8');
    await participants.blur();
    await expect(page.getByText('A colleague has changed this offer in the meantime.', { exact: false })).toBeVisible({ timeout: 10_000 });

    const { rows } = await client.query<{ participants: number }>(`SELECT participants FROM offers WHERE id = $1`, [id]);
    expect(rows[0].participants).toBe(30);
  });
});
