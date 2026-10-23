import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * Exam bookings (2026-10-17, migrations 0036–0037). A candidate is booked into a sitting from the
 * wizard, priced from the exam's rate; a full sitting is not booked over but queued for; the
 * candidate is marked as reported to telc; more places let the queue move up; the exam's own
 * confirmation is written from the booking.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('exam bookings', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');
  test.describe.configure({ mode: 'serial' });

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let sittingId = '';
  let anaId = '';
  let benId = '';
  let caraId = '';
  let bookingId = '';
  let pastId = '';
  let pastBookingId = '';
  let newSittingId = '';

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:exams')`,
      [rows[0].id, tokenHash]
    );
    // One place, a deadline still ahead, a day no seed has: the sitting is easy to tell apart.
    sittingId = (
      await client.query<{ id: string }>(
        `INSERT INTO exam_sessions (exam_type_id, starts_at, ends_at, registration_deadline, capacity, status)
         SELECT id, (current_date + 45) + time '09:00', (current_date + 45) + time '17:00', current_date + 10, 1, 'scheduled'
           FROM exam_types WHERE code = 'telc_b2' RETURNING id`
      )
    ).rows[0].id;
    anaId = (
      await client.query<{ id: string }>(
        `INSERT INTO people (first_name, last_name, salutation, birth_date, birth_place, birth_country_code, mother_tongue, created_by)
         VALUES ('Ana', 'Prüfungstest', 'ms', '1997-06-01', 'Porto', 'PT', 'Portugiesisch', 'e2e') RETURNING id`
      )
    ).rows[0].id;
    benId = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, salutation, created_by) VALUES ('Ben', 'Prüfungstest', 'mr', 'e2e') RETURNING id`)).rows[0].id;
    await client.query(`INSERT INTO emails (person_id, address, normalized, kind, is_primary) VALUES ($1, 'ana@example.com', 'ana@example.com', 'personal', true)`, [anaId]);
    // A sitting ten days ago with Ana booked for both parts: its results are due.
    pastId = (
      await client.query<{ id: string }>(
        `INSERT INTO exam_sessions (exam_type_id, starts_at, ends_at, registration_deadline, capacity, status)
         SELECT id, ((current_date - 10) + time '09:00') AT TIME ZONE 'Europe/Berlin', ((current_date - 10) + time '17:00') AT TIME ZONE 'Europe/Berlin', current_date - 40, 20, 'scheduled'
           FROM exam_types WHERE code = 'telc_b2' RETURNING id`
      )
    ).rows[0].id;
    pastBookingId = (
      await client.query<{ id: string }>(`INSERT INTO bookings (person_id, status, exam_session_id, exam_parts) VALUES ($1, 'confirmed', $2, 'full') RETURNING id`, [anaId, pastId])
    ).rows[0].id;
  });

  test.afterAll(async () => {
    if (!client) return;
    const people = [anaId, benId, caraId].filter(Boolean);
    await client.query(`DELETE FROM emails WHERE person_id = ANY($1::uuid[])`, [people]);
    if (newSittingId) await client.query(`DELETE FROM staff_activity WHERE entity_id = $1`, [newSittingId]);
    if (newSittingId) await client.query(`DELETE FROM exam_sessions WHERE id = $1`, [newSittingId]);
    await client.query(`DELETE FROM letters WHERE person_id = ANY($1::uuid[])`, [people]);
    await client.query(`DELETE FROM staff_activity WHERE entity_id = ANY($1::uuid[]) OR entity_id IN (SELECT id FROM bookings WHERE person_id = ANY($1::uuid[]))`, [
      [...people, sittingId].filter(Boolean),
    ]);
    if (sittingId) await client.query(`DELETE FROM waitlist_entries WHERE exam_session_id = $1`, [sittingId]);
    await client.query(`DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE person_id = ANY($1::uuid[]))`, [people]);
    await client.query(`DELETE FROM bookings WHERE person_id = ANY($1::uuid[])`, [people]);
    if (sittingId) await client.query(`DELETE FROM exam_sessions WHERE id = $1`, [sittingId]);
    if (pastId) await client.query(`DELETE FROM staff_activity WHERE entity_id = $1`, [pastId]);
    if (pastId) await client.query(`DELETE FROM exam_sessions WHERE id = $1`, [pastId]);
    await client.query(`DELETE FROM people WHERE id = ANY($1::uuid[])`, [people]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  /** The wizard up to its review: an exam, the parts, the e2e sitting. */
  async function chooseSitting(page: import('@playwright/test').Page, personId: string) {
    const dialog = page.getByRole('dialog');
    await page.goto(`/admin/people/${personId}`);
    await page.getByRole('button', { name: 'Neue Buchung' }).click();
    await dialog.getByRole('button', { name: /^Eine Prüfung/ }).click();
    await dialog.getByRole('button', { name: /^telc Deutsch B2/ }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    // The e2e sitting, by its day as the wizard writes it.
    const { rows } = await client.query<{ starts_at: Date }>(`SELECT starts_at FROM exam_sessions WHERE id = $1`, [sittingId]);
    const day = rows[0].starts_at.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    await dialog.getByRole('button').filter({ hasText: day }).first().click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    return dialog;
  }

  test('a candidate is booked into a sitting and priced from the exam’s rate', async ({ page }) => {
    const dialog = await chooseSitting(page, anaId);
    await expect(dialog).toContainText('Ganze Prüfung');
    await dialog.getByRole('button', { name: 'Buchung anlegen' }).click();
    await expect(page).toHaveURL(/\/admin\/bookings\/[0-9a-f-]{36}$/);
    bookingId = page.url().split('/').pop()!;
    await expect(page.getByRole('heading', { name: 'Ana Prüfungstest' })).toBeVisible();
    await expect(page.locator('body')).toContainText('telc Deutsch B2');

    const { rows } = await client.query<{ exam_session_id: string; exam_parts: string; amount: string }>(
      `SELECT b.exam_session_id, b.exam_parts, c.amount FROM bookings b JOIN booking_charges c ON c.booking_id = b.id WHERE b.id = $1`,
      [bookingId]
    );
    expect(rows).toEqual([{ exam_session_id: sittingId, exam_parts: 'full', amount: '190.00' }]);
  });

  test('a full sitting is not booked over: the candidate queues for it', async ({ page }) => {
    const dialog = await chooseSitting(page, benId);
    await expect(dialog).toContainText('Dieser Termin ist voll (1 von 1 Plätzen)');
    await expect(dialog.getByRole('button', { name: 'Trotzdem buchen' })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Auf die Warteliste' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/catalogue/exams/${sittingId}`));
    const { rows } = await client.query<{ status: string; exam_parts: string }>(`SELECT status, exam_parts FROM waitlist_entries WHERE exam_session_id = $1 AND person_id = $2`, [
      sittingId,
      benId,
    ]);
    expect(rows).toEqual([{ status: 'waiting', exam_parts: 'full' }]);
  });

  test('reported to telc, then a second place moves the queue up', async ({ page }) => {
    await page.goto(`/admin/catalogue/exams/${sittingId}`);
    await page.getByRole('checkbox', { name: 'Ana Prüfungstest als gemeldet markieren' }).check();
    await page.getByRole('button', { name: 'Ausgewählte als gemeldet markieren' }).click();
    await expect(page.locator('body')).toContainText(/Gemeldet \d+\./);
    const filed = await client.query<{ filed: boolean }>(`SELECT exam_filed_at IS NOT NULL AS filed FROM bookings WHERE id = $1`, [bookingId]);
    expect(filed.rows[0].filed).toBe(true);

    await page.getByRole('button', { name: 'Bearbeiten' }).click();
    await page.getByRole('dialog').getByRole('spinbutton', { name: 'Plätze' }).fill('2');
    await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();
    const banner = page.getByRole('status');
    await expect(banner).toContainText('1 Platz frei');
    await expect(banner).toContainText('Ben Prüfungstest');
  });

  test('the exam’s confirmation is written from the booking', async ({ page }) => {
    await page.goto(`/admin/bookings/${bookingId}/letter`);
    const sheet = page.locator('article').first();
    await expect(sheet).toContainText('Bestätigung deiner Prüfungsanmeldung');
    await expect(sheet).toContainText(/überweise bitte 190,00\s€ bis zum/);
    await expect(sheet).toContainText('telc druckt dein Zertifikat mit diesem Namen');
    await page.getByRole('button', { name: 'Als gesendet speichern' }).click();
    await expect(page).toHaveURL(/\/admin\/letters\/mail\?ids=[0-9a-f-]{36}&saved=1$/);
    const { rows } = await client.query<{ kind: string }>(`SELECT kind FROM letters WHERE booking_id = $1`, [bookingId]);
    expect(rows).toEqual([{ kind: 'exam_confirmation' }]);
  });

  test('„Buchen“ on a sitting: a learner found by name, or a new one, then the wizard at that sitting', async ({ page }) => {
    await page.goto(`/admin/catalogue/exams/${sittingId}`);
    // The head's „Buchen" (a queue row has its own, for its person).
    await page.getByRole('button', { name: 'Buchen', exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    const search = dialog.getByRole('searchbox', { name: 'Person suchen' });
    // Booked already: said, not offered again.
    await search.fill('Ana Prüfungst');
    await expect(dialog.getByRole('link', { name: /Ana Prüfungstest/ })).toContainText('Schon gebucht');
    await search.fill('Ben Prüfungst');
    await expect(dialog.getByRole('link', { name: /Ben Prüfungstest/ })).toHaveAttribute('href', `/admin/people/${benId}?book=1&sitting=${sittingId}`);
    // Nobody: a new person from what was typed, on into the wizard at this sitting.
    await search.fill('Cara Prüfungstest');
    await dialog.getByRole('button', { name: '„Cara Prüfungstest“ neu anlegen' }).click();
    await expect(dialog.getByLabel('Vorname')).toHaveValue('Cara');
    await expect(dialog.getByLabel('Nachname')).toHaveValue('Prüfungstest');
    await dialog.getByLabel('E-Mail').fill('cara.pruefungstest@example.com');
    await dialog.getByRole('button', { name: 'Weiter zur Buchung' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/people/[0-9a-f-]{36}\\?book=1&sitting=${sittingId}$`));
    caraId = new URL(page.url()).pathname.split('/').pop()!;
    const wizard = page.getByRole('dialog');
    await expect(wizard).toContainText('Welcher Termin für telc Deutsch B2?');
    const { rows } = await client.query<{ starts_at: Date }>(`SELECT starts_at FROM exam_sessions WHERE id = $1`, [sittingId]);
    const day = rows[0].starts_at.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    await expect(wizard.getByRole('button').filter({ hasText: day }).first()).toHaveAttribute('aria-pressed', 'true');
  });

  test('the list counts the sittings ahead, and the last fortnight’s stand under „Vorbei“', async ({ page }) => {
    await page.goto('/admin/catalogue/exams');
    const rows = page.locator('table tbody tr');
    const texts = await rows.allInnerTexts();
    const past = texts.findIndex((text) => /^\s*Vorbei\s*\d+\s*$/.test(text));
    expect(past).toBeGreaterThan(0);
    const pastRow = await rows.filter({ has: page.locator(`a[href="/admin/catalogue/exams/${pastId}"]`) }).first().evaluate((tr) => [...tr.parentElement!.children].indexOf(tr));
    const aheadRow = await rows.filter({ has: page.locator(`a[href="/admin/catalogue/exams/${sittingId}"]`) }).first().evaluate((tr) => [...tr.parentElement!.children].indexOf(tr));
    expect(pastRow).toBeGreaterThan(past);
    expect(aheadRow).toBeLessThan(past);
    // „n kommende Termine": the rows above „Vorbei", without the month headings and a cancelled one.
    const ahead = texts.slice(0, past).filter((text) => /\d{2}:\d{2}/.test(text) && !/Abgesagt/.test(text)).length;
    await expect(page.locator('main')).toContainText(new RegExp(`${ahead}\\s*kommender? Termin`));
  });

  test('a sitting with a candidate is not called off', async ({ page }) => {
    await page.goto(`/admin/catalogue/exams/${sittingId}`);
    await page.getByRole('button', { name: 'Termin absagen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Termin absagen' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Erst die Buchung' })).toContainText('auf einen anderen Termin verschieben');
    const { rows } = await client.query<{ status: string }>(`SELECT status FROM exam_sessions WHERE id = $1`, [sittingId]);
    expect(rows[0].status).toBe('scheduled');
  });

  test('a new sitting: created, taken off the website, deleted', async ({ page }) => {
    await page.goto('/admin/catalogue/exams');
    await page.getByRole('button', { name: 'Neuer Termin' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Prüfung', { exact: true }).selectOption({ label: 'telc Deutsch C1 Hochschule' });
    await dialog.locator('#sitting-day').fill('+120');
    await dialog.locator('#sitting-day').press('Tab');
    await dialog.getByRole('spinbutton', { name: 'Plätze' }).fill('12');
    await dialog.getByRole('button', { name: 'Termin anlegen' }).click();
    await expect(page).toHaveURL(/\/admin\/catalogue\/exams\/[0-9a-f-]{36}$/);
    newSittingId = page.url().split('/').pop()!;
    const created = await client.query<{ status: string; capacity: number; gap: number }>(
      `SELECT status, capacity, ((starts_at AT TIME ZONE 'Europe/Berlin')::date - registration_deadline) AS gap FROM exam_sessions WHERE id = $1`,
      [newSittingId]
    );
    // On the website, and the deadline a month and a day before.
    expect(created.rows[0].status).toBe('scheduled');
    expect(created.rows[0].capacity).toBe(12);
    expect(created.rows[0].gap).toBeGreaterThanOrEqual(29);

    await page.getByRole('button', { name: 'Bearbeiten' }).click();
    await page.getByRole('dialog').getByLabel('Auf der Website zur Anmeldung anbieten').uncheck();
    await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Entwurf', { exact: true })).toBeVisible();
    const draft = await client.query<{ status: string }>(`SELECT status FROM exam_sessions WHERE id = $1`, [newSittingId]);
    expect(draft.rows[0].status).toBe('draft');

    await page.getByRole('button', { name: 'Termin löschen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Löschen', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/catalogue\/exams$/);
    const gone = await client.query(`SELECT 1 FROM exam_sessions WHERE id = $1`, [newSittingId]);
    expect(gone.rowCount).toBe(0);
    newSittingId = '';
  });

  test('results entered, collected, and a confirmation of participation to all', async ({ page }) => {
    await page.goto(`/admin/catalogue/exams/${pastId}/results`);
    await page.getByLabel('Ana Prüfungstest: Schriftlich').selectOption({ label: 'Bestanden' });
    await page.getByLabel('Ana Prüfungstest: Mündlich').selectOption({ label: 'Nicht bestanden' });
    await page.getByRole('button', { name: 'Ergebnisse speichern' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/catalogue/exams/${pastId}$`));
    await expect(page.locator('body')).toContainText('Teilweise bestanden');

    await page.getByRole('button', { name: 'Abgeholt', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Als abgeholt eintragen' }).click();
    await expect(page.locator('body')).toContainText(/abgeholt \d+\./);

    await page.goto(`/admin/catalogue/exams/${pastId}/letters?kind=participation`);
    await expect(page.locator('article').first()).toContainText('an der Prüfung telc Deutsch B2 teilgenommen hat (schriftlicher und mündlicher Teil)');
    await page.getByRole('button', { name: 'Als gesendet speichern' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/catalogue/exams/${pastId}/letters/print\\?ids=`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('1 Brief gespeichert');
    const { rows } = await client.query<{ kind: string }>(`SELECT kind FROM letters WHERE booking_id = $1`, [pastBookingId]);
    expect(rows).toEqual([{ kind: 'exam_participation' }]);
  });
});
