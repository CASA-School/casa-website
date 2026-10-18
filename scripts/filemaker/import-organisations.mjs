/**
 * Puts the agencies and companies the learner sample depends on into `organisations` (2026-10-18,
 * docs/ADMIN_WORKSPACE.md §Organisations): with their contacts and an agency's commission terms, and
 * links the sample's bookings to who pays them and the company courses to their company.
 *
 *   python3 -I scripts/filemaker/read_organisations.py | DATABASE_URL=... node scripts/filemaker/import-organisations.mjs [--dry-run]
 *
 * Run after the learners (it links their bookings). One transaction; prints counts only.
 *
 * - An organisation is matched on its SchoolMan agency or company (`filemaker_links`, entity
 *   'organisation', 0057), else on the same name and kind made here (an offer's), else made. Its
 *   `Management` and `Institution` are linked too. What the workspace has wins: a field is only filled
 *   where it is empty.
 * - A contact is matched on its SchoolMan person; fields are filled where empty.
 * - A commission term keeps SchoolMan's number: updated, and dropped when SchoolMan dropped it.
 * - A sample booking that names an agency is paid by it, else one that names a company by that
 *   company (`payer_organisation_id`); a company course gets its company (`courses.organisation_id`);
 *   a letter that came across and names it, its organisation (`letters.organisation_id`).
 */
import { getCode } from 'country-list';

import { connect } from '../db/client.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const SALUTATION = { 1: 'mr', 2: 'ms' };
const LAYOUT = { agency: 'Agency', company: 'Corporate' };
const GERMAN = new Set(['DE', 'AT', 'CH', 'LI']);
const deNames = new Intl.DisplayNames(['de'], { type: 'region' });
const DE_INDEX = new Map(
  Array.from({ length: 26 * 26 }, (_, i) => String.fromCharCode(65 + Math.floor(i / 26), 65 + (i % 26)))
    .map((code) => [String(deNames.of(code) ?? '').toLowerCase(), code])
    .filter(([name, code]) => name && name.toLowerCase() !== code.toLowerCase())
);
const country = (name) => {
  if (!name) return null;
  const text = name.trim();
  if (/^[A-Za-z]{2}$/.test(text)) return text.toUpperCase();
  return DE_INDEX.get(text.toLowerCase()) ?? getCode(text) ?? null;
};

const parties = await readStdin();
const client = await connect();
const count = { read: parties.length, made: 0, known: 0, byName: 0, noName: 0, contacts: 0, commissions: 0, commissionsRemoved: 0, bookings: 0, courses: 0, letters: 0 };

