/**
 * Puts the rest of SchoolMan's learner ledger on the bookings that came across (2026-10-18, migration
 * 0063; docs/ADMIN_WORKSPACE.md §Money from SchoolMan): payment plans, an agency's commission per charge,
 * money paid out (rent to hosts, commission to agencies), the invoice numbers on charges, and the invoices.
 *
 *   python3 -I scripts/filemaker/read_money.py | DATABASE_URL=... node scripts/filemaker/import-money.mjs [--dry-run]
 *
 * Run after the learners, the organisations and the accommodation (it names them). One transaction;
 * prints counts only.
 *
 * - Every row keeps SchoolMan's number; a re-run updates it. Nothing here is computed into a balance:
 *   SchoolMan's ledger is read beside finance's DATEV, as it is.
 * - An agency or a company is found by its SchoolMan record (`filemaker_links`), a host by its place
 *   (`accommodations.filemaker_id`) or by the stay the rent is for, a charge by its `CostDetail`, a learner by their `Person`.
 * - An invoice comes across when its booking or its organisation is here — the agency or company it bills,
 *   else its party or institution (0094) —, with whether its number was cancelled, its offer and its group.
 * - A rent payout keeps the period it covers; a payout without a kind that is a refund to the learner is a
 *   payment below zero on their booking (the learners' step), and a payout row an earlier run made of it goes.
 * - A payment is linked to the instalment it paid once both are here.
 */
import { connect } from '../db/client.mjs';
import { changes } from './bridge-changes.mjs';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const data = await readStdin();
const client = await connect();
const count = { instalments: 0, commissions: 0, payouts: 0, stamps: 0, invoices: 0, skipped: 0 };

