import 'server-only';

import { query } from './db';
import { judgeMatch, STRENGTH_RANK, type MatchFacts, type MatchJudgement } from './person-match-rules';
import { foldSearch, searchTokens } from './search-query';

/**
 * Who at CASA a registration may be (2026-10-31): the people on the register — SchoolMan's learners
 * come across with the sync — and earlier website contacts, found by address, phone, birth date or a
 * name written any way, then judged field by field (`person-match-rules.ts`). What the team did by hand
 * in FileMaker — search the first and last name, look whether they studied here — done in the
 * background; the Anmeldung shows the result and the side panel the comparison.
 */

export type PersonCandidate = {
  /** The canonical person. */
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  emails: string[];
  phones: string[];
  nationality: string | null;
  customerNumber: string | null;
  /** On the register (Teilnehmende); else an earlier website contact nobody took on. */
  listed: boolean;
  /** Came across from SchoolMan. */
  fromSchoolman: boolean;
  bookings: number;
  /** The first day of their first course here. */
  since: string | null;
  /** Their course now, else the next, else the last. */
  course: { name: string; start: string; end: string } | null;
  judgement: MatchJudgement;
};

const NONE = '00000000-0000-0000-0000-000000000000';
const digitsOf = (phone: string) => phone.replace(/\D/g, '').slice(-9);

/**
 * The candidates for what was sent, the surest first. With `text` a colleague's own search („Lena
 * Mül", an address, a phone or customer number): every hit, judged against what was sent; without, the
 * ones the rule thinks worth a look. `include` adds people found another way (a SchoolMan booking).
 */
export async function personCandidates(
  sent: MatchFacts,
  { excludeId = null, include = [], text = null, limit = 6 }: { excludeId?: string | null; include?: readonly string[]; text?: string | null; limit?: number } = {}
): Promise<PersonCandidate[]> {
  const first = searchTokens(sent.firstName)[0] ?? '';
  const last = searchTokens(sent.lastName)[0] ?? '';
  const emails = sent.emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
  const locals = emails.map((e) => e.split('@')[0]).filter((l) => l.length >= 5);
  const phones = sent.phones.map(digitsOf).filter((p) => p.length >= 7);
  const typed = text?.trim() ? text.trim().slice(0, 80) : null;
  const tokens = typed ? searchTokens(typed) : [];
  const typedDigits = typed && /^[\d\s+()/.-]{6,}$/.test(typed) ? typed.replace(/\D/g, '').slice(-9) : null;

  const hits = await query<{ id: string }>(
    `WITH contact AS (
       -- An agency's address, or one several people share, says nothing about who someone is (0114).
       SELECT canonical_person_id(e.person_id) AS id FROM emails e
        WHERE (e.normalized = ANY($1::text[]) OR split_part(e.normalized, '@', 1) = ANY($2::text[])
                OR ($9::text IS NOT NULL AND strpos(e.normalized, lower($9)) > 0))
          AND ($9::text IS NOT NULL OR (e.kind <> 'agency' AND email_tier(e.normalized) = 0))
       UNION
       SELECT canonical_person_id(x.person_id) FROM phones x
        WHERE right(regexp_replace(x.normalized, '\\D', '', 'g'), 9) = ANY($3::text[])
           OR ($10::text IS NOT NULL AND strpos(regexp_replace(x.normalized, '\\D', '', 'g'), $10) > 0)
     )
     SELECT p.id FROM people p
      WHERE p.merged_into IS NULL AND p.deleted_at IS NULL
        AND p.id <> canonical_person_id(coalesce($6::uuid, '${NONE}'::uuid))
        AND NOT EXISTS (SELECT 1 FROM staff_members sm WHERE sm.person_id = p.id)
        AND (p.id = ANY($7::uuid[]) OR p.id IN (SELECT id FROM contact)
             OR (cardinality($8::text[]) > 0
                 AND NOT EXISTS (SELECT 1 FROM unnest($8::text[]) w WHERE strpos(p.search_name || ' ' || coalesce(p.customer_number, ''), w) = 0))
             OR (cardinality($8::text[]) = 0 AND length($4) >= 2 AND length($5) >= 2 AND (
                   -- The surname and the start of the first name; the first name and the start of the surname
                   -- (a typo in either); either start and the birthday.
                   (strpos(p.search_name, $5) > 0 AND strpos(p.search_name, left($4, 2)) > 0)
                OR (strpos(p.search_name, $4) > 0 AND strpos(p.search_name, left($5, 3)) > 0)
                OR (p.birth_date = $11::date AND (strpos(p.search_name, left($4, 3)) > 0 OR strpos(p.search_name, left($5, 3)) > 0)))))
      ORDER BY p.listed DESC, p.updated_at DESC
      LIMIT 60`,
    [typed ? [] : emails, typed ? [] : locals, typed ? [] : phones, foldSearch(first), foldSearch(last), excludeId, typed ? [] : [...include], tokens, typed?.includes('@') ? typed : null, typedDigits, sent.birthDate]
  );
  const candidates = await describePeople(
    hits.map((h) => h.id),
    sent
  );

  const wanted = new Set(include);
  return candidates
    .filter((c) => typed || c.judgement.strength || wanted.has(c.id))
    .sort(
      (a, b) =>
        (a.judgement.strength ? STRENGTH_RANK[a.judgement.strength] : 3) - (b.judgement.strength ? STRENGTH_RANK[b.judgement.strength] : 3) ||
        b.judgement.score - a.judgement.score ||
        Number(b.listed) - Number(a.listed)
    )
    .slice(0, limit);
}