try {
  await client.query('BEGIN');
  const valid = new Set((await client.query(`SELECT code FROM countries`)).rows.map((r) => r.code.trim()));
  const chargeTypes = new Map((await client.query(`SELECT code, filemaker_id::int::text AS fm FROM charge_types WHERE filemaker_id IS NOT NULL`)).rows.map((r) => [r.fm, r.code]));
  const link = (orgId, layout, recordId) =>
    recordId
      ? client.query(
          `INSERT INTO filemaker_links (entity, entity_id, source_database, source_layout, source_record_id, source_primary_key)
           VALUES ('organisation', $1, 'SchoolMan', $2, $3, $3) ON CONFLICT DO NOTHING`,
          [orgId, layout, recordId]
        )
      : null;

  // The agency first: a booking naming both is paid through the agency.
  for (const p of [...parties].sort((a, b) => Number(a.kind === 'company') - Number(b.kind === 'company'))) {
    if (!p.name) {
      count.noName++;
      continue;
    }
    const code = country(p.address?.country);
    const countryCode = code && valid.has(code) ? code : null;
    const address = p.address ? [p.address.street, [p.address.postcode, p.address.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null : null;
    let orgId = (
      await client.query(
        `SELECT entity_id FROM filemaker_links WHERE entity = 'organisation' AND source_database = 'SchoolMan' AND source_layout = $1 AND source_record_id = $2`,
        [LAYOUT[p.kind], p.id]
      )
    ).rows[0]?.entity_id;
    if (!orgId) {
      orgId = (await client.query(`SELECT id FROM organisations WHERE lower(name) = lower($1) AND kind = $2 LIMIT 1`, [p.name, p.kind])).rows[0]?.id;
      if (orgId) count.byName++;
    }
    if (orgId) {
      count.known++;
      await client.query(
        `UPDATE organisations SET address = coalesce(address, $2), country_code = coalesce(country_code, $3), email = coalesce(email, $4), phone = coalesce(phone, $5),
                agreement = coalesce(agreement, $6), is_active = $7
          WHERE id = $1`,
        [orgId, address, countryCode, p.email, p.phone, p.agreement, p.active]
      );
    } else {
      orgId = (
        await client.query(
          `INSERT INTO organisations (name, kind, address, country_code, language, email, phone, is_active, agreement)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [p.name, p.kind, address, countryCode, !countryCode || GERMAN.has(countryCode) ? 'de' : 'en', p.email, p.phone, p.active, p.agreement]
        )
      ).rows[0].id;
      count.made++;
    }
    await link(orgId, LAYOUT[p.kind], p.id);
    await link(orgId, 'Management', p.management);
    await link(orgId, 'Institution', p.institution);

    for (const c of p.contacts) {
      if (!(c.firstName || c.lastName || c.email)) continue;
      await client.query(
        `INSERT INTO organisation_contacts (organisation_id, salutation, first_name, last_name, email, phone, role, filemaker_person_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (organisation_id, filemaker_person_id) WHERE filemaker_person_id IS NOT NULL DO UPDATE
           SET first_name = coalesce(organisation_contacts.first_name, EXCLUDED.first_name), last_name = coalesce(organisation_contacts.last_name, EXCLUDED.last_name),
               email = coalesce(organisation_contacts.email, EXCLUDED.email), phone = coalesce(organisation_contacts.phone, EXCLUDED.phone),
               role = coalesce(organisation_contacts.role, EXCLUDED.role)`,
        [orgId, SALUTATION[c.gender] ?? 'none', c.firstName, c.lastName, c.email, c.phone, c.role, c.id]
      );
      count.contacts++;
    }

    const terms = [];
    for (const t of p.commissions) {
      terms.push(t.id);
      await client.query(
        `INSERT INTO agency_commissions (organisation_id, charge_type_code, percentage, note, filemaker_id) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (filemaker_id) WHERE filemaker_id IS NOT NULL DO UPDATE
           SET organisation_id = EXCLUDED.organisation_id, charge_type_code = EXCLUDED.charge_type_code, percentage = EXCLUDED.percentage, note = EXCLUDED.note`,
        [orgId, chargeTypes.get(t.chargeRef ?? '') ?? null, Math.min(100, Math.max(0, t.percentage)), t.note, t.id]
      );
      count.commissions++;
    }
    count.commissionsRemoved += (
      await client.query(`DELETE FROM agency_commissions WHERE organisation_id = $1 AND filemaker_id IS NOT NULL AND NOT (filemaker_id = ANY($2::text[]))`, [orgId, terms])
    ).rowCount;

    // Who pays: an agency over a company, a booking already paid by an agency keeps it.
    const paid = await client.query(
      `UPDATE bookings SET payer_organisation_id = $1, payer = $2
        WHERE filemaker_booking_id = ANY($3::text[]) AND ($2 = 'agency' OR payer_organisation_id IS NULL OR payer_organisation_id = $1)`,
      [orgId, p.kind === 'agency' ? 'agency' : 'company', p.bookings]
    );
    count.bookings += paid.rowCount;
    // A letter to it, among those that came across with the learners.
    count.letters += (
      await client.query(`UPDATE letters SET organisation_id = $1 WHERE filemaker_letter_id = ANY($2::text[]) AND organisation_id IS DISTINCT FROM $1`, [orgId, p.letters ?? []])
    ).rowCount;
    if (p.courses.length) {
      count.courses += (
        await client.query(
          `UPDATE courses SET organisation_id = $1 WHERE (filemaker_course_id = ANY($2::text[]) OR filemaker_group_ids && $2::text[]) AND organisation_id IS DISTINCT FROM $1`,
          [orgId, p.courses]
        )
      ).rowCount;
    }
  }
  await client.query(process.argv.includes('--dry-run') ? 'ROLLBACK' : 'COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Nothing was written:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

console.log(
  `${count.read} organisations read: ${count.made} new, ${count.known} known (${count.byName} by their name here) · ${count.noName} without a name left out\n` +
    `${count.contacts} contacts · ${count.commissions} commission terms (${count.commissionsRemoved} no longer in SchoolMan removed) · ` +
    `${count.bookings} bookings linked to who pays · ${count.courses} company courses linked · ${count.letters} letters linked`
);
