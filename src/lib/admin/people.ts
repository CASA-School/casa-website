import { query, queryFirst, withTransaction } from './db';
import type { StaffUser } from './auth';
import { logActivity } from './activity';
import { countryCodeFromName, normalizeEmail, normalizePhone, parseIsoDate } from './normalize';
import { displayName } from './normalize';

/**
 * People — one row per human, from first contact.
 *
 * The rule this module enforces, and the one FileMaker never had
 * (docs/FILEMAKER_LESSONS.md §1): identity is decided once, by a person, and
 * recorded. Intake creates a row for every submission and RAISES a flag when
 * it looks like someone we already have; a staff member then LINKS the new row
 * to the existing one. Nothing is merged by a script, nothing is deleted, and
 * every row keeps the history it arrived with — `canonical_person_id()` does
 * the following-through at read time.
 */

export type PersonSummary = {
  id: string;
  /** The surviving row after following `merged_into`. Equals `id` unless linked. */
  canonicalId: string;
  salutation: string | null;
  firstName: string;
  lastName: string | null;
  displayName: string;
  birthDate: Date | null;
  nationalityCode: string | null;
  nationalityName: string | null;
  nationalityRaw: string | null;
  mergedInto: string | null;
  createdBy: string;
  createdAt: Date;
};

export type PersonDetail = PersonSummary & {
  emails: { address: string; isPrimary: boolean }[];
  phones: { number: string; isPrimary: boolean }[];
  /** Rows linked INTO this one (duplicates that were resolved to it). */
  linkedDuplicates: PersonSummary[];
};

type Row = {
  id: string;
  canonical_id: string;
  salutation: string | null;
  first_name: string;
  last_name: string | null;
  birth_date: Date | null;
  nationality_code: string | null;
  nationality_name: string | null;
  nationality_raw: string | null;
  merged_into: string | null;
  created_by: string;
  created_at: Date;
};

const SELECT = `
  SELECT p.id,
         canonical_person_id(p.id) AS canonical_id,
         p.salutation::text AS salutation,
         p.first_name, p.last_name, p.birth_date,
         p.nationality_code, c.name_en AS nationality_name, p.nationality_raw,
         p.merged_into, p.created_by, p.created_at
    FROM people p
    LEFT JOIN countries c ON c.code = p.nationality_code
`;

const toSummary = (r: Row): PersonSummary => ({
  id: r.id,
  canonicalId: r.canonical_id,
  salutation: r.salutation,
  firstName: r.first_name,
  lastName: r.last_name,
  displayName: displayName(r.first_name, r.last_name),
  birthDate: r.birth_date,
  nationalityCode: r.nationality_code,
  nationalityName: r.nationality_name,
  nationalityRaw: r.nationality_raw,
  mergedInto: r.merged_into,
  createdBy: r.created_by,
  createdAt: r.created_at,
});

export async function getPersonSummary(id: string): Promise<PersonSummary | null> {
  const row = await queryFirst<Row>(`${SELECT} WHERE p.id = $1 AND p.deleted_at IS NULL`, [id]);
  return row ? toSummary(row) : null;
}

/** The canonical person for an id, with channels and anything linked into it. */
export async function getPerson(id: string): Promise<PersonDetail | null> {
  const row = await queryFirst<Row>(
    `${SELECT} WHERE p.id = canonical_person_id($1) AND p.deleted_at IS NULL`,
    [id]
  );
  if (!row) return null;

  // Channels come from the whole cluster: a duplicate that was linked may have
  // arrived with a second address, and that address is still this person's.
  const [emails, phones, dups] = await Promise.all([
    query<{ address: string; is_primary: boolean }>(
      `SELECT DISTINCT ON (e.normalized) e.address, e.is_primary
         FROM emails e
        WHERE canonical_person_id(e.person_id) = $1
        ORDER BY e.normalized, e.is_primary DESC, e.created_at`,
      [row.id]
    ),
    query<{ number: string; is_primary: boolean }>(
      `SELECT DISTINCT ON (ph.normalized) ph.number, ph.is_primary
         FROM phones ph
        WHERE canonical_person_id(ph.person_id) = $1
        ORDER BY ph.normalized, ph.is_primary DESC, ph.created_at`,
      [row.id]
    ),
    query<Row>(
      `${SELECT} WHERE p.id <> $1 AND canonical_person_id(p.id) = $1 ORDER BY p.created_at`,
      [row.id]
    ),
  ]);

  return {
    ...toSummary(row),
    emails: emails.map((e) => ({
      address: e.address,
      isPrimary: e.is_primary,
    })),
    phones: phones.map((p) => ({ number: p.number, isPrimary: p.is_primary })),
    linkedDuplicates: dups.map(toSummary),
  };
}

