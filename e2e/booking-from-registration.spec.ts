import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * A registration carried into its booking, and the booking kept right afterwards (2026-10-17 audit):
 * „A2 komplett" with a host family opens the wizard at the whole A2 with „bei Deutschen"; the stay
 * runs from the day before the course to the Saturday after (eight weeks of rent for eight weeks); the
 * course line says „A2.1–A2.2" in German; a payment starts empty with the open amount one click away;
 * the stay can be changed on the booking, its rent priced again, and the course type no longer can.
 *
 * Uses an intensive start of eight calendar weeks from the database. Runs only with a database and an
 * owner account, in German (pinned). Everything it makes is deleted afterwards.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('a booking from a registration', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let personId = '';
  let registrationId = '';

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    const { rows: starts } = await client.query<{ id: string; course_type_id: string }>(
      `SELECT i.id, i.course_type_id FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
        WHERE t.format = 'intensive' AND i.status <> 'cancelled' AND i.start_date > current_date
          AND i.end_date - i.start_date BETWEEN 52 AND 53
        ORDER BY i.start_date LIMIT 1`
    );
    test.skip(starts.length === 0, 'no intensive start of eight weeks ahead');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:booking-from-registration')`,
      [rows[0].id, tokenHash]
    );
    personId = (await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Rita', 'Registrierungstest', 'e2e') RETURNING id`)).rows[0].id;
    registrationId = (
      await client.query<{ id: string }>(
        `INSERT INTO course_registrations (request_id, course_type_id, course_instance_id, course_type_label, salutation, first_name, last_name, email, phone,
           nationality_raw, birth_date_raw, declared_level_raw, declared_level_code, accommodation_required, accommodation_type, locale, person_id)
         VALUES ($1, $2, $3, 'Intensivkurse', 'ms', 'Rita', 'Registrierungstest', 'rita.registrierungstest@example.org', '+49 421 000',
           'Brasilien', '01.02.1999', 'A2 komplett (A2.1 + A2.2) · 8 Wochen', 'A2.1', true, 'host', 'de', $4) RETURNING id`,
        [randomUUID(), starts[0].course_type_id, starts[0].id, personId]
      )
    ).rows[0].id;
  });

  test.afterAll(async () => {
    if (!client) return;
    if (personId) {
      const bookings = (await client.query<{ id: string }>(`SELECT id FROM bookings WHERE person_id = $1`, [personId])).rows.map((r) => r.id);
      await client.query(`DELETE FROM staff_activity WHERE entity_id = ANY($1::uuid[])`, [[personId, registrationId, ...bookings].filter(Boolean)]);
      // Payments hold their booking (ON DELETE RESTRICT: money is never deleted by a cascade).
      await client.query(`DELETE FROM payments WHERE booking_id = ANY($1::uuid[])`, [bookings]);
      await client.query(`DELETE FROM bookings WHERE id = ANY($1::uuid[])`, [bookings]);
      if (registrationId) await client.query(`DELETE FROM course_registrations WHERE id = $1`, [registrationId]);
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

  test('the wish opens the wizard, the stay is eight weeks, and the booking can be paid and changed', async ({ page }) => {
    await page.goto(`/admin/registrations/course/${registrationId}`);
    await expect(page.locator('main')).toContainText('A2 komplett (A2.1 + A2.2) · 8 Wochen');

    const dialog = page.getByRole('dialog');
    await page.getByRole('button', { name: 'Buchung anlegen' }).click();
    // The level and how much of it, as they asked.
    await expect(dialog.getByRole('button', { name: /^A2\.1/ })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /^Das ganze A2/ })).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: 'Nein', exact: true }).click();
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    // The host family, from the day before the course.
    await expect(dialog.getByRole('button', { name: 'Ja', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.getByRole('button', { name: /^bei Deutschen/ })).toHaveAttribute('aria-pressed', 'true');
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await expect(dialog).toContainText('Das ganze A2 (A2.1–A2.2)');
    // A first registration: the enrolment fee is due.
    await expect(dialog.getByRole('checkbox', { name: 'Einschreibegebühr berechnen' })).toBeChecked();
    await dialog.getByRole('button', { name: /^(Buchung anlegen|Trotzdem buchen)$/ }).first().click();
    await expect(page).toHaveURL(/\/admin\/bookings\/[0-9a-f-]{36}$/);
    const bookingId = page.url().split('/').pop()!;

    const { rows: lines } = await client.query<{ kind: string; description: string }>(
      `SELECT kind::text AS kind, description FROM booking_charges WHERE booking_id = $1 ORDER BY created_at`,
      [bookingId]
    );
    expect(lines.find((l) => l.kind === 'enrolment_fee')?.description).toBe('Einschreibegebühr');
    expect(lines.find((l) => l.kind === 'tuition')?.description).toMatch(/^Intensivkurs A2\.1–A2\.2 · /);
    expect(lines.find((l) => l.kind === 'accommodation')?.description).toMatch(/^bei Deutschen · .* · 8 Wochen$/);
    const { rows: stay } = await client.query<{ before: number; saturday: number }>(
      `SELECT (SELECT min(start_date) FROM booking_periods WHERE booking_id = b.id) - b.accommodation_from AS before,
              extract(isodow FROM b.accommodation_to)::int AS saturday
         FROM bookings b WHERE b.id = $1`,
      [bookingId]
    );
    expect(stay[0]).toEqual({ before: 1, saturday: 6 });
    await expect(page.locator('main')).toContainText('A2.1–A2.2');
    await expect(page.locator('[data-light]').first()).toContainText('Offen');

    // A payment starts empty; the open amount is one click away.
    await page.getByRole('button', { name: 'Zahlung erfassen' }).first().click();
    await expect(dialog.getByRole('textbox', { name: 'Betrag' })).toHaveValue('');
    await dialog.getByRole('button', { name: /^Offen: / }).click();
    await expect(dialog.getByRole('textbox', { name: 'Betrag' })).not.toHaveValue('');
    await dialog.getByRole('textbox', { name: 'Betrag' }).fill('200');
    await dialog.getByRole('radio', { name: 'Anzahlung' }).check();
    await dialog.getByRole('button', { name: 'Zahlung erfassen' }).click();
    await expect(page.locator('[data-light]').first()).toContainText('Anzahlung erhalten');

    // The stay changed on the booking, its rent priced again; the course type stays the start's.
    await page.getByRole('button', { name: 'Bearbeiten' }).click();
    await expect(dialog.getByRole('combobox', { name: 'Kursart' })).toBeDisabled();
    await dialog.getByRole('combobox', { name: 'Unterkunft' }).selectOption('casa_flat');
    await dialog.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.locator('main')).toContainText(/CASA – WG · .* · 8 Wochen/);
    const { rows: rent } = await client.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM booking_charges WHERE booking_id = $1 AND charge_type_code = 'accommodation_rent'`,
      [bookingId]
    );
    expect(rent[0].n).toBe(1);

    // Who needs a room, by arrival.
    await page.goto('/admin/bookings?filter=accommodation');
    await expect(page.getByRole('row').filter({ hasText: 'Rita Registrierungstest' })).toContainText('CASA – WG');
  });
});