try {
  await client.query('BEGIN');
  const map = async (sql) => new Map((await client.query(sql)).rows.map((r) => [r.k, r.v]));
  const bookings = await map(`SELECT filemaker_booking_id AS k, id AS v FROM bookings WHERE filemaker_booking_id IS NOT NULL`);
  const charges = await map(`SELECT filemaker_cost_detail_id AS k, id AS v FROM booking_charges WHERE filemaker_cost_detail_id IS NOT NULL`);
  const places = await map(`SELECT filemaker_id AS k, id AS v FROM accommodations WHERE filemaker_id IS NOT NULL`);
  const stayPlaces = await map(`SELECT filemaker_id AS k, accommodation_id AS v FROM booking_stays WHERE filemaker_id IS NOT NULL AND accommodation_id IS NOT NULL`);
  const linked = async (entity, layout) =>
    map(`SELECT source_record_id AS k, entity_id AS v FROM filemaker_links WHERE entity = '${entity}' AND source_database = 'SchoolMan' AND source_layout = '${layout}'`);
  const agencies = await linked('organisation', 'Agency');
  const companies = await linked('organisation', 'Corporate');
  const managements = await linked('organisation', 'Management');
  const institutions = await linked('organisation', 'Institution');
  const persons = await linked('person', 'Person');
  const offers = await map(`SELECT filemaker_offer_id AS k, id AS v FROM offers WHERE filemaker_offer_id IS NOT NULL`);
  const groups = await map(`SELECT filemaker_group_id AS k, id AS v FROM group_visits WHERE filemaker_group_id IS NOT NULL`);
  const organisationOf = (r) => (r.agency && agencies.get(r.agency)) || (r.company && companies.get(r.company)) || null;
  // Whom an invoice bills: its agency or company, else its party or that party's institution (0094).
  const billedOf = (r) => organisationOf(r) || (r.management && managements.get(r.management)) || (r.institution && institutions.get(r.institution)) || null;
  // How a payout was paid, by SchoolMan's method number (as `payments.method`).
  const METHOD = { 1: 'card', 2: 'cash', 5: 'transfer', 7: 'carryover', 8: 'agency', 9: 'offset' };
  // A row as it was last time, matched to the same records here, is passed over (0088).
  const changed = await changes(client, 'money');

  for (const i of data.instalments) {
    const bookingId = bookings.get(i.booking);
    if (!bookingId) {
      count.skipped++;
      continue;
    }
    if (changed.same(`instalment:${i.id}`, [i, bookingId])) continue;
    await client.query(
      `INSERT INTO booking_instalments (booking_id, position, label, due_on, amount, paid, filemaker_id) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (filemaker_id) WHERE filemaker_id IS NOT NULL DO UPDATE
         SET booking_id = EXCLUDED.booking_id, position = EXCLUDED.position, label = EXCLUDED.label, due_on = EXCLUDED.due_on, amount = EXCLUDED.amount, paid = EXCLUDED.paid`,
      [bookingId, i.position ?? 1, i.label, i.due, i.amount, i.paid, i.id]
    );
    count.instalments++;
  }
  // The instalment each payment paid (0094), in one statement: only a link that differs is written.
  const paid = data.instalmentPaid ?? [];
  count.instalmentPayments = (
    await client.query(
      `UPDATE payments p SET instalment_id = i.id
         FROM unnest($1::text[], $2::text[]) AS v(payment, instalment) JOIN booking_instalments i ON i.filemaker_id = v.instalment
        WHERE p.filemaker_payment_id = v.payment AND p.instalment_id IS DISTINCT FROM i.id`,
      [paid.map((x) => x.payment), paid.map((x) => x.instalment)]
    )
  ).rowCount;

  for (const c of data.commissions) {
    const bookingId = bookings.get(c.booking);
    if (!bookingId) {
      count.skipped++;
      continue;
    }
    if (changed.same(`commission:${c.id}`, [c, bookingId, organisationOf(c), charges.get(c.charge) ?? null])) continue;
    // SchoolMan keeps the share as 20 or as 0.2.
    const percentage = c.percentage == null ? null : c.percentage > 0 && c.percentage <= 1 ? c.percentage * 100 : c.percentage;
    await client.query(
      `INSERT INTO booking_commissions (booking_id, organisation_id, charge_id, description, base_amount, percentage, amount, paid, filemaker_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (filemaker_id) WHERE filemaker_id IS NOT NULL DO UPDATE
         SET booking_id = EXCLUDED.booking_id, organisation_id = EXCLUDED.organisation_id, charge_id = EXCLUDED.charge_id, description = EXCLUDED.description,
             base_amount = EXCLUDED.base_amount, percentage = EXCLUDED.percentage, amount = EXCLUDED.amount, paid = EXCLUDED.paid`,
      [bookingId, organisationOf(c), charges.get(c.charge) ?? null, c.label, c.base, percentage != null && percentage <= 100 ? percentage : null, c.amount, c.paid, c.id]
    );
    count.commissions++;
  }

  for (const p of data.payouts) {
    const bookingId = bookings.get(p.booking);
    if (!bookingId) {
      count.skipped++;
      continue;
    }
    const placeId = places.get(p.accommodation ?? '') ?? stayPlaces.get(p.stay ?? '') ?? null;
    if (changed.same(`payout:${p.id}`, [p, bookingId, placeId, organisationOf(p)])) continue;
    await client.query(
      `INSERT INTO payouts (kind, booking_id, accommodation_id, organisation_id, amount, paid_on, method, note, filemaker_id, period_start, period_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (filemaker_id) WHERE filemaker_id IS NOT NULL DO UPDATE
         SET kind = EXCLUDED.kind, booking_id = EXCLUDED.booking_id, accommodation_id = EXCLUDED.accommodation_id, organisation_id = EXCLUDED.organisation_id,
             amount = EXCLUDED.amount, paid_on = EXCLUDED.paid_on, method = EXCLUDED.method, note = EXCLUDED.note,
             period_start = EXCLUDED.period_start, period_end = EXCLUDED.period_end`,
      [p.kind, bookingId, placeId, organisationOf(p), p.amount, p.paid, METHOD[p.method] ?? null, p.note?.slice(0, 2000) ?? null, p.id, p.start ?? null, p.end ?? null]
    );
    count.payouts++;
  }
  // A payout read as a refund is a payment below zero on the learner's account now (0094): the row an earlier
  // run made of it goes, so it is not counted twice.
  count.refundsMoved = (await client.query(`DELETE FROM payouts WHERE filemaker_id = ANY($1::text[])`, [data.refunds ?? []])).rowCount;

  for (const s of data.stamps) {
    const chargeId = charges.get(s.charge);
    if (!chargeId || changed.same(`stamp:${s.charge}`, [s, chargeId])) continue;
    count.stamps += (await client.query(`UPDATE booking_charges SET invoice_number = $2 WHERE id = $1 AND invoice_number IS DISTINCT FROM $2`, [chargeId, s.invoice])).rowCount;
  }

  for (const i of data.invoices) {
    const bookingId = i.booking ? (bookings.get(i.booking) ?? null) : null;
    const organisationId = billedOf(i);
    if (!bookingId && !organisationId) {
      count.skipped++;
      continue;
    }
    const offerId = i.offer ? (offers.get(i.offer) ?? null) : null;
    const groupId = i.group ? (groups.get(i.group) ?? null) : null;
    if (changed.same(`invoice:${i.id}`, [i, bookingId, organisationId, persons.get(i.person ?? '') ?? null, offerId, groupId])) continue;
    await client.query(
      `INSERT INTO invoices (number, issued_on, booking_id, person_id, organisation_id, recipient, subject, amount, filemaker_id, cancelled, offer_id, group_visit_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (filemaker_id) WHERE filemaker_id IS NOT NULL DO UPDATE
         SET number = EXCLUDED.number, issued_on = EXCLUDED.issued_on, booking_id = EXCLUDED.booking_id, person_id = EXCLUDED.person_id,
             organisation_id = EXCLUDED.organisation_id, recipient = EXCLUDED.recipient, subject = EXCLUDED.subject, amount = EXCLUDED.amount,
             cancelled = EXCLUDED.cancelled, offer_id = EXCLUDED.offer_id, group_visit_id = EXCLUDED.group_visit_id`,
      [
        i.number,
        i.issued,
        bookingId,
        persons.get(i.person ?? '') ?? null,
        organisationId,
        i.recipient?.slice(0, 2000) ?? null,
        i.subject?.slice(0, 500) ?? null,
        i.amount,
        i.id,
        i.cancelled === true,
        offerId,
        groupId,
      ]
    );
    count.invoices++;
  }
  count.unchanged = changed.unchanged;
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
  `${count.instalments} instalments · ${count.instalmentPayments ?? 0} payments linked to their instalment · ${count.commissions} commission lines · ` +
    `${count.payouts} payouts · ${count.refundsMoved ?? 0} payouts now refunds on the learner's account · ${count.stamps} charges stamped with their invoice · ` +
    `${count.invoices} invoices · ${count.skipped} rows whose booking or organisation is not here · ${count.unchanged ?? 0} as last time`
);
