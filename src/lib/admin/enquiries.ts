import type { StaffUser } from './auth';
import { logActivity } from './activity';
import { query, queryFirst, withTransaction } from './db';
import { createOrganisation } from './organisations';
import type { OrganisationKind } from './offers/types';
import { setQueueStatus } from './queues';
import { inboxConditions, inboxOrder, type InboxPeriod, type InboxState } from './inbox';
import { normaliseStatus, type WorkStatus } from './queues';
import { isUuid } from './ids';

/**
 * Reads for the enquiry queue.
 *
 * `organiser_brief` is returned as-is. It is a jsonb bag whose keys come from
 * `organiserBriefFields()` in src/lib/validation/contact.ts and change when the
 * public form changes, so typing it here would guarantee the two drift apart;
 * the detail view renders whatever keys are present and labels the ones it
 * knows.
 */

export type EnquiryListItem = {
  id: string;
  kind: 'general' | 'group' | 'company';
  firstName: string;
  lastName: string | null;
  email: string;
  /** The language the form was sent in — the one to reply in. */
  locale: string;
  topic: string;
  message: string;
  status: WorkStatus;
  assigneeName: string | null;
  submittedAt: Date;
  personId: string | null;
  /** Unresolved record_flags — "needs a look" markers in a list. */
  openFlags: number;
};

export type EnquiryDetail = EnquiryListItem & {
  requestId: string;
  topicKey: string | null;
  source: string;
  organiserBrief: Record<string, unknown> | null;
  userAgent: string | null;
  assignedTo: string | null;
  /** The agency's, company's or school's this enquiry was sent to (0076). */
  organisation: { id: string; name: string } | null;
};

type Row = {
  id: string;
  request_id: string;
  kind: string;
  locale: string;
  first_name: string;
  last_name: string | null;
  email: string;
  topic: string;
  topic_key: string | null;
  message: string;
  source: string;
  organiser_brief: Record<string, unknown> | null;
  status: string;
  assigned_to: string | null;
  assignee_name: string | null;
  user_agent: string | null;
  person_id: string | null;
  organisation_id: string | null;
  organisation_name: string | null;
  open_flags: string;
  submitted_at: Date;
};

const SELECT = `
  SELECT e.id,
         e.request_id,
         e.kind,
         e.locale,
         e.first_name,
         e.last_name,
         e.email,
         e.topic,
         e.topic_key,
         e.message,
         e.source,
         e.organiser_brief,
         e.status::text AS status,
         e.assigned_to,
         u.name AS assignee_name,
         e.user_agent,
         e.person_id,
         e.organisation_id,
         (SELECT o.name FROM organisations o WHERE o.id = e.organisation_id) AS organisation_name,
         (SELECT count(*) FROM record_flags f
           WHERE f.entity = 'enquiry' AND f.entity_id = e.id AND f.resolved_at IS NULL) AS open_flags,
         e.submitted_at
    FROM enquiries e
    LEFT JOIN staff_users u ON u.id = e.assigned_to
`;

const toListItem = (row: Row): EnquiryListItem => ({
  id: row.id,
  kind: row.kind === 'group' || row.kind === 'company' ? row.kind : 'general',
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  locale: row.locale,
  topic: row.topic,
  message: row.message,
  status: normaliseStatus(row.status),
  assigneeName: row.assignee_name,
  submittedAt: row.submitted_at,
  personId: row.person_id,
  openFlags: Number(row.open_flags ?? 0),
});