/** The people with these ids as the panel shows them, each judged against what was sent. */
export async function describePeople(ids: readonly string[], sent: MatchFacts): Promise<PersonCandidate[]> {
  if (!ids.length) return [];
  const rows = await query<{
    id: string;
    first_name: string;
    last_name: string | null;
    second_last_name: string | null;
    nickname: string | null;
    birth_date: string | null;
    nationality_code: string | null;
    nationality: string | null;
    customer_number: string | null;
    listed: boolean;
    created_by: string | null;
    emails: string[] | null;
    phones: string[] | null;
    bookings: number;
    since: string | null;
    type_name: string | null;
    level_code: string | null;
    start_date: string | null;
    end_date: string | null;
  }>(
    `SELECT p.id, p.first_name, p.last_name, p.second_last_name, p.nickname, to_char(p.birth_date, 'YYYY-MM-DD') AS birth_date,
            p.nationality_code, coalesce(c.name_de, c.name_en) AS nationality, p.customer_number, p.listed, p.created_by,
            (SELECT array_agg(DISTINCT e.normalized) FROM emails e WHERE e.person_id = ANY(person_family(p.id)) AND e.kind <> 'agency' AND email_tier(e.normalized) = 0) AS emails,
            (SELECT array_agg(DISTINCT x.number) FROM phones x WHERE x.person_id = ANY(person_family(p.id))) AS phones,
            coalesce(bk.n, 0)::int AS bookings, to_char(bk.since, 'YYYY-MM-DD') AS since,
            cur.type_name, cur.level_code, to_char(cur.start_date, 'YYYY-MM-DD') AS start_date, to_char(cur.end_date, 'YYYY-MM-DD') AS end_date
       FROM people p
       LEFT JOIN countries c ON c.code = p.nationality_code
       LEFT JOIN LATERAL (
         SELECT count(DISTINCT b.id) AS n, min(bp.start_date) FILTER (WHERE bp.start_date <= current_date) AS since
           FROM bookings b LEFT JOIN booking_periods bp ON bp.booking_id = b.id
          WHERE b.person_id = ANY(person_family(p.id)) AND b.deleted_at IS NULL AND b.status <> 'cancelled'
       ) bk ON true
       LEFT JOIN LATERAL (
         SELECT coalesce(nullif(trim(t.name_de), ''), t.name) AS type_name, bp.level_code, bp.start_date, bp.end_date
           FROM bookings b JOIN booking_periods bp ON bp.booking_id = b.id LEFT JOIN course_types t ON t.id = b.course_type_id
          WHERE b.person_id = ANY(person_family(p.id)) AND b.deleted_at IS NULL AND b.status <> 'cancelled'
          ORDER BY bp.end_date < current_date, CASE WHEN bp.end_date >= current_date THEN bp.start_date END, bp.end_date DESC
          LIMIT 1
       ) cur ON true
      WHERE p.id = ANY($1::uuid[])`,
    [[...ids]]
  );
  return rows.map((r) => ({
    id: r.id,
    name: [r.first_name, r.last_name].filter(Boolean).join(' '),
    firstName: r.first_name,
    lastName: r.last_name ?? '',
    birthDate: r.birth_date,
    emails: r.emails ?? [],
    phones: r.phones ?? [],
    nationality: r.nationality,
    customerNumber: r.customer_number,
    listed: r.listed,
    fromSchoolman: r.created_by === 'migration-schoolman',
    bookings: r.bookings,
    since: r.since,
    course: r.end_date && r.start_date ? { name: [r.type_name, r.level_code].filter(Boolean).join(' '), start: r.start_date, end: r.end_date } : null,
    judgement: judgeMatch(sent, {
      firstName: r.first_name,
      lastName: r.last_name ?? '',
      birthDate: r.birth_date,
      emails: r.emails ?? [],
      phones: r.phones ?? [],
      nationalityCode: r.nationality_code,
      otherNames: [r.second_last_name, r.nickname],
    }),
  }));
}
