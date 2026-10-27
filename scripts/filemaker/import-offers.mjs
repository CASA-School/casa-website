/**
 * Puts SchoolMan's offers into `offers` (2026-10-18, migration 0059; docs/OFFERS.md §From SchoolMan,
 * docs/schoolman/offers.md): those to a group visit, an agency, a company or a learner of the sample, with
 * their lines, the letters that went out, their comments and work log.
 *
 *   python3 -I scripts/filemaker/read_offers.py | DATABASE_URL=... node scripts/filemaker/import-offers.mjs [--dry-run]
 *
 * Run after the learners, the organisations and the groups (it names them). One transaction; prints
 * counts only.
 *
 * - An offer keeps SchoolMan's number (`filemaker_offer_id`) and gets its own in the year SchoolMan made
 *   it (2025-031). While no colleague has worked on it here, a re-run takes SchoolMan's values as they are
 *   now; once someone has, it is left alone.
 * - A group's offer is a group offer on no package („Eigenes Angebot") with the visit's people and dates;
 *   the rest are individual offers to their organisation or learner. Every SchoolMan line is a typed
 *   line: its type (`charge_types.filemaker_id`, else Zusatzkosten), the label and its detail in the
 *   letter's language, the quantity and the typed price — SchoolMan has no price list behind them.
 * - What became of it, as far as SchoolMan says (it records no answer): invoiced → accepted; a group
 *   called off → declined; a confirmed group → its newest offer accepted, the earlier ones withdrawn
 *   (replaced); a group still asked for, or an offer from the last eight weeks → still open (sent once a
 *   letter went out, else a draft); the rest → „Ohne Antwort" (lapsed).
 * - The letters that went out are its versions, their frozen text as the letter (kind `offer`; one the
 *   learners' import brought becomes the offer's, and that import leaves it alone from then on); the
 *   comments are notes on it, the work log its history (`schoolman_log`, read afresh each run).
 * - Since 2026-10-27: an offer made from a party's own screen goes to that party (`Management`, else
 *   `Institution`, through `filemaker_links`), and one that is no draft but has no letter here is dated by
 *   the date on its letter in SchoolMan (`DateOfEmission`).
 */
import { getCode } from 'country-list';

import { connect } from '../db/client.mjs';
import { changes } from './bridge-changes.mjs';
import { historyProcesses, logDetail } from './history-line.mjs';

import { letterDocument } from './letter-document.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const SALUTATION = { 1: 'mr', 2: 'ms' };
const GERMAN = new Set(['DE', 'AT', 'CH', 'LI']);
const OPEN_FOR_DAYS = 56;
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
const money = (n) => (n == null ? null : Math.round(n * 100) / 100);
const today = new Date().toISOString().slice(0, 10);
const openSince = new Date(Date.now() - OPEN_FOR_DAYS * 86_400_000).toISOString().slice(0, 10);

/** A SchoolMan line as the offer's typed line, in the letter's language. */
function manualLine(l, language, chargeType) {
  const other = language === 'de' ? 'en' : 'de';
  const label = l.label[language] || l.label[other];
  const detail = l.detail[language] || l.detail[other];
  let quantity = l.quantity ?? 1;
  let unitAmount = money(l.unitAmount);
  if (quantity < 0) {
    quantity = -quantity;
    unitAmount = unitAmount == null ? null : -unitAmount;
  }
  return {
    key: `manual:sm-${l.id}`,
    audience: 'participant',
    chargeType,
    description: [label, detail].filter(Boolean).join(' · ').slice(0, 300) || '—',
    quantity: Math.min(10_000, Math.round(quantity * 100) / 100),
    unitAmount: unitAmount == null ? null : Math.max(-100_000, Math.min(1_000_000, unitAmount)),
  };
}

/** What became of an offer, from what SchoolMan has: its invoice, its group, its age, its letters. */
function outcome(o, newestOfGroup) {
  if (o.invoiced) return 'accepted';
  if (o.recipient === 'group' && o.groupStatus === '2') return 'declined';
  if (o.recipient === 'group' && o.groupStatus === '1') return newestOfGroup.get(o.group) === o.id ? 'accepted' : 'withdrawn';
  if ((o.recipient === 'group' && o.groupStatus === '4') || (o.created ?? '').slice(0, 10) >= openSince) return o.letters.length ? 'sent' : 'draft';
  return 'lapsed';
}

const offers = await readStdin();
const client = await connect();
const count = { read: offers.length, made: 0, updated: 0, unchanged: 0, keptHere: 0, noRecipient: 0, lines: 0, letters: 0, notes: 0, log: 0 };
const statuses = {};

