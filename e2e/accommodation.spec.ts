import { createHash, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';
import pg from 'pg';

/**
 * Accommodation (2026-10-18, migration 0060). A host family is created with its name and kind, the
 * rest revealed once both are in; a room and someone of the family are added on its page; it is found by
 * the family's name; a stay without a place is placed there from the stays list; and once nothing names
 * it, it is deleted after the confirmation, its room and family with it.
 *
 * Runs only with a database and an owner account, in German (pinned). Everything is put back after.
 */
const DATABASE_URL = process.env.DATABASE_URL;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
const NAME = 'Familie Unterkunftstest E2E';

test.describe('accommodation', () => {
  test.skip(!DATABASE_URL, 'needs DATABASE_URL and an owner account');
  test.describe.configure({ mode: 'serial' });

  let client: pg.Client;
  let token = '';
  let tokenHash = '';
  let placeId = '';
  let stay: { id: string; booking_id: string; accommodation_id: string | null; room_id: string | null } | undefined;

  test.beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(`SELECT id FROM staff_users WHERE role = 'owner' AND is_active ORDER BY created_at LIMIT 1`);
    test.skip(rows.length === 0, 'no owner account');
    token = randomBytes(32).toString('base64url');
    tokenHash = createHash('sha256').update(token).digest('hex');
    await client.query(
      `INSERT INTO staff_sessions (staff_user_id, token_hash, expires_at, user_agent) VALUES ($1, $2, now() + interval '15 minutes', 'e2e:accommodation')`,
      [rows[0].id, tokenHash]
    );
  });

  test.afterAll(async () => {
    if (!client) return;
    if (stay) await client.query(`UPDATE booking_stays SET accommodation_id = $2, room_id = $3 WHERE id = $1`, [stay.id, stay.accommodation_id, stay.room_id]);
    if (stay) await client.query(`DELETE FROM staff_activity WHERE entity = 'booking' AND entity_id = $1 AND action IN ('stay_placed', 'stay_unplaced')`, [stay.booking_id]);
    const ids = (await client.query<{ id: string }>(`SELECT id FROM accommodations WHERE name = $1`, [NAME])).rows.map((r) => r.id);
    if (placeId) ids.push(placeId);
    await client.query(`UPDATE booking_stays SET accommodation_id = NULL, room_id = NULL WHERE accommodation_id = ANY($1::uuid[])`, [ids]);
    await client.query(`DELETE FROM staff_activity WHERE entity = 'accommodation' AND entity_id = ANY($1::uuid[])`, [ids]);
    await client.query(`DELETE FROM accommodations WHERE id = ANY($1::uuid[])`, [ids]);
    if (tokenHash) await client.query(`DELETE FROM staff_sessions WHERE token_hash = $1`, [tokenHash]);
    await client.end();
  });

  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'casa_workspace_session', value: token, url: baseURL! },
      { name: 'casa_ws_lang', value: 'de', url: baseURL! },
    ]);
  });

  test('a host family is created with its name and kind, how to reach it revealed once both are in', async ({ page }) => {
    await page.goto('/admin/accommodation');
    await page.getByRole('button', { name: 'Neue Unterkunft', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name', { exact: true }).fill(NAME);
    await dialog.getByLabel('Telefon').fill('0421 123456');
    await dialog.getByLabel('Adresse').fill('Am Dobben 1\n28203 Bremen');
    await dialog.getByRole('button', { name: 'Anlegen' }).click();

    await expect(page).toHaveURL(/\/admin\/accommodation\/[0-9a-f-]{36}$/);
    placeId = UUID.exec(page.url())![0];
    await expect(page.getByRole('heading', { name: NAME })).toBeVisible();
    const { rows } = await client.query(`SELECT kind, phone, is_active FROM accommodations WHERE id = $1`, [placeId]);
    expect(rows).toEqual([{ kind: 'host_family', phone: '0421 123456', is_active: true }]);
  });

  test('a room and someone of the family are added on its page', async ({ page }) => {
    await page.goto(`/admin/accommodation/${placeId}`);
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('Vorname').fill('Erika');
    await dialog.getByLabel('Nachname').fill('Gastmutter');
    await dialog.getByLabel('In der Familie').selectOption({ label: 'Mutter' });
    await dialog.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await expect(page.getByText('Erika Gastmutter')).toBeVisible();

    await page.goto(`/admin/accommodation/${placeId}?tab=rooms`);
    await page.getByRole('button', { name: 'Zimmer hinzufügen' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name', { exact: true }).fill('Gästezimmer');
    await dialog.getByLabel('Zimmerart').selectOption({ label: 'Einzelzimmer' });
    await dialog.getByLabel('Betten').fill('1');
    await dialog.getByRole('button', { name: 'Zimmer hinzufügen' }).click();
    await expect(page.getByText('Gästezimmer')).toBeVisible();

    const { rows } = await client.query(
      `SELECT (SELECT count(*) FROM accommodation_members WHERE accommodation_id = $1 AND role = 'mother') AS members,
              (SELECT count(*) FROM accommodation_rooms WHERE accommodation_id = $1 AND room_type_code = 'single' AND beds = 1) AS rooms`,
      [placeId]
    );
    expect(rows[0]).toEqual({ members: '1', rooms: '1' });
  });

  test('it is found among the host families by the family’s name', async ({ page }) => {
    await page.goto('/admin/accommodation?view=host_family&q=Gastmutter');
    await expect(page.locator('main')).toContainText(NAME);
    await page.goto('/admin/accommodation?view=casa_flat&q=Gastmutter');
    await expect(page.locator('main')).not.toContainText(NAME);
  });

  test('a stay without a place is placed there from the stays list', async ({ page }) => {
    stay = (
      await client.query(
        `SELECT s.id, s.booking_id, s.accommodation_id, s.room_id FROM booking_stays s JOIN bookings b ON b.id = s.booking_id JOIN people p ON p.id = b.person_id
          WHERE s.accommodation_id IS NULL AND NOT s.cancelled AND s.ends_on >= current_date AND b.deleted_at IS NULL AND b.status <> 'cancelled' AND p.deleted_at IS NULL
          ORDER BY s.starts_on LIMIT 1`
      )
    ).rows[0];
    test.skip(!stay, 'no stay without a place');
    const { rows: who } = await client.query<{ number: string }>(`SELECT number FROM bookings WHERE id = $1`, [stay!.booking_id]);
    await page.goto(`/admin/accommodation/stays?view=unplaced&q=${encodeURIComponent(who[0].number)}`);
    await page.getByRole('button', { name: 'Unterkunft', exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Unterkunft').selectOption({ label: NAME });
    await dialog.getByLabel('Zimmer').selectOption({ label: 'Gästezimmer' });
    await dialog.getByRole('button', { name: 'Speichern' }).click();
    // Placed, it leaves the list of those without a place.
    await expect(page.locator('main')).toContainText('Nichts gefunden');

    const { rows } = await client.query(`SELECT accommodation_id = $2 AS placed, room_id IS NOT NULL AS has_room FROM booking_stays WHERE id = $1`, [stay!.id, placeId]);
    expect(rows[0]).toEqual({ placed: true, has_room: true });
    await page.goto(`/admin/accommodation/${placeId}?tab=stays`);
    await expect(page.locator('main')).toContainText(who[0].number);
    // Back as it was, so the place can be deleted below.
    await client.query(`UPDATE booking_stays SET accommodation_id = $2, room_id = $3 WHERE id = $1`, [stay!.id, stay!.accommodation_id, stay!.room_id]);
  });

  test('deleted after the confirmation, its room and family with it', async ({ page }) => {
    await page.goto(`/admin/accommodation/${placeId}`);
    await page.getByRole('button', { name: 'Löschen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();
    await expect(page).toHaveURL(/\/admin\/accommodation$/);
    const { rows } = await client.query(
      `SELECT (SELECT count(*) FROM accommodations WHERE id = $1) AS places, (SELECT count(*) FROM accommodation_rooms WHERE accommodation_id = $1) AS rooms,
              (SELECT count(*) FROM accommodation_members WHERE accommodation_id = $1) AS members`,
      [placeId]
    );
    expect(rows[0]).toEqual({ places: '0', rooms: '0', members: '0' });
  });
});