export async function listEnquiries({
  period = 'week',
  state = 'any',
  search,
  limit = 50,
  offset = 0,
}: {
  period?: InboxPeriod;
  state?: InboxState;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: EnquiryListItem[]; total: number }> {
  const conditions = inboxConditions('enquiry', 'e', { period, state });
  const params: unknown[] = [];

  if (search && search.trim().length > 0) {
    params.push(`%${search.trim()}%`);
    const p = `$${params.length}`;
    conditions.push(
      `(e.first_name ILIKE ${p} OR e.last_name ILIKE ${p} OR e.email ILIKE ${p} OR e.topic ILIKE ${p} OR e.message ILIKE ${p})`
    );
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const totalRow = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM enquiries e ${where}`,
    params
  );

  const rows = await query<Row>(
    `${SELECT} ${where}
     ORDER BY ${inboxOrder('enquiry', 'e')}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return { items: rows.map(toListItem), total: Number(totalRow?.n ?? 0) };
}

export async function getEnquiry(id: string): Promise<EnquiryDetail | null> {
  if (!isUuid(id)) return null;
  const row = await queryFirst<Row>(`${SELECT} WHERE e.id = $1 AND e.deleted_at IS NULL`, [id]);

  if (!row) {
    return null;
  }

  return {
    ...toListItem(row),
    requestId: row.request_id,
    topicKey: row.topic_key,
    source: row.source,
    organiserBrief: row.organiser_brief,
    userAgent: row.user_agent,
    assignedTo: row.assigned_to,
    organisation: row.organisation_id && row.organisation_name ? { id: row.organisation_id, name: row.organisation_name } : null,
  };
}

/** The other enquiries sent from the same address, newest first: what this person asked before. */
export async function otherEnquiriesFrom(email: string, exceptId: string): Promise<EnquiryListItem[]> {
  const rows = await query<Row>(
    `${SELECT} WHERE lower(e.email) = lower($1) AND e.id <> $2 AND e.status <> 'spam' AND e.deleted_at IS NULL ORDER BY e.submitted_at DESC LIMIT 6`,
    [email, exceptId]
  );
  return rows.map(toListItem);
}

// ------------------------------------------------------------------ what a colleague does with one (0076)

type Outcome = { ok: true } | { ok: false; reason: { de: string; en: string } };

/**
 * „Organisation zuordnen": an agency's, a company's or a school's enquiry goes to its organisation —
 * an existing one, or one made from here — and its sender becomes one of the organisation's contacts
 * (unless that address is one already). The sender's person stays off the register. An enquiry that
 * was open is now in progress.
 */
export async function assignEnquiryOrganisation({
  enquiryId,
  organisationId,
  create,
  actor,
}: {
  enquiryId: string;
  organisationId?: string | null;
  create?: { name: string; kind: OrganisationKind } | null;
  actor: StaffUser;
}): Promise<Outcome> {
  const enquiry = await getEnquiry(enquiryId);
  if (!enquiry) return { ok: false, reason: { de: 'Diese Anfrage gibt es nicht mehr.', en: 'This enquiry no longer exists.' } };
  let id = organisationId ?? null;
  if (!id && create?.name.trim()) {
    id = await createOrganisation(
      {
        name: create.name.trim(),
        kind: create.kind,
        relation: null,
        address: null,
        countryCode: null,
        language: enquiry.locale === 'en' ? 'en' : 'de',
        email: null,
        phone: null,
        agreement: null,
        note: null,
      },
      actor
    );
  }
  if (!id) return { ok: false, reason: { de: 'Bitte wähle eine Organisation.', en: 'Please choose an organisation.' } };
  const name = await withTransaction(async (client) => {
    const org = await client.query<{ name: string }>(`SELECT name FROM organisations WHERE id = $1`, [id]);
    if (!org.rows[0]) return null;
    await client.query(`UPDATE enquiries SET organisation_id = $2 WHERE id = $1`, [enquiryId, id]);
    const phone = await client.query<{ number: string }>(
      `SELECT number FROM phones WHERE person_id = $1 ORDER BY is_primary DESC, created_at LIMIT 1`,
      [enquiry.personId]
    );
    await client.query(
      `INSERT INTO organisation_contacts (organisation_id, salutation, first_name, last_name, email, phone, created_by)
       SELECT $1, 'none', $2, $3, $4, $5, $6
        WHERE NOT EXISTS (SELECT 1 FROM organisation_contacts c WHERE c.organisation_id = $1 AND lower(c.email) = lower($4))`,
      [id, enquiry.firstName, enquiry.lastName, enquiry.email, phone.rows[0]?.number ?? null, actor.id]
    );
    return org.rows[0].name;
  });
  if (!name) return { ok: false, reason: { de: 'Diese Organisation gibt es nicht mehr.', en: 'This organisation no longer exists.' } };
  await logActivity({ actor, entity: 'enquiry', entityId: enquiryId, action: 'organisation_assigned', detail: { organisation: id, name } });
  if (enquiry.status === 'new') await setQueueStatus({ entity: 'enquiry', id: enquiryId, status: 'in_progress', actor });
  return { ok: true };
}

/**
 * „Löschen": the enquiry leaves every list (`deleted_at`), and with it its person when that person is
 * off the register and has nothing else at CASA — a spam sender leaves no trace in Teilnehmende.
 */
export async function deleteEnquiries({ ids, actor }: { ids: string[]; actor: StaffUser }): Promise<number> {
  const live = ids.filter(isUuid);
  if (live.length === 0) return 0;
  const deleted = await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string; person_id: string | null }>(
      `UPDATE enquiries SET deleted_at = now() WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL RETURNING id, person_id`,
      [live]
    );
    const people = [...new Set(rows.map((r) => r.person_id).filter((p): p is string => Boolean(p)))];
    if (people.length) {
      await client.query(
        `UPDATE people p SET deleted_at = now(), deleted_by = $2
          WHERE p.id = ANY($1::uuid[]) AND NOT p.listed AND p.deleted_at IS NULL AND p.merged_into IS NULL
            AND NOT EXISTS (SELECT 1 FROM enquiries e WHERE e.person_id = p.id AND e.deleted_at IS NULL)
            AND NOT EXISTS (SELECT 1 FROM course_registrations r WHERE r.person_id = p.id)
            AND NOT EXISTS (SELECT 1 FROM exam_registrations r WHERE r.person_id = p.id)
            AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.person_id = p.id)
            AND NOT EXISTS (SELECT 1 FROM people d WHERE d.merged_into = p.id)`,
        [people, actor.id]
      );
    }
    return rows.map((r) => r.id);
  });
  for (const id of deleted) await logActivity({ actor, entity: 'enquiry', entityId: id, action: 'enquiry_deleted' });
  return deleted.length;
}

/** The enquiries marked spam, for „Spam löschen". */
export async function spamEnquiryIds(): Promise<string[]> {
  const rows = await query<{ id: string }>(`SELECT id FROM enquiries WHERE status = 'spam' AND deleted_at IS NULL`);
  return rows.map((r) => r.id);
}