export async function listPeople({
  search,
  limit = 40,
  offset = 0,
}: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  items: (PersonSummary & { primaryEmail: string | null })[];
  total: number;
}> {
  const params: unknown[] = [];
  let where = `WHERE p.merged_into IS NULL AND p.deleted_at IS NULL`;
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (p.first_name ILIKE $1 OR p.last_name ILIKE $1 OR EXISTS (
      SELECT 1 FROM emails e WHERE e.person_id = p.id AND e.address ILIKE $1))`;
  }
  const total = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM people p ${where}`,
    params
  );
  const rows = await query<Row & { primary_email: string | null }>(
    `${SELECT.replace('FROM people p', `, (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS primary_email FROM people p`)}
     ${where}
     ORDER BY p.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return {
    total: Number(total?.n ?? 0),
    items: rows.map((r) => ({
      ...toSummary(r),
      primaryEmail: r.primary_email,
    })),
  };
}

export type TimelineItem = {
  kind: 'enquiry' | 'course' | 'exam' | 'review';
  id: string;
  title: string;
  detail: string | null;
  status: string | null;
  at: Date;
  href: string;
};

/** Everything that ever came in under this person or a row linked to them. */
export async function personTimeline(canonicalId: string): Promise<TimelineItem[]> {
  const rows = await query<{
    kind: TimelineItem['kind'];
    id: string;
    title: string;
    detail: string | null;
    status: string | null;
    at: Date;
  }>(
    `SELECT kind, id, title, detail, status, at FROM (
       SELECT 'enquiry'::text AS kind, e.id, e.topic AS title,
              left(e.message, 140) AS detail, e.status::text, e.submitted_at AS at
         FROM enquiries e WHERE canonical_person_id(e.person_id) = $1
       UNION ALL
       SELECT 'course', r.id, coalesce(r.course_type_label, 'Course registration'),
              r.course_instance_label, r.status::text, r.submitted_at
         FROM course_registrations r WHERE canonical_person_id(r.person_id) = $1
       UNION ALL
       SELECT 'exam', r.id, coalesce(r.exam_type_label, 'Exam registration'),
              r.exam_session_label, r.status::text, r.submitted_at
         FROM exam_registrations r WHERE canonical_person_id(r.person_id) = $1
       UNION ALL
       SELECT 'review', rv.attempt_id, 'Placement confirmed ' || rv.confirmed_level,
              rv.note, NULL, rv.decided_at
         FROM placement_reviews rv WHERE canonical_person_id(rv.person_id) = $1
     ) t ORDER BY at DESC`,
    [canonicalId]
  );
  const href: Record<TimelineItem['kind'], string> = {
    enquiry: '/admin/enquiries',
    course: '/admin/registrations/course',
    exam: '/admin/registrations/exam',
    review: '/admin/placement',
  };
  return rows.map((r) => ({ ...r, href: `${href[r.kind]}/${r.id}` }));
}

/**
 * Other canonical people who share an address, or a surname and date of birth,
 * with the given facts. What intake uses to decide whether to raise
 * `duplicate_candidate`, and what the record rail shows a staff member.
 */
export async function findDuplicateCandidates({
  email,
  lastName,
  birthDate,
  excludePersonId,
}: {
  email?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  excludePersonId?: string | null;
}): Promise<(PersonSummary & { reason: 'email' | 'name_and_birth_date' })[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (email) {
    params.push(email.trim().toLowerCase());
    conditions.push(
      `EXISTS (SELECT 1 FROM emails e WHERE canonical_person_id(e.person_id) = p.id AND e.normalized = $${params.length})`
    );
  }
  if (lastName && birthDate) {
    params.push(lastName.trim().toLowerCase(), birthDate);
    conditions.push(
      `(lower(p.last_name) = $${params.length - 1} AND p.birth_date = $${params.length}::date)`
    );
  }
  if (conditions.length === 0) return [];

  params.push(excludePersonId ?? '00000000-0000-0000-0000-000000000000');
  const rows = await query<Row & { by_email: boolean }>(
    `${SELECT.replace(
      'FROM people p',
      `, ${email ? `EXISTS (SELECT 1 FROM emails e WHERE canonical_person_id(e.person_id) = p.id AND e.normalized = $1)` : 'false'} AS by_email FROM people p`
    )}
     WHERE p.merged_into IS NULL AND p.deleted_at IS NULL
       AND p.id <> canonical_person_id($${params.length}::uuid)
       AND (${conditions.join(' OR ')})
     ORDER BY p.created_at
     LIMIT 10`,
    params
  );
  return rows.map((r) => ({
    ...toSummary(r),
    reason: r.by_email ? ('email' as const) : ('name_and_birth_date' as const),
  }));
}

/**
 * Records that `duplicate` is the same human as `survivor`.
 *
 * Sets `merged_into` and nothing else: no row is rewritten, no history is
 * moved. The one check that must never be skipped is the cycle — a survivor
 * whose own chain leads back to the duplicate would make both rows vanish from
 * every canonical read.
 */
export async function linkPerson({
  duplicateId,
  survivorId,
  actor,
}: {
  duplicateId: string;
  survivorId: string;
  actor: StaffUser;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (duplicateId === survivorId) return { ok: false, reason: 'That is the same record.' };

  return withTransaction(async (client) => {
    const { rows } = await client.query<{
      canonical: string;
      already: string | null;
    }>(
      `SELECT canonical_person_id($2) AS canonical, (SELECT merged_into FROM people WHERE id = $1) AS already`,
      [duplicateId, survivorId]
    );
    const canonical = rows[0]?.canonical;
    if (!canonical) return { ok: false, reason: 'The surviving record no longer exists.' };
    if (canonical === duplicateId) {
      return {
        ok: false,
        reason: 'Those two records already point at each other.',
      };
    }
    if (rows[0].already) return { ok: false, reason: 'This record is already linked.' };

    await client.query(`UPDATE people SET merged_into = $2 WHERE id = $1`, [
      duplicateId,
      canonical,
    ]);

    // The flags that asked the question are answered by this action.
    await client.query(
      `UPDATE record_flags f SET resolved_at = now(), resolved_by = $3
        WHERE f.code = 'duplicate_candidate' AND f.resolved_at IS NULL
          AND ((f.entity = 'person' AND f.entity_id = $1)
            OR (f.entity = 'enquiry' AND f.entity_id IN (SELECT id FROM enquiries WHERE person_id = $1))
            OR (f.entity = 'course_registration' AND f.entity_id IN (SELECT id FROM course_registrations WHERE person_id = $1))
            OR (f.entity = 'exam_registration' AND f.entity_id IN (SELECT id FROM exam_registrations WHERE person_id = $1)))`,
      [duplicateId, canonical, actor.id]
    );
    await client.query(
      `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action, detail)
       VALUES ($1, $2, 'person', $3, 'person_linked', $4)`,
      [actor.id, actor.name, duplicateId, JSON.stringify({ survivor: canonical })]
    );
    return { ok: true };
  });
}

/** Reverses a link. The rows were never merged, so there is nothing to split. */
export async function unlinkPerson({
  personId,
  actor,
}: {
  personId: string;
  actor: StaffUser;
}): Promise<void> {
  await query(`UPDATE people SET merged_into = NULL WHERE id = $1`, [personId]);
  await query(
    `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action)
     VALUES ($1, $2, 'person', $3, 'person_unlinked')`,
    [actor.id, actor.name, personId]
  );
}

/** Confirmed level from the newest placement review attached to this person. */
export async function latestConfirmedLevel(canonicalId: string): Promise<{
  level: string;
  decidedAt: Date;
  reviewerName: string | null;
} | null> {
  const row = await queryFirst<{
    level: string;
    decided_at: Date;
    reviewer: string | null;
  }>(
    `SELECT coalesce(rv.confirmed_level_code, rv.confirmed_level) AS level, rv.decided_at,
            u.name AS reviewer
       FROM placement_reviews rv
       LEFT JOIN staff_users u ON u.id = rv.reviewed_by
      WHERE canonical_person_id(rv.person_id) = $1
      ORDER BY rv.decided_at DESC LIMIT 1`,
    [canonicalId]
  );
  return row
    ? {
        level: row.level,
        decidedAt: row.decided_at,
        reviewerName: row.reviewer,
      }
    : null;
}

// ------------------------------------------------------------------- CRUD

export type PersonInput = {
  salutation: string | null;
  firstName: string;
  lastName: string | null;
  birthDate: string | null;
  nationality: string | null;
  email: string | null;
  phone: string | null;
};

export type Country = { code: string; nameEn: string };

export async function listCountries(): Promise<Country[]> {
  const rows = await query<{ code: string; name_en: string }>(
    `SELECT code, name_en FROM countries ORDER BY name_en`
  );
  return rows.map((r) => ({ code: r.code, nameEn: r.name_en }));
}

/**
 * A person created by a staff member. Typed values are resolved exactly as
 * intake resolves them; a nationality that does not match stays as written.
 */
export async function createPersonByStaff(input: PersonInput, actor: StaffUser): Promise<string> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO people (salutation, first_name, last_name, birth_date, nationality_code, nationality_raw, created_by)
       VALUES ($1::salutation, $2, $3, $4::date, $5, $6, $7)
       RETURNING id`,
      [
        input.salutation || null,
        input.firstName.trim(),
        input.lastName?.trim() || null,
        parseIsoDate(input.birthDate),
        countryCodeFromName(input.nationality),
        input.nationality?.trim() || null,
        `staff:${actor.id}`,
      ]
    );
    const id = rows[0].id;
    if (input.email?.trim()) {
      await client.query(
        `INSERT INTO emails (person_id, address, normalized) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [id, input.email.trim(), normalizeEmail(input.email)]
      );
    }
    if (input.phone?.trim()) {
      await client.query(
        `INSERT INTO phones (person_id, number, normalized) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [id, input.phone.trim(), normalizePhone(input.phone)]
      );
    }
    await client.query(
      `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action)
       VALUES ($1, $2, 'person', $3, 'person_created')`,
      [actor.id, actor.name, id]
    );
    return id;
  });
}

