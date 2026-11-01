import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import pg from 'pg';

// This scenario creates synthetic records; it must never run against CASA's database.
const disposable = process.env.CASA_E2E_DISPOSABLE_DB === '1' && /^postgres(?:ql)?:\/\/(?:[^@/]+@)?(?:127\.0\.0\.1|localhost):/.test(process.env.DATABASE_URL ?? '');
test('a mail not confirmed as sent is followed up on Settings → Technik', async ({ page, context }) => {
  test.skip(!disposable, 'requires an explicitly marked disposable local database');
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const owner = (await db.query(`INSERT INTO staff_users (email, name, role, password_hash) VALUES ($1, 'Test owner', 'owner', 'disabled') RETURNING id`, [`test-${randomUUID()}@example.invalid`])).rows[0].id;
  await db.query(`INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '15 minutes')`, [owner, tokenHash]);
  const person = (await db.query(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Test', 'Delivery', 'e2e') RETURNING id`)).rows[0].id;
  const line = (await db.query(`INSERT INTO course_registrations (request_id, course_type_label, salutation, first_name, last_name, email, phone, nationality_raw, birth_date_raw, locale, person_id)
    VALUES ($1, 'Intensivkurs', 'ms', 'Test', 'Delivery', 'delivery@example.invalid', '123456', 'Germany', '1990-01-01', 'de', $2) RETURNING id, registration_id`, [randomUUID(), person])).rows[0];
  await db.query(`INSERT INTO record_flags (entity, entity_id, code) VALUES ('course_registration', $1, 'registration_staff_notice_unconfirmed'), ('course_registration', $1, 'registration_receipt_unconfirmed')`, [line.id]);
  await context.addCookies([{ name: 'casa_workspace_session', value: token, domain: '127.0.0.1', path: '/' }]);
  // A technical log on Settings → Technik (2026-11-01), never on the registration itself.
  await page.goto(`/admin/registrations/${line.registration_id}`);
  await expect(page.getByText('Eingangsbestätigung')).toHaveCount(0);
  await page.goto('/admin/settings/system');
  const rows = page.locator('li').filter({ hasText: 'Test Delivery' });
  await expect(rows).toHaveCount(2);
  await rows.filter({ hasText: 'Benachrichtigung ans Team' }).getByRole('button', { name: 'Geprüft' }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('Eingangsbestätigung');
  const flags = await db.query(`SELECT code, resolved_by FROM record_flags WHERE entity_id = $1 AND resolved_at IS NOT NULL`, [line.id]);
  expect(flags.rows).toEqual([{ code: 'registration_staff_notice_unconfirmed', resolved_by: owner }]);
  await db.end();
});
