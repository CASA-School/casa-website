import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * A booking's and the waiting list's letters (2026-10-16, migration 0032). The confirmation is
 * written from the booking — what is open, by when — and kept as it went out; the booking lists it.
 * The "place is free" letter does what it says: the learner's place is held for them.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything is deleted after.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('letters', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');
  test.describe.configure({ mode: 'serial' });

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let instanceId = '';
  let personId = '';
  let bookingId = '';
  let entryId = '';
  let registrationId = '';

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:letters')`,
      [rows[0].id, tokenHash]
    );
    instanceId = (
      await client.query<{ id: string }>(
        `INSERT INTO course_instances (course_type_id, start_date, end_date, capacity, schedule, status, title)
         SELECT id, current_date + 60, current_date + 115, 15, '{"days":["Mon","Tue","Wed","Thu","Fri"],"time":"09:00-12:30"}', 'scheduled', 'E2E Briefe'
           FROM course_types WHERE slug = 'intensive-german' RETURNING id`
      )
    ).rows[0].id;
    personId = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, salutation, birth_date, created_by) VALUES ('Lea', 'Brieftest', 'ms', '1999-05-02', 'e2e') RETURNING id`)).rows[0].id;
    await client.query(`INSERT INTO emails (person_id, address, normalized, kind, is_primary) VALUES ($1, 'lea@example.com', 'lea@example.com', 'personal', true)`, [personId]);
    await client.query(`INSERT INTO addresses (person_id, kind, street, postcode, city, country_code) VALUES ($1, 'home', 'Hauptstraße 1', '10115', 'Berlin', 'DE')`, [personId]);
    bookingId = (await client.query<{ id: string }>(`INSERT INTO bookings (person_id, status, course_type_id) VALUES ($1, 'confirmed', '10000000-0000-4000-8000-000000000001') RETURNING id`, [personId])).rows[0].id;
    await client.query(
      `INSERT INTO booking_periods (booking_id, course_instance_id, start_date, end_date, level_code) SELECT $1, id, start_date, end_date, 'B1.1' FROM course_instances WHERE id = $2`,
      [bookingId, instanceId]
    );
    await client.query(`INSERT INTO booking_charges (booking_id, kind, description, amount) VALUES ($1, 'tuition', 'Kurspreis 8 Wochen', 940)`, [bookingId]);
    await client.query(`INSERT INTO payments (booking_id, amount, method, subject) VALUES ($1, 200, 'transfer', 'Anzahlung')`, [bookingId]);
    entryId = (
      await client.query<{ id: string }>(
        `INSERT INTO waitlist_entries (person_id, course_instance_id, level_code, rank, source) VALUES ($1, $2, 'B2.1', extract(epoch FROM now()), 'office') RETURNING id`,
        [personId, instanceId]
      )
    ).rows[0].id;
    registrationId = (
      await client.query<{ id: string }>(
        `INSERT INTO course_registrations (request_id, course_type_id, course_instance_id, salutation, first_name, last_name, email, phone, nationality_raw, birth_date_raw, visa_required, locale)
         SELECT gen_random_uuid(), course_type_id, id, 'mr', 'Omar', 'Anmeldetest', 'omar@example.com', '+20 100', 'Ägypten', '1998-01-01', true, 'de'
           FROM course_instances WHERE id = $1 RETURNING id`,
        [instanceId]
      )
    ).rows[0].id;
  });

  test.afterAll(async () => {
    if (!client) return;
    await client.query(`DELETE FROM letters WHERE booking_id = $1 OR waitlist_entry_id = $2 OR person_id = $3 OR registration_id = $4`, [
      bookingId || null,
      entryId || null,
      personId || null,
      registrationId || null,
    ]);
    await client.query(`DELETE FROM staff_activity WHERE entity_id = ANY($1::uuid[])`, [[personId, bookingId, instanceId, registrationId].filter(Boolean)]);
    if (registrationId) await client.query(`DELETE FROM course_registrations WHERE id = $1`, [registrationId]);
    if (instanceId) await client.query(`DELETE FROM waitlist_entries WHERE course_instance_id = $1`, [instanceId]);
    if (bookingId) {
      await client.query(`DELETE FROM payments WHERE booking_id = $1`, [bookingId]);
      await client.query(`DELETE FROM bookings WHERE id = $1`, [bookingId]);
    }
    if (instanceId) await client.query(`DELETE FROM course_instances WHERE id = $1`, [instanceId]);
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

  test('a booking confirmation, written from the booking and kept as sent', async ({ page }) => {
    await page.goto(`/admin/bookings/${bookingId}/letter`);
    const sheet = page.locator('article').first();
    await expect(sheet).toContainText(/Bestätigung der Buchung Nr\. B-\d{4}-\d{4}/);
    await expect(sheet).toContainText(/Verwendungszweck: B-\d{4}-\d{4}, Lea Brieftest/);
    await expect(sheet).toContainText('Liebe Lea,');
    await expect(sheet).toContainText('Hauptstraße 1');
    await expect(sheet).toContainText(/Bitte überweise den offenen Betrag von 740,00\s€/);
    await page.getByRole('button', { name: 'Als gesendet speichern' }).click();

    await expect(page).toHaveURL(/\/admin\/letters\/mail\?ids=[0-9a-f-]{36}&saved=1$/);
    await expect(page.getByRole('status')).toContainText('Gespeichert');
    // The mail screen: both ways out, and the letter as a PDF printed by the server's browser (0085).
    await expect(page.getByRole('button', { name: 'Im Mailprogramm öffnen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Direkt senden' })).toBeVisible();
    const letterId = new URL(page.url()).searchParams.get('ids')!;
    const pdf = await page.request.get(`/admin/letters/${letterId}/pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toBe('application/pdf');
    expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
    const { rows } = await client.query<{ kind: string; version: number }>(`SELECT kind, version FROM letters WHERE booking_id = $1`, [bookingId]);
    expect(rows).toEqual([{ kind: 'booking_confirmation', version: 1 }]);

    await page.goto(`/admin/bookings/${bookingId}`);
    const letters = page.getByRole('heading', { name: 'Briefe' }).locator('xpath=ancestor::section[1]');
    await expect(letters).toContainText('Buchungsbestätigung');
  });

  test('the letter for the embassy waits for full payment; a reminder goes out', async ({ page }) => {
    await page.goto(`/admin/bookings/${bookingId}/letter?kind=visa`);
    await expect(page.getByRole('status')).toContainText('Erst nach vollständiger Zahlung');
    await expect(page.getByRole('button', { name: 'Als gesendet speichern' })).toBeDisabled();

    await page.getByRole('link', { name: 'Zahlungserinnerung' }).click();
    await expect(page.locator('article').first()).toContainText(/Für deine Buchung ist noch ein Betrag von 740,00\s€ offen/);
    await page.getByRole('button', { name: 'Als gesendet speichern' }).click();
    await expect(page).toHaveURL(/\/admin\/letters\/mail\?ids=[0-9a-f-]{36}&saved=1$/);
    const { rows } = await client.query<{ kind: string }>(`SELECT kind FROM letters WHERE booking_id = $1 ORDER BY sent_at`, [bookingId]);
    expect(rows.map((r) => r.kind)).toEqual(['booking_confirmation', 'payment_reminder']);
  });

  test('"a place is free" holds the place for the learner', async ({ page }) => {
    await page.goto(`/admin/catalogue/waitlist/${entryId}/letter?kind=place_free`);
    await expect(page.locator('article').first()).toContainText('ein Platz ist frei');
    await page.getByRole('button', { name: 'Als gesendet speichern' }).click();
    await expect(page).toHaveURL(/\/admin\/letters\/mail\?ids=[0-9a-f-]{36}&saved=1$/);
    const { rows } = await client.query<{ status: string }>(`SELECT status FROM waitlist_entries WHERE id = $1`, [entryId]);
    expect(rows[0].status).toBe('offered');

    await page.goto(`/admin/people/${personId}?tab=letters`);
    await expect(page.getByRole('tabpanel')).toContainText('Platz frei');
    await expect(page.getByRole('tabpanel')).toContainText('Buchungsbestätigung');
  });

  test('one confirmation for several bookings is kept on the learner', async ({ page }) => {
    await page.goto(`/admin/people/${personId}/letter`);
    const sheet = page.locator('article').first();
    await expect(sheet).toContainText(/Buchung Nr\. B-\d{4}-\d{4}/);
    await expect(sheet).toContainText(/Noch offen\s*740,00\s€/);
    await page.getByRole('button', { name: 'Als gesendet speichern' }).click();
    await expect(page).toHaveURL(/\/admin\/letters\/mail\?ids=[0-9a-f-]{36}&saved=1$/);
    const { rows } = await client.query<{ booking_id: string | null }>(`SELECT booking_id FROM letters WHERE person_id = $1 AND kind = 'learner_confirmation'`, [personId]);
    expect(rows).toEqual([{ booking_id: null }]);
  });

  test('a registration letter asks for the down payment, and the registration waits for it', async ({ page }) => {
    await page.goto(`/admin/registrations/course/${registrationId}/letter`);
    const sheet = page.locator('article').first();
    await expect(sheet).toContainText('Lieber Omar,');
    await expect(sheet).toContainText(/Anzahlung von \d+,00\s€/);
    await page.getByRole('button', { name: 'Als gesendet speichern' }).click();
    await expect(page).toHaveURL(/\/admin\/letters\/mail\?ids=[0-9a-f-]{36}&saved=1$/);
    const { rows } = await client.query<{ kind: string; status: string }>(
      `SELECT l.kind, r.status::text AS status FROM letters l JOIN course_registrations r ON r.id = l.registration_id WHERE r.id = $1`,
      [registrationId]
    );
    // A letter sent is work begun: „In Arbeit" (three states since 2026-10-21).
    expect(rows).toEqual([{ kind: 'registration_deposit_request', status: 'in_progress' }]);

    await page.goto(`/admin/registrations/course/${registrationId}`);
    await expect(page.getByRole('heading', { name: 'Briefe' }).locator('xpath=ancestor::section[1]')).toContainText('Bitte um Anzahlung');
  });
});
