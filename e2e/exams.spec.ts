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
  let bookingId = '';

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
  });

  test.afterAll(async () => {
    if (!client) return;
    const people = [anaId, benId].filter(Boolean);
    await client.query(`DELETE FROM letters WHERE person_id = ANY($1::uuid[])`, [people]);
    await client.query(`DELETE FROM staff_activity WHERE entity_id = ANY($1::uuid[]) OR entity_id IN (SELECT id FROM bookings WHERE person_id = ANY($1::uuid[]))`, [
      [...people, sittingId].filter(Boolean),
    ]);
    if (sittingId) await client.query(`DELETE FROM waitlist_entries WHERE exam_session_id = $1`, [sittingId]);
    await client.query(`DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE person_id = ANY($1::uuid[]))`, [people]);
    await client.query(`DELETE FROM bookings WHERE person_id = ANY($1::uuid[])`, [people]);
    if (sittingId) await client.query(`DELETE FROM exam_sessions WHERE id = $1`, [sittingId]);
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

    await page.getByRole('button', { name: 'Plätze ändern' }).click();
    await page.getByRole('spinbutton', { name: 'Plätze' }).fill('2');
    await page.getByRole('button', { name: 'Speichern' }).click();
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
    await expect(page).toHaveURL(/\/admin\/letters\/[0-9a-f-]{36}\?sent=1$/);
    const { rows } = await client.query<{ kind: string }>(`SELECT kind FROM letters WHERE booking_id = $1`, [bookingId]);
    expect(rows).toEqual([{ kind: 'exam_confirmation' }]);
  });
});