try {
  await client.query('BEGIN');
  // The kinds of a history line (0094).
  const processes = await historyProcesses(client);
  const valid = new Set((await client.query(`SELECT code FROM countries`)).rows.map((r) => r.code.trim()));
  const chargeTypes = new Map((await client.query(`SELECT code, filemaker_id FROM charge_types WHERE filemaker_id IS NOT NULL`)).rows.map((r) => [Number(r.filemaker_id), r.code]));
  const chargeType = (ref) => chargeTypes.get(Number(String(ref ?? '').replace(',', '.'))) ?? 'additional_costs';
  // Everything an offer is matched to, read once rather than per offer (2026-10-26): inside Azure every
  // statement waits ~10 ms for the database.
  const links = new Map(
    (
      await client.query(
        `SELECT entity, source_layout, source_record_id, entity_id FROM filemaker_links
          WHERE source_database = 'SchoolMan'
            AND ((entity = 'organisation' AND source_layout IN ('Agency', 'Corporate', 'Management', 'Institution')) OR (entity = 'person' AND source_layout = 'Person'))`
      )
    ).rows.map((r) => [`${r.entity}|${r.source_layout}|${r.source_record_id}`, r.entity_id])
  );
  const linked = (entity, layout, recordId) => (recordId ? (links.get(`${entity}|${layout}|${recordId}`) ?? null) : null);
  const visits = new Map(
    (await client.query(`SELECT filemaker_group_id, id, organisation_id, agency_id FROM group_visits WHERE filemaker_group_id IS NOT NULL`)).rows.map((r) => [
      String(r.filemaker_group_id),
      r,
    ])
  );
  const organisations = new Map((await client.query(`SELECT id, name, language, country_code FROM organisations`)).rows.map((r) => [r.id, r]));
  const people = new Map((await client.query(`SELECT id, first_name, last_name FROM people`)).rows.map((r) => [r.id, r]));
  const knownOffers = new Map(
    (
      await client.query(
        `SELECT f.filemaker_offer_id, f.id, EXISTS (SELECT 1 FROM staff_activity a WHERE a.entity = 'offer' AND a.entity_id = f.id AND a.action <> 'schoolman_log') AS changed_here
           FROM offers f WHERE f.filemaker_offer_id IS NOT NULL`
      )
    ).rows.map((r) => [String(r.filemaker_offer_id), r])
  );
  // An offer as it was last time, for the same recipient here, is passed over (0088).
  const changed = await changes(client, 'offers');

  // A confirmed group's newest offer is the one it took.
  const newestOfGroup = new Map();
  for (const o of [...offers].sort((a, b) => String(a.created ?? '').localeCompare(String(b.created ?? '')))) if (o.group) newestOfGroup.set(o.group, o.id);

  for (const o of offers) {
    // Who it is for.
    const visit = o.group ? (visits.get(String(o.group)) ?? null) : null;
    const organisationId = visit
      ? (visit.organisation_id ?? visit.agency_id)
      : o.recipient === 'agency'
        ? linked('organisation', 'Agency', o.agency)
        : o.recipient === 'company'
          ? linked('organisation', 'Corporate', o.company)
          : o.recipient === 'party'
            ? (linked('organisation', 'Management', o.management) ?? linked('organisation', 'Institution', o.institution))
            : null;
    const personId = o.recipient === 'learner' ? linked('person', 'Person', o.person) : null;
    const organisation = organisationId ? (organisations.get(organisationId) ?? null) : null;
    const person = personId ? (people.get(personId) ?? null) : null;
    if (!organisation && !person && !visit) {
      count.noRecipient++;
      continue;
    }

    const known = knownOffers.get(String(o.id));
    if (known?.changed_here) {
      count.keptHere++;
      continue;
    }

    const addressCountry = country(o.address?.country);
    const countryCode = addressCountry && valid.has(addressCountry) ? addressCountry : (organisation?.country_code?.trim() ?? null);
    const lastLetter = o.letters.at(-1);
    const language = lastLetter?.lang ?? organisation?.language ?? (countryCode && !GERMAN.has(countryCode) ? 'en' : 'de');
    const lines = o.lines.slice(0, 60).map((l) => manualLine(l, language, chargeType(l.ref)));
    const status = outcome(o, newestOfGroup);
    statuses[status] = (statuses[status] ?? 0) + 1;
    const sentAt = lastLetter?.sent ?? (status !== 'draft' && o.emitted ? `${o.emitted}T12:00:00` : null);
    const decided = ['accepted', 'declined', 'withdrawn', 'lapsed'].includes(status);
    const recipientName = organisation?.name ?? [person?.first_name, person?.last_name].filter(Boolean).join(' ') ?? '';
    const address = o.address ? [o.address.street, [o.address.postcode, o.address.city].filter(Boolean).join(' ')].filter(Boolean).join('\n') || null : null;
    const groupOffer = Boolean(visit);
    // A group's own offer's length: from its dates, else the weeks its course line is priced for („Kurspreis
    // 2 × 145"; a company's course line counts lessons, so only a group's, and only a stay's length), else the default.
    const nights = o.arrival && o.departure ? Math.round((Date.parse(o.departure) - Date.parse(o.arrival)) / 86_400_000) : 0;
    const tuitionWeeks = visit
      ? lines.find((l) => l.chargeType === 'tuition' && Number.isInteger(l.quantity) && l.quantity >= 1 && l.quantity <= 12)?.quantity
      : undefined;
    const weeks = nights > 0 ? Math.min(52, Math.ceil(nights / 7)) : (tuitionWeeks ?? 2);
    const stay = {
      choices: { package: 'own', weeks, modules: { course: true, materials: true, accommodation: true, lunch: true, transport: true }, activities: [], extras: [], escortPricing: 'paid', course: null },
      overrides: {},
      manual: lines,
    };
    const title = (o.title ?? (groupOffer ? o.groupName : null) ?? lines[0]?.description ?? '').slice(0, 200);
    const departure = o.departure && o.arrival && o.departure <= o.arrival ? null : o.departure;
    const values = [
      groupOffer ? 'group' : 'individual',
      status,
      language,
      title,
      groupOffer ? (o.groupName ?? null) : null,
      organisationId,
      personId,
      recipientName,
      o.contact ? (SALUTATION[o.contact.gender] ?? 'none') : 'none',
      o.contact?.firstName ?? null,
      o.contact?.lastName ?? null,
      o.email,
      address,
      countryCode,
      o.arrival,
      departure,
      groupOffer ? o.participants : null,
      groupOffer ? (o.escorts ?? 0) : 0,
      JSON.stringify(stay),
      o.letters.length,
      sentAt,
      decided ? (sentAt ?? o.created) : null,
      visit?.id ?? null,
    ];
    if (known && changed.same(o.id, [o, values])) {
      count.unchanged++;
      continue;
    }

    let offerId = known?.id;
    if (!offerId) {
      const year = Number((o.created ?? today).slice(0, 4));
      const seq = (await client.query(`SELECT coalesce(max(seq), 0) + 1 AS seq FROM offers WHERE year = $1`, [year])).rows[0].seq;
      offerId = (
        await client.query(
          `INSERT INTO offers (kind, status, language, title, group_name, organisation_id, person_id, recipient_name, contact_salutation, contact_first_name,
                               contact_last_name, contact_email, address, country_code, arrival, departure, participants, escorts, stay, version, sent_at,
                               decided_at, group_visit_id, year, seq, filemaker_offer_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20,
                   $21::timestamp AT TIME ZONE 'Europe/Berlin', $22::timestamp AT TIME ZONE 'Europe/Berlin', $23, $24, $25, $26,
                   coalesce($27::timestamp AT TIME ZONE 'Europe/Berlin', now()), coalesce(coalesce($21, $27)::timestamp AT TIME ZONE 'Europe/Berlin', now()))
           RETURNING id`,
          [...values, year, seq, o.id, o.created]
        )
      ).rows[0].id;
      count.made++;
    } else {
      const written = await client.query(
        `UPDATE offers SET kind = $1, status = $2, language = $3, title = $4, group_name = $5, organisation_id = $6, person_id = $7, recipient_name = $8,
                contact_salutation = $9, contact_first_name = $10, contact_last_name = $11, contact_email = $12, address = $13, country_code = $14,
                arrival = $15, departure = $16, participants = $17, escorts = $18, stay = $19::jsonb, version = $20,
                sent_at = $21::timestamp AT TIME ZONE 'Europe/Berlin', decided_at = $22::timestamp AT TIME ZONE 'Europe/Berlin', group_visit_id = $23
          WHERE id = $24
            -- Only when SchoolMan changed it: every update stamps updated_at, which the list shows.
            AND (kind, status, language, title, group_name, organisation_id, person_id, recipient_name, contact_salutation, contact_first_name, contact_last_name,
                 contact_email, address, country_code, arrival, departure, participants, escorts, stay, version, sent_at, decided_at, group_visit_id)
                IS DISTINCT FROM ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20,
                                  $21::timestamp AT TIME ZONE 'Europe/Berlin', $22::timestamp AT TIME ZONE 'Europe/Berlin', $23)`,
        [...values, offerId]
      );
      if (written.rowCount) count.updated++;
      else count.unchanged++;
    }

    // Its lines as they stand (a draft is priced from the typed lines again when it opens).
    await client.query(`DELETE FROM offer_lines WHERE offer_id = $1`, [offerId]);
    let position = 0;
    for (const l of lines) {
      position += 1;
      await client.query(
        `INSERT INTO offer_lines (offer_id, position, audience, key, charge_type_code, description, quantity, unit, unit_amount, amount)
         VALUES ($1, $2, 'participant', $3, $4, $5, $6, 'item', $7, $8)`,
        [offerId, position, l.key, l.chargeType, l.description, l.quantity, l.unitAmount, l.unitAmount == null ? null : money(l.quantity * l.unitAmount)]
      );
      count.lines++;
    }

    // The letters that went out, the oldest first: its versions.
    let version = 0;
    for (const letter of o.letters) {
      version += 1;
      const doc = letterDocument({ ...letter, lang: letter.lang ?? language }, 'offer');
      const subject = doc.subject.title || 'Angebot';
      const recipient = doc.recipient[0] ?? recipientName ?? '';
      const existing = (await client.query(`SELECT id FROM letters WHERE filemaker_letter_id = $1`, [letter.ref])).rows[0];
      if (existing) {
        await client.query(
          `UPDATE letters SET kind = 'offer', offer_id = $2, version = $3, booking_id = NULL, organisation_id = coalesce(organisation_id, $4), document = $5::jsonb,
                  subject = $6, recipient_name = $7
            WHERE id = $1`,
          [existing.id, offerId, version, organisationId, JSON.stringify(doc), subject, recipient]
        );
      } else {
        await client.query(
          `INSERT INTO letters (kind, version, language, offer_id, organisation_id, person_id, recipient_name, subject, document, sent_at, filemaker_letter_id)
           VALUES ('offer', $1, $2, $3, $4, $5, $6, $7, $8::jsonb, coalesce($9::timestamp AT TIME ZONE 'Europe/Berlin', now()), $10)`,
          [version, doc.language, offerId, organisationId, personId, recipient, subject, JSON.stringify(doc), letter.sent, letter.ref]
        );
      }
      count.letters++;
    }

    for (const n of o.notes) {
      await client.query(
        `INSERT INTO staff_notes (entity, entity_id, body, author_name, filemaker_ref, created_at)
         VALUES ('offer', $1, $2, $3, $4, coalesce($5::timestamp AT TIME ZONE 'Europe/Berlin', now()))
         ON CONFLICT (filemaker_ref) WHERE filemaker_ref IS NOT NULL DO UPDATE
           SET entity = EXCLUDED.entity, entity_id = EXCLUDED.entity_id, body = EXCLUDED.body, author_name = EXCLUDED.author_name, created_at = EXCLUDED.created_at`,
        [offerId, n.body.slice(0, 20000), n.author ?? 'SchoolMan', n.ref, n.at]
      );
      count.notes++;
    }
    await client.query(`DELETE FROM staff_activity WHERE action = 'schoolman_log' AND entity = 'offer' AND entity_id = $1`, [offerId]);
    for (const w of o.log) {
      await client.query(
        `INSERT INTO staff_activity (staff_name, entity, entity_id, action, detail, created_at)
         VALUES ($1, 'offer', $2, 'schoolman_log', $3::jsonb, coalesce($4::timestamp AT TIME ZONE 'Europe/Berlin', now()))`,
        [w.author ?? 'SchoolMan', offerId, JSON.stringify(logDetail(w, processes)), w.at]
      );
      count.log++;
    }
    // A new offer is remembered once written.
    if (!known) changed.same(o.id, [o, values]);
  }
  await changed.save();
  await client.query(process.argv.includes('--dry-run') ? 'ROLLBACK' : 'COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Nothing was written:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

console.log(
  `${count.read} offers read: ${count.made} new, ${count.updated} updated, ${count.unchanged} unchanged, ${count.keptHere} worked on here (left alone), ${count.noRecipient} whose recipient is not here\n` +
    `${Object.entries(statuses)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ')} · ${count.lines} lines · ${count.letters} letters · ${count.notes} comments · ${count.log} work-log lines`
);
