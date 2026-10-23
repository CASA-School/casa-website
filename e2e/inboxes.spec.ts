import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * Registrations and applications are the same inbox as enquiries (2026-10-15,
 * `InboxScreen` and the record parts): a record sent today sits under „Heute",
 * „Erledigt" closes it where it is, and its page carries the status bar and the
 * timeline. Enquiries have their own spec (enquiries.spec.ts).
 *
 * Runs only with a database and an owner account, in German (pinned). The
 * records it writes are deleted afterwards with their activity and notes.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('inboxes', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  const ids = { course: '', exam: '', application: '' };

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
       VALUES ($1, $2, now() + interval '10 minutes', 'e2e:inboxes')`,
      [rows[0].id, tokenHash]
    );
    ids.course = (
      await client.query<{ id: string }>(
        `INSERT INTO course_registrations (request_id, course_type_label, salutation, first_name, last_name, email, phone, nationality_raw, birth_date_raw, accommodation_required, accommodation_type, locale, source)
         VALUES ($1, 'Intensivkurse', 'ms', 'Kira', 'Prüfkurs', 'kira.pruefkurs@example.com', '+49 151 0000000', 'Deutschland', '2000-01-01', true, 'host', 'de', 'e2e')
         RETURNING id`,
        [randomUUID()]
      )
    ).rows[0].id;
    ids.exam = (
      await client.query<{ id: string }>(
        `INSERT INTO exam_registrations (request_id, exam_type_label, registration_type, salutation, first_name, last_name, email, phone, nationality_raw, birth_date_raw, locale, source)
         VALUES ($1, 'telc Deutsch B2', 'oral', 'mr', 'Emil', 'Prüfexam', 'emil.pruefexam@example.com', '+49 151 0000001', 'Deutschland', '1999-01-01', 'de', 'e2e')
         RETURNING id`,
        [randomUUID()]
      )
    ).rows[0].id;
    ids.application = (
      await client.query<{ id: string }>(
        `INSERT INTO career_applications (position_slug, position_title, locale, first_name, last_name, email, cover_letter, cv_file_name, cv_file_size, source)
         VALUES ('daf-lehrkraft', 'Lehrkraft für Deutsch als Fremdsprache', 'en', 'Ava', 'Prüfbewerbung', 'ava.pruefbewerbung@example.com', 'I would love to teach at CASA.', 'cv.pdf', 1000, 'e2e')
         RETURNING id`
      )
    ).rows[0].id;
  });

  test.afterAll(async () => {
    if (!client) return;
    const all = Object.values(ids).filter(Boolean);
    if (all.length) {
      await client.query(`DELETE FROM staff_notes WHERE entity_id = ANY($1::uuid[])`, [all]);
      await client.query(`DELETE FROM staff_activity WHERE entity_id = ANY($1::uuid[])`, [all]);
    }
    if (ids.course) await client.query(`DELETE FROM course_registrations WHERE id = $1`, [ids.course]);
    if (ids.exam) await client.query(`DELETE FROM exam_registrations WHERE id = $1`, [ids.exam]);
    if (ids.application) await client.query(`DELETE FROM career_applications WHERE id = $1`, [ids.application]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  for (const queue of [
    { name: 'Kira Prüfkurs', list: '/admin/registrations/course', mark: 'Unterkunft nötig', record: () => `/admin/registrations/course/${ids.course}` },
    { name: 'Emil Prüfexam', list: '/admin/registrations/exam', mark: 'Nur mündlicher Teil', record: () => `/admin/registrations/exam/${ids.exam}` },
    { name: 'Ava Prüfbewerbung', list: '/admin/applications', mark: 'Lehrkraft für Deutsch als Fremdsprache', record: () => `/admin/applications/${ids.application}` },
  ]) {
    test(`${queue.list}: under Heute, closed in place, and its page is the shared record`, async ({ page }) => {
      await page.goto(queue.list);
      const today = page.locator('section', { has: page.getByRole('heading', { name: 'Heute' }) });
      const row = today.getByRole('listitem').filter({ hasText: queue.name });
      await expect(row).toContainText(queue.mark);

      await row.getByRole('button', { name: 'Erledigt' }).click();
      await expect(row.getByRole('button', { name: 'Wieder öffnen' })).toBeVisible();
      await row.getByRole('button', { name: 'Wieder öffnen' }).click();
      await expect(row).toContainText('In Arbeit');

      await page.goto(queue.record());
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(queue.name);
      // Three states (2026-10-21): Offen, In Arbeit, Erledigt.
      await page.getByRole('button', { name: 'Offen' }).click();
      await expect(page.getByRole('button', { name: 'Offen' })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('link', { name: 'Antworten' })).toHaveAttribute('href', /^\/admin\/mail\?to=/);
      await expect(page.getByRole('heading', { name: 'Notizen und Verlauf' })).toBeVisible();
    });
  }
});
