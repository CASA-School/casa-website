/**
 * Puts SchoolMan's active staff into the staff register (2026-10-17, docs/ADMIN_WORKSPACE.md §Staff).
 *
 *   python3 -I scripts/filemaker/read_staff.py | DATABASE_URL=... node scripts/filemaker/import-staff.mjs [--dry-run]
 *
 * Reads the reader's JSON from stdin — nothing personal is written to a file — and writes in one
 * transaction. Prints counts only.
 *
 * Only SchoolMan's active staff are read, and a new colleague comes in active; one the workspace
 * already has keeps the status it has here — SchoolMan's flag is not always kept up (Werner, who
 * left, is still active there).
 *
 * Matched on SchoolMan's staff number (`staff_members.filemaker_staff_id`), then its person
 * (`filemaker_links`), so a second run adds nothing twice and the 41 teachers Kursplanung brought in
 * get their person filled in rather than a twin. What the workspace already has wins: a field is only
 * filled where it is empty — except the names of the people Kursplanung's list made from one
 * "full name", which SchoolMan has split properly. Kursplanung's planning rules are never touched.
 *
 * - person: names, salutation (Frau/Herr), birth date and place, country of birth; tax, pension and
 *   health-insurance numbers (`person_private`); bank accounts; e-mail, phone, home address
 * - roles from `Purview` that have not ended, Unterricht for an active teacher, and Verwaltung for a
 *   colleague SchoolMan marks as active in the office with no office task named
 * - contracts from `DateTargetWorkTime`, adjoining identical periods merged — only for a colleague
 *   with no dated contract yet (Kursplanung's undated employed/freelance row is replaced)
 * - licences from `DateValidity` for the exams the catalogue has (telc B2, telc C1 Hochschule)
 * - a workspace account with the colleague's work address is linked when nobody holds it yet
 */
import { getCode } from 'country-list';

import { connect } from '../db/client.mjs';

const ROLE = { 1: 'management', 2: 'teaching', 3: 'examiner', 4: 'author', 5: 'coach', 6: 'monitor', 7: 'placement', 8: 'front_office', 9: 'back_office', 10: 'exam_office', 11: 'house', 12: 'it', 13: 'accommodation', 14: 'host_families', 15: 'cleaning', 16: 'supervision' };
const CONTRACT = { 1: 'employed', 2: 'freelance', 3: 'intern', 4: 'temporary', 5: 'federal_volunteer' };
const LICENCE = { 3: 'telc_b2', 4: 'telc_c1_hochschule' };
const OFFICE = new Set(['management', 'front_office', 'back_office', 'exam_office', 'accommodation', 'host_families', 'house', 'it']);
const SALUTATION = { 1: 'mr', 2: 'ms' };
const EMAIL_KIND = { 2: 'work' };
const PHONE_KIND = { 1: 'home', 2: 'work', 5: 'mobile' };

const today = new Date().toISOString().slice(0, 10);
const normalizeEmail = (v) => v.normalize('NFKC').trim().toLowerCase();
const normalizePhone = (v) => {
  const plus = v.normalize('NFKC').replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  return plus.startsWith('00') ? `+${plus.slice(2)}` : plus;
};
const iban = (v) => v.replace(/\s+/g, '').toUpperCase();
const hours = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return v && Number.isFinite(n) && n >= 0 && n <= 60 ? Math.round(n * 10) / 10 : null;
};
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
const addDay = (iso) => new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const newest = (rows) => [...rows].sort((a, b) => String(b.created ?? '').localeCompare(String(a.created ?? '')));

/** Adjoining periods with the same kind and hours, one after the other, become one. */
function mergeContracts(rows) {
  const sorted = rows
    .filter((r) => CONTRACT[r.kind])
    .map((r) => ({ kind: CONTRACT[r.kind], from: r.from, to: r.to, hours: hours(r.hours), units: hours(r.units) }))
    .filter((r) => !(r.from && r.to && r.to < r.from))
    .sort((a, b) => String(a.from ?? '').localeCompare(String(b.from ?? '')));
  const out = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && last.kind === r.kind && last.hours === r.hours && last.units === r.units && last.to && r.from && addDay(last.to) >= r.from) {
      // An open end stays open; otherwise the later of the two ends.
      last.to = r.to === null ? null : r.to > last.to ? r.to : last.to;
    } else out.push({ ...r });
  }
  return out;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const colleagues = await readStdin();
const client = await connect();
const count = { colleagues: colleagues.length, new: 0, matched: 0, emails: 0, phones: 0, addresses: 0, hr: 0, banks: 0, roles: 0, contracts: 0, licences: 0, licencesSkipped: 0, accounts: 0, namesFixed: 0 };