/**
 * Edits the person's own facts. Email and phone given here become the primary
 * channel; earlier ones are kept, since a registration may still carry them.
 */
export async function updatePerson(
  id: string,
  input: PersonInput,
  actor: StaffUser
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE people
          SET salutation = $2::salutation, first_name = $3, last_name = $4, birth_date = $5::date,
              nationality_code = $6, nationality_raw = $7
        WHERE id = $1 AND deleted_at IS NULL`,
      [
        id,
        input.salutation || null,
        input.firstName.trim(),
        input.lastName?.trim() || null,
        parseIsoDate(input.birthDate),
        countryCodeFromName(input.nationality),
        input.nationality?.trim() || null,
      ]
    );
    if (input.email?.trim()) {
      const normalized = normalizeEmail(input.email);
      await client.query(`UPDATE emails SET is_primary = false WHERE person_id = $1`, [id]);
      await client.query(
        `INSERT INTO emails (person_id, address, normalized, is_primary) VALUES ($1, $2, $3, true)
         ON CONFLICT (person_id, normalized) DO UPDATE SET address = EXCLUDED.address, is_primary = true`,
        [id, input.email.trim(), normalized]
      );
    }
    if (input.phone?.trim()) {
      const normalized = normalizePhone(input.phone);
      await client.query(`UPDATE phones SET is_primary = false WHERE person_id = $1`, [id]);
      await client.query(
        `INSERT INTO phones (person_id, number, normalized, is_primary) VALUES ($1, $2, $3, true)
         ON CONFLICT (person_id, normalized) DO UPDATE SET number = EXCLUDED.number, is_primary = true`,
        [id, input.phone.trim(), normalized]
      );
    }
  });
  await logActivity({ actor, entity: 'person', entityId: id, action: 'person_updated' });
}

/**
 * Soft delete. The row and everything that points at it stay; every read
 * filters it out. Refused while other rows are linked into this one — unlink
 * them first, so no history vanishes by accident.
 */
export async function deletePerson(
  id: string,
  actor: StaffUser
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const linked = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM people WHERE merged_into = $1`,
    [id]
  );
  if (Number(linked?.n ?? 0) > 0) {
    return { ok: false, reason: 'Other records are linked to this person. Unlink them first.' };
  }
  await query(
    `UPDATE people SET deleted_at = now(), deleted_by = $2 WHERE id = $1 AND deleted_at IS NULL`,
    [id, actor.id]
  );
  await logActivity({ actor, entity: 'person', entityId: id, action: 'person_deleted' });
  return { ok: true };
}
