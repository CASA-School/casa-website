import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * A booking's colour (2026-10-16, docs/schoolman/bookings.md): grey („Offen", „Anzahlung erhalten") until paid in full,
 * yellow while a colleague has it under observation — chosen from the colour itself, on the booking's
 * page or the learner's, from SchoolMan's three: in order, under observation, cancelled (2026-10-18) —
 * and green once the money is in. Cancelling from the colour asks once more.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything it makes is
 * deleted afterwards.
 */
const DATABASE_URL = process.env.DATABASE_URL;

test.describe('booking colours', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let personId = '';
  let bookingId = '';

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
       VALUES ($1, $2, now() + interval '10 minutes', 'e2e:bookings')`,
      [rows[0].id, tokenHash]
    );
    personId = (
      await client.query<{ id: string }>(`INSERT INTO people (first_name, last_name, created_by) VALUES ('Bea', 'Buchungstest', 'e2e') RETURNING id`)
    ).rows[0].id;
    bookingId = (
      await client.query<{ id: string }>(`INSERT INTO bookings (person_id, status) VALUES ($1, 'confirmed') RETURNING id`, [personId])
    ).rows[0].id;
    await client.query(
      `INSERT INTO booking_periods (booking_id, start_date, end_date) VALUES ($1, current_date - 7, current_date + 40)`,
      [bookingId]
    );
    await client.query(
      `INSERT INTO booking_charges (booking_id, kind, description, amount) VALUES ($1, 'tuition', 'Kurspreis 8 Wochen', 940)`,
      [bookingId]
    );
  });

  test.afterAll(async () => {
    if (!client) return;
    if (bookingId) {
      await client.query(`DELETE FROM staff_activity WHERE entity = 'booking' AND entity_id = $1`, [bookingId]);
      // Payments hold their booking (ON DELETE RESTRICT: money is never deleted by a cascade).
      await client.query(`DELETE FROM payments WHERE booking_id = $1`, [bookingId]);
      await client.query(`DELETE FROM bookings WHERE id = $1`, [bookingId]);
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

  test('booking editing opens at the side, keeps its actions visible on a phone, and saves', async ({ page }) => {
    await page.goto(`/admin/bookings/${bookingId}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Buchung bearbeiten', exact: true });
    await expect(editor).toBeVisible();
    const desktop = await editor.boundingBox();
    expect(desktop!.x).toBeGreaterThan(page.viewportSize()!.width / 2);
    expect(desktop!.width).toBeLessThanOrEqual(560);
    const desktopSave = await editor.getByRole('button', { name: 'Speichern', exact: true }).boundingBox();
    expect(desktopSave!.y + desktopSave!.height).toBeGreaterThan(page.viewportSize()!.height - 40);
    await page.screenshot({ path: 'output/mockups/workspace-pilot/booking-sidebar-desktop.png', animations: 'disabled' });
    await editor.getByLabel('Notizen', { exact: true }).fill('Discard this draft');
    await editor.getByRole('button', { name: 'Abbrechen', exact: true }).click();
    await expect(editor).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Bearbeiten', exact: true })).toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click();
    await expect(editor.getByLabel('Notizen', { exact: true })).toHaveValue('');
    expect(await editor.evaluate(element => element.scrollWidth <= innerWidth)).toBe(true);
    const save = editor.getByRole('button', { name: 'Speichern', exact: true });
    const footer = await save.boundingBox();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(844);
    expect(footer!.y + footer!.height).toBeGreaterThan(804);
    await page.screenshot({ path: 'output/mockups/workspace-pilot/booking-sidebar-mobile.png', animations: 'disabled' });
    await editor.getByLabel('Notizen', { exact: true }).fill('Sidebar save verified');
    await editor.getByRole('checkbox', { name: 'Visum nötig', exact: true }).check();
    await save.click();
    await expect(editor).not.toBeVisible();
    await expect.poll(async () => (await client.query(`SELECT notes, visa_required FROM bookings WHERE id = $1`, [bookingId])).rows[0]).toEqual({ notes: 'Sidebar save verified', visa_required: true });
    await expect.poll(async () => Number((await client.query(`SELECT count(*) AS n FROM staff_activity WHERE entity_id = $1 AND action = 'booking_updated'`, [bookingId])).rows[0].n)).toBeGreaterThan(0);
  });

  test('the account-row editor uses the side panel and restores row focus', async ({ page }) => {
    await page.goto('/admin/team', { waitUntil: 'networkidle' });
    const ownRow = page.getByRole('row').filter({ hasText: '(du)' });
    const trigger = ownRow.getByRole('button', { name: /öffnen$/ });
    await trigger.click();
    const editor = page.getByRole('dialog');
    await expect(editor).toBeVisible();
    await expect.poll(async () => { const box = await editor.boundingBox(); return Math.round(box!.x + box!.width); }).toBe(page.viewportSize()!.width - 8);
    await editor.getByRole('tab', { name: 'Angaben', exact: true }).click();
    await expect(editor.getByRole('textbox', { name: 'Name', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(editor).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await trigger.click();
    expect(await editor.evaluate(element => element.scrollWidth <= innerWidth)).toBe(true);
    expect(await editor.evaluate(element => getComputedStyle(element).animationName)).toBe('none');
    await editor.getByRole('button', { name: 'Schließen', exact: true }).click();
  });

  test('the books: red until handed out at the desk, green after, and back', async ({ page }) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO booking_charges (booking_id, kind, description, amount) VALUES ($1, 'books', 'Bücher · Netzwerk neu A2.1', 26.99) RETURNING id`,
      [bookingId]
    );
    await page.goto(`/admin/bookings/${bookingId}`);
    await page.getByRole('button', { name: 'Bücher · Netzwerk neu A2.1: nicht ausgegeben' }).click();
    await expect(page.getByRole('button', { name: 'Bücher · Netzwerk neu A2.1: ausgegeben' })).toBeVisible();
    await expect.poll(async () => (await client.query<{ handed_out: boolean }>(`SELECT handed_out FROM booking_charges WHERE id = $1`, [rows[0].id])).rows[0].handed_out).toBe(true);
    await page.reload();
    await page.getByRole('button', { name: 'Bücher · Netzwerk neu A2.1: ausgegeben' }).click();
    await expect.poll(async () => (await client.query<{ handed_out: boolean }>(`SELECT handed_out FROM booking_charges WHERE id = $1`, [rows[0].id])).rows[0].handed_out).toBe(false);
    await client.query(`DELETE FROM booking_charges WHERE id = $1`, [rows[0].id]);
  });

  test('a cost line from the price list: one click fills the words and the price', async ({ page }) => {
    await page.goto(`/admin/bookings/${bookingId}`);
    await page.getByRole('button', { name: 'Posten hinzufügen' }).click();
    const dialog = page.getByRole('dialog');
    // Books are offered first, each with its price; a click fills the line.
    const book = dialog.getByRole('button', { name: /^Bücher · / }).first();
    const words = ((await book.locator('span').first().textContent()) ?? '').trim();
    await book.click();
    await expect(dialog.getByRole('textbox', { name: 'Beschreibung' })).toHaveValue(words);
    await expect(dialog.getByRole('textbox', { name: 'Betrag' })).not.toHaveValue('');
    await dialog.getByRole('button', { name: 'Posten hinzufügen' }).click();
    await expect(page.getByRole('button', { name: `${words}: nicht ausgegeben` })).toBeVisible();
    const { rows } = await client.query<{ kind: string; rate: boolean }>(
      `SELECT kind, rate_id IS NOT NULL AS rate FROM booking_charges WHERE booking_id = $1 AND description = $2`,
      [bookingId, words]
    );
    expect(rows).toEqual([{ kind: 'books', rate: true }]);
    await client.query(`DELETE FROM booking_charges WHERE booking_id = $1 AND description = $2`, [bookingId, words]);
  });

  test('grey until paid, yellow under observation, green when all is in, red when cancelled', async ({ page }) => {
    const light = page.locator('[data-light]').first();

    await page.goto(`/admin/bookings/${bookingId}`);
    await expect(light).toHaveAttribute('data-light', 'unclear');
    // The grey says what it is (2026-10-17): nothing has come in yet.
    await expect(light).toContainText('Offen');

    // Yellow, chosen from the colour — one choice, as in SchoolMan — in the head, on the list's dot and in the history.
    await page.getByRole('button', { name: /^Farbe: Offen/ }).click();
    await page.getByRole('dialog', { name: 'Farbe der Buchung' }).getByRole('button', { name: 'Unter Beobachtung' }).click();
    await expect(light).toHaveAttribute('data-light', 'watch');
    // The history is on its own tab (2026-10-23); the account stays the first.
    await page.getByRole('tab', { name: /^Notizen und Verlauf/ }).click();
    await expect(page.getByText('hat die Buchung unter Beobachtung gestellt')).toBeVisible();
    await page.getByRole('tab', { name: /^Übersicht/ }).click();

    // Found by its number, which stands beside the course.
    const number = (await client.query<{ number: string }>(`SELECT number FROM bookings WHERE id = $1`, [bookingId])).rows[0].number;
    expect(number).toMatch(/^B-\d{4}-\d{4}$/);
    await expect(page.getByText(number)).toBeVisible();
    await page.goto(`/admin/bookings?filter=all&q=${encodeURIComponent(number)}`);
    await expect(page.getByRole('row').filter({ hasText: 'Bea Buchungstest' })).toBeVisible();

    // In the list, the colour before the name, its word on hover.
    await expect(page.getByRole('row').filter({ hasText: 'Bea Buchungstest' }).getByRole('img', { name: 'Unter Beobachtung' })).toBeVisible();

    // On the learner's page the dot changes it too: back to in order, which is grey while nothing is paid.
    await page.goto(`/admin/people/${personId}`);
    await page.getByRole('button', { name: /^Farbe: Unter Beobachtung/ }).first().click();
    const colours = page.getByRole('dialog', { name: 'Farbe der Buchung' });
    await expect(colours.getByRole('button')).toHaveText(['In Ordnung', 'Unter Beobachtung', 'Storniert']);
    await colours.getByRole('button', { name: 'In Ordnung' }).click();
    await expect(page.getByRole('button', { name: /^Farbe: Offen/ }).first()).toBeVisible();

    // Ended: the colour is the money's again.
    await page.goto(`/admin/bookings/${bookingId}`);
    await expect(light).toHaveAttribute('data-light', 'unclear');

    // Paid in full: green, with nobody changing a status.
    await client.query(
      `INSERT INTO payments (booking_id, amount, method, subject) VALUES ($1, 940, 'transfer', 'Kurspreis')`,
      [bookingId]
    );
    await page.reload();
    await expect(light).toHaveAttribute('data-light', 'ok');
    await expect(light).toContainText('In Ordnung');

    // Red from the colour cancels the booking, after asking once more; then the colour opens nothing.
    await page.getByRole('button', { name: /^Farbe: In Ordnung/ }).click();
    await colours.getByRole('button', { name: 'Storniert' }).click();
    await expect(colours.getByText('Buchung stornieren?')).toBeVisible();
    await colours.getByRole('button', { name: 'Stornieren' }).click();
    await expect(light).toHaveAttribute('data-light', 'no');
    await expect(page.getByRole('button', { name: /^Farbe:/ })).toHaveCount(0);
    const cancelled = await client.query<{ status: string }>(`SELECT status FROM bookings WHERE id = $1`, [bookingId]);
    expect(cancelled.rows[0].status).toBe('cancelled');
  });
});