try {
  await client.query('BEGIN');
  const exams = new Map((await client.query(`SELECT code, id FROM exam_types`)).rows.map((r) => [r.code, r.id]));
  const shortNames = new Set((await client.query(`SELECT short_name FROM staff_members`)).rows.map((r) => r.short_name));

  for (const c of colleagues) {
    if (!c.firstName) continue;
    // ---------------------------------------------------------------- who
    let staff = (await client.query(`SELECT id, person_id FROM staff_members WHERE filemaker_staff_id = $1`, [c.staffId])).rows[0];
    let personId = staff?.person_id ?? null;
    if (!personId && c.personId) {
      personId =
        (await client.query(`SELECT entity_id FROM filemaker_links WHERE entity = 'person' AND source_database = 'SchoolMan' AND source_layout = 'Person' AND source_primary_key = $1`, [c.personId]))
          .rows[0]?.entity_id ?? null;
    }
    if (personId) count.matched++;
    else {
      personId = (
        await client.query(`INSERT INTO people (first_name, last_name, created_by) VALUES ($1, $2, 'filemaker-staff') RETURNING id`, [c.firstName, c.lastName || null])
      ).rows[0].id;
      count.new++;
    }
    if (c.personId) {
      await client.query(
        `INSERT INTO filemaker_links (entity, entity_id, source_database, source_layout, source_record_id, source_primary_key)
         VALUES ('person', $1, 'SchoolMan', 'Person', $2, $2) ON CONFLICT (entity, entity_id, source_database, source_layout) DO NOTHING`,
        [personId, c.personId]
      );
    }

    // -------------------------------------------------------------- person
    // Kursplanung's list gave one "full name", split at the last word, and this import named the people it
    // made: SchoolMan has the real split, so their names follow it. Anyone else's name is the workspace's.
    const fixed = await client.query(
      `UPDATE people SET first_name = $2, last_name = $3, updated_at = timezone('utc', now())
        WHERE id = $1 AND created_by IN ('staff-register', 'filemaker-staff') AND (first_name, coalesce(last_name, '')) IS DISTINCT FROM ($2, coalesce($3, ''))`,
      [personId, c.firstName, c.lastName || null]
    );
    count.namesFixed += fixed.rowCount;
    await client.query(
      `UPDATE people SET salutation = coalesce(salutation, $2::salutation), second_last_name = coalesce(second_last_name, $3), nickname = coalesce(nickname, $4),
              birth_date = coalesce(birth_date, $5::date), birth_place = coalesce(birth_place, $6), birth_country_code = coalesce(birth_country_code, $7),
              updated_at = timezone('utc', now())
        WHERE id = $1`,
      [personId, SALUTATION[c.gender] ?? null, c.secondLastName, c.nickname, c.birthDate, c.birthPlace, country(c.birthCountry)]
    );
    if (c.taxId || c.pensionNumber || c.healthNumber) {
      await client.query(
        `INSERT INTO person_private (person_id, tax_id, pension_insurance_number, health_insurance_number, updated_at)
         VALUES ($1, $2, $3, $4, timezone('utc', now()))
         ON CONFLICT (person_id) DO UPDATE SET tax_id = coalesce(person_private.tax_id, EXCLUDED.tax_id),
           pension_insurance_number = coalesce(person_private.pension_insurance_number, EXCLUDED.pension_insurance_number),
           health_insurance_number = coalesce(person_private.health_insurance_number, EXCLUDED.health_insurance_number)`,
        [personId, c.taxId, c.pensionNumber, c.healthNumber]
      );
      count.hr++;
    }

    // ------------------------------------------------------------- contact
    // The work address first, else the newest: SchoolMan marks no main one.
    const hasEmail = (await client.query(`SELECT 1 FROM emails WHERE person_id = $1 AND is_primary`, [personId])).rowCount > 0;
    const emails = newest(c.emails).sort((a, b) => (b.use === '2') - (a.use === '2'));
    for (const [i, e] of emails.entries()) {
      const r = await client.query(
        `INSERT INTO emails (person_id, address, normalized, kind, is_primary) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (person_id, normalized) DO NOTHING`,
        [personId, e.address, normalizeEmail(e.address), EMAIL_KIND[e.use] ?? 'personal', !hasEmail && i === 0]
      );
      count.emails += r.rowCount;
    }
    const hasPhone = (await client.query(`SELECT 1 FROM phones WHERE person_id = $1 AND is_primary`, [personId])).rowCount > 0;
    const phones = newest(c.phones.filter((p) => !p.use || PHONE_KIND[p.use])).sort((a, b) => (b.use === '5') - (a.use === '5'));
    for (const [i, p] of phones.entries()) {
      if (!normalizePhone(p.number)) continue;
      const r = await client.query(
        `INSERT INTO phones (person_id, number, normalized, kind, is_primary) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (person_id, normalized) DO NOTHING`,
        [personId, p.number, normalizePhone(p.number), PHONE_KIND[p.use] ?? 'mobile', !hasPhone && i === 0]
      );
      count.phones += r.rowCount;
    }
    const home = newest(c.addresses).find((a) => a.street || a.city);
    if (home) {
      const r = await client.query(
        `INSERT INTO addresses (person_id, kind, street, postcode, city, country_code) VALUES ($1, 'home', $2, $3, $4, $5) ON CONFLICT (person_id, kind) DO NOTHING`,
        [personId, home.street || null, home.postcode || null, home.city || null, country(home.country)]
      );
      count.addresses += r.rowCount;
    }
    const known = new Set((await client.query(`SELECT iban FROM bank_accounts WHERE person_id = $1`, [personId])).rows.map((r) => iban(r.iban)));
    for (const b of newest(c.banks)) {
      if (known.has(iban(b.iban))) continue;
      known.add(iban(b.iban));
      await client.query(`INSERT INTO bank_accounts (person_id, holder, iban, bic, bank_name) VALUES ($1, $2, $3, $4, $5)`, [
        personId,
        b.holder || `${c.firstName} ${c.lastName}`.trim(),
        iban(b.iban),
        b.bic || null,
        b.bank || null,
      ]);
      count.banks++;
    }

    // ---------------------------------------------------------- the register
    if (!staff) {
      const base = c.teacher && c.shortName ? c.shortName : [c.firstName.split(/\s+/)[0], c.lastName ? c.lastName[0] : null].filter(Boolean).join(' ');
      let short = base;
      for (let n = 2; shortNames.has(short); n++) short = `${base} ${n}`;
      shortNames.add(short);
      staff = (
        await client.query(`INSERT INTO staff_members (person_id, short_name, filemaker_staff_id, is_active) VALUES ($1, $2, $3, true) RETURNING id, person_id`, [
          personId,
          short,
          c.staffId,
        ])
      ).rows[0];
    }
    // Someone the workspace marks as having left stays so: SchoolMan's "active" is not always kept up.

    const roles = new Set(c.roles.filter((r) => ROLE[r.ref] && (!r.to || r.to >= today)).map((r) => ROLE[r.ref]));
    if (c.teacher) roles.add('teaching');
    // Marked as working in the office, with no office task named: Verwaltung.
    if (c.office && ![...roles].some((r) => OFFICE.has(r))) roles.add('back_office');
    for (const role of roles) {
      count.roles += (await client.query(`INSERT INTO staff_member_roles (staff_member_id, role_code) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [staff.id, role])).rowCount;
    }

    const dated = (await client.query(`SELECT 1 FROM staff_contracts WHERE staff_member_id = $1 AND valid_from IS NOT NULL`, [staff.id])).rowCount > 0;
    const periods = mergeContracts(c.contracts);
    if (!dated && periods.length) {
      await client.query(`DELETE FROM staff_contracts WHERE staff_member_id = $1 AND valid_from IS NULL AND created_by IS NULL`, [staff.id]);
      for (const p of periods) {
        await client.query(
          `INSERT INTO staff_contracts (staff_member_id, kind, valid_from, valid_to, weekly_hours, weekly_units) VALUES ($1, $2, $3::date, $4::date, $5, $6)`,
          [staff.id, p.kind, p.from, p.to, p.hours, p.units]
        );
        count.contracts++;
      }
    }

    for (const l of c.licences) {
      const exam = exams.get(LICENCE[l.ref]);
      if (!exam) {
        count.licencesSkipped++;
        continue;
      }
      const r = await client.query(
        `INSERT INTO staff_licences (staff_member_id, exam_type_id, licence_number, valid_from, valid_to)
         SELECT $1, $2, $3, $4::date, $5::date
          WHERE NOT EXISTS (SELECT 1 FROM staff_licences WHERE staff_member_id = $1 AND exam_type_id = $2
                              AND licence_number IS NOT DISTINCT FROM $3 AND valid_from IS NOT DISTINCT FROM $4::date AND valid_to IS NOT DISTINCT FROM $5::date)`,
        [staff.id, exam, l.number, l.from, l.to]
      );
      count.licences += r.rowCount;
    }

    // A workspace account with one of their addresses, nobody's yet.
    const account = await client.query(
      `UPDATE staff_members s SET staff_user_id = u.id
         FROM staff_users u
        WHERE s.id = $1 AND s.staff_user_id IS NULL
          AND lower(u.email) IN (SELECT normalized FROM emails WHERE person_id = s.person_id)
          AND NOT EXISTS (SELECT 1 FROM staff_members o WHERE o.staff_user_id = u.id)`,
      [staff.id]
    );
    count.accounts += account.rowCount;
  }
  // `--dry-run`: everything is done and then undone — the counts say what a real run would write.
  await client.query(process.argv.includes('--dry-run') ? 'ROLLBACK' : 'COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Nothing was written:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

console.log(
  `${count.colleagues} colleagues: ${count.matched} already in the register, ${count.new} new · names fixed ${count.namesFixed} · ` +
    `${count.emails} emails, ${count.phones} phones, ${count.addresses} addresses · HR numbers for ${count.hr}, ${count.banks} bank accounts · ` +
    `${count.roles} roles, ${count.contracts} contract periods, ${count.licences} licences (${count.licencesSkipped} for exams not in the catalogue) · ${count.accounts} accounts linked`
);
