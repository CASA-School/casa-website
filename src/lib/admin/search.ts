import 'server-only';

import type { WorkspaceModule } from './access';
import { BOOKING_STATUS_LABELS, type BookingStatus } from './bookings';
import { query } from './db';
import { SESSION_LABELS, type Session } from './day-plan-labels';
import { GROUP_STATUS_LABELS, type GroupStatus } from './group-labels';
import { dayRange, num, pick, wsLocale, type T, type WsLang } from './i18n';
import { ACCOMMODATION_KIND_LABELS, type AccommodationKind } from './accommodation-labels';
import { LETTER_KIND_LABELS } from './letters/booking-letters';
import { letterModule } from './letters/module';
import { LETTER_KINDS, type LetterKind } from './letters/types';
import { OFFER_STATUS_LABELS, type OfferStatus } from './offers/types';
import { ORGANISATION_KIND_LABELS, type OrganisationKind } from './organisation-labels';
import { recordHref } from './record-href';
import { foldSearch, isIdentifier, parseQuery, rankGroups, scoreCandidate, type Candidate, type IdMatch, type ParsedQuery } from './search-query';

/**
 * The workspace's search (⌘K in the top bar, 2026-10-18; made forgiving and ranked 2026-10-27).
 *
 * One box for every record a colleague works with: learners (by name, address, phone, SchoolMan
 * customer number, birth date), bookings (by number, or by the learner with the course: „Schmidt B1"),
 * courses (by level, month, type or SchoolMan number: „B1.1 Oktober", „4982"), exam sittings, staff,
 * organisations (also through a contact person), group visits, offers (by number), places to stay,
 * rooms, letters (a kind with a name: „Zahlungserinnerung Schmidt"), and the inbox's enquiries,
 * registrations and job applications.
 *
 * How it matches and ranks is `search-query.ts`; the text on the records' side is folded by the
 * database's `ws_fold` (migration 0091), stored for the two large tables (people, letters). A module
 * the colleague does not hold is not searched at all: the caller passes `holds`, and a letter is
 * searched only in the kinds whose module the colleague holds.
 *
 * A colleague is a person too (0039), but not a student: they are found under „Mitarbeitende" and
 * open on their staff page, never among the learners.
 */

export type SearchKind =
  | 'person'
  | 'booking'
  | 'course'
  | 'exam'
  | 'staff'
  | 'organisation'
  | 'group'
  | 'offer'
  | 'place'
  | 'room'
  | 'enquiry'
  | 'registration'
  | 'application'
  | 'letter';

/** The order of the groups when two are equally good, and of the palette's labels. */
export const SEARCH_KINDS: readonly SearchKind[] = [
  'person',
  'booking',
  'course',
  'exam',
  'staff',
  'organisation',
  'group',
  'offer',
  'place',
  'room',
  'enquiry',
  'registration',
  'application',
  'letter',
];

export type SearchHit = { kind: SearchKind; id: string; title: string; detail: string; href: string; score: number };
export type SearchGroup = { kind: SearchKind; hits: SearchHit[] };

/** What a reader is asked for: what was typed, or the records opened last (by id). */
type Ask = { q: ParsedQuery } | { ids: string[] };
type Ctx = { t: T; lang: WsLang; today: string; holds: (module: WorkspaceModule) => boolean };
type Found = SearchHit & { candidate: Candidate };

/** Candidates a reader hands on before ranking: the best by its own order, never all of them. */
const CANDIDATES = 20;

const MONTH_WORDS = [
  'januar january',
  'februar february',
  'marz march',
  'april',
  'mai may',
  'juni june',
  'juli july',
  'august',
  'september',
  'oktober october',
  'november',
  'dezember december',
].map(foldSearch);

/** Every word of `$tokens` is somewhere in `hay`. */
const allWords = (hay: string, tokens: string) => `NOT EXISTS (SELECT 1 FROM unnest(${tokens}::text[]) w WHERE strpos(${hay}, w) = 0)`;
/** At least one word of `$tokens` is in `hay`. */
const someWord = (hay: string, tokens: string) => `EXISTS (SELECT 1 FROM unnest(${tokens}::text[]) w WHERE strpos(${hay}, w) > 0)`;
/**
 * The text match, or the records asked for by id. Both are always in the SQL, so every parameter is
 * typed in either mode; asked by id the words are empty and the identifiers null, so the match is false.
 */
const either = (match: string, ids: string) => `((${match}) OR ${ids})`;
/** How many of the words start a word of `hay`: the rough order before ranking. */
const wordStarts = (hay: string, tokens: string) => `(SELECT count(*) FROM unnest(${tokens}::text[]) w WHERE strpos(' ' || ${hay}, ' ' || w) > 0)`;

const name = (first: string | null, last: string | null) => [first, last].filter(Boolean).join(' ');
const dateOf = (iso: string | null, lang: WsLang) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(wsLocale(lang), { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(' · ');
const sessionLabel = (session: string | null, lang: WsLang) => (session && session in SESSION_LABELS ? pick(lang, SESSION_LABELS[session as Session]) : null);

/** A learner: their course now, the next one, or the last — what tells two people of the same name apart. */
async function people(ask: Ask, { t, lang, today }: Ctx): Promise<Found[]> {
  const q = 'q' in ask ? ask.q : null;
  const rows = await query<{
    id: string;
    first_name: string;
    last_name: string | null;
    name: string;
    id_match: IdMatch;
    matched: 'customer' | 'born' | 'email' | 'phone' | null;
    customer_number: string | null;
    born: string | null;
    email: string | null;
    phone: string | null;
    type_name: string | null;
    level_code: string | null;
    start_date: string | null;
    end_date: string | null;
    updated: string;
  }>(
    `WITH mail AS (SELECT person_id, string_agg(normalized, ' ') AS mails FROM emails GROUP BY person_id),
          tel AS (SELECT person_id, string_agg(replace(normalized, '+', ''), ' ') AS tels FROM phones GROUP BY person_id),
          hit AS MATERIALIZED (
            SELECT p.id, p.search_name, p.updated_at,
                   CASE WHEN p.customer_number = $5 THEN 'customer'
                        WHEN p.birth_date = $6::date THEN 'born'
                        WHEN $3::text IS NOT NULL AND strpos(m.mails, $3) > 0 THEN 'email'
                        WHEN EXISTS (SELECT 1 FROM unnest($4::text[]) n WHERE strpos(ph.tels, n) > 0) THEN 'phone' END AS matched,
                   CASE WHEN p.customer_number = $5 OR p.birth_date = $6::date
                          OR ($3::text IS NOT NULL AND strpos(' ' || m.mails || ' ', ' ' || $3 || ' ') > 0)
                          OR EXISTS (SELECT 1 FROM unnest($4::text[]) n WHERE length(n) >= 7 AND strpos(ph.tels, n) > 0) THEN 'exact'
                        WHEN ($3::text IS NOT NULL AND strpos(m.mails, $3) > 0)
                          OR EXISTS (SELECT 1 FROM unnest($4::text[]) n WHERE strpos(ph.tels, n) > 0) THEN 'prefix' END AS id_match,
                   ${wordStarts('p.search_name', '$1')} AS starts
              FROM people p
              LEFT JOIN mail m ON m.person_id = p.id
              LEFT JOIN tel ph ON ph.person_id = p.id
             WHERE p.deleted_at IS NULL AND p.merged_into IS NULL AND p.listed
               AND NOT EXISTS (SELECT 1 FROM staff_members sm WHERE sm.person_id = p.id)
               AND ${either(
                 `(cardinality($1::text[]) > 0 AND ${allWords(`p.search_name || ' ' || coalesce(m.mails, '')`, '$1')})
                  OR p.customer_number = $5 OR p.birth_date = $6::date
                  OR ($3::text IS NOT NULL AND strpos(m.mails, $3) > 0)
                  OR EXISTS (SELECT 1 FROM unnest($4::text[]) n WHERE strpos(ph.tels, n) > 0)`,
                 `p.id = ANY($7::uuid[])`
               )}
          )
     SELECT h.id, p.first_name, p.last_name, h.search_name AS name, h.id_match, h.matched, p.customer_number,
            to_char(p.birth_date, 'YYYY-MM-DD') AS born,
            (SELECT e.address FROM emails e WHERE e.person_id = h.id
              ORDER BY ($3::text IS NOT NULL AND strpos(e.normalized, $3) > 0) DESC, e.is_primary DESC LIMIT 1) AS email,
            (SELECT x.number FROM phones x WHERE x.person_id = h.id
                AND EXISTS (SELECT 1 FROM unnest($4::text[]) n WHERE strpos(replace(x.normalized, '+', ''), n) > 0) LIMIT 1) AS phone,
            c.type_name, c.level_code, to_char(c.start_date, 'YYYY-MM-DD') AS start_date, to_char(c.end_date, 'YYYY-MM-DD') AS end_date,
            to_char(h.updated_at, 'YYYY-MM-DD') AS updated
       FROM hit h JOIN people p ON p.id = h.id
       LEFT JOIN LATERAL (
         SELECT coalesce(nullif(trim(t.name_de), ''), t.name) AS type_name, bp.level_code, bp.start_date, bp.end_date
           FROM bookings b JOIN booking_periods bp ON bp.booking_id = b.id LEFT JOIN course_types t ON t.id = b.course_type_id
          WHERE b.person_id = h.id AND b.deleted_at IS NULL AND b.status <> 'cancelled'
          ORDER BY bp.end_date < $2::date, CASE WHEN bp.end_date >= $2::date THEN bp.start_date END, bp.end_date DESC
          LIMIT 1) c ON true
      ORDER BY h.id_match = 'exact' DESC NULLS LAST, h.id_match IS NOT NULL DESC, h.starts DESC,
               (c.end_date >= $2::date) DESC NULLS LAST, c.end_date DESC NULLS LAST, h.updated_at DESC
      LIMIT ${CANDIDATES}`,
    [q?.tokens ?? [], today, q?.email ?? null, q?.phone ?? [], q?.number ?? null, q?.date ?? null, 'ids' in ask ? ask.ids : []]
  );
  return rows.map((r) => {
    const live = !!r.end_date && r.end_date >= today;
    const course = [r.type_name, r.level_code].filter(Boolean).join(' ');
    const context = !r.end_date
      ? null
      : live
        ? r.start_date && r.start_date <= today
          ? t(`${course} · bis ${dayRange(r.end_date, r.end_date, lang)}`, `${course} · until ${dayRange(r.end_date, r.end_date, lang)}`)
          : t(`${course} · ab ${dayRange(r.start_date!, r.start_date!, lang)}`, `${course} · from ${dayRange(r.start_date!, r.start_date!, lang)}`)
        : t(`Zuletzt ${r.level_code ?? r.type_name} · ${r.end_date.slice(0, 4)}`, `Last ${r.level_code ?? r.type_name} · ${r.end_date.slice(0, 4)}`);
    // What was matched shows, so a colleague sees why this person is here.
    const matched =
      r.matched === 'customer'
        ? t(`Kd.-Nr. ${r.customer_number}`, `Customer no. ${r.customer_number}`)
        : r.matched === 'born'
          ? t(`geb. ${dateOf(r.born, lang)}`, `born ${dateOf(r.born, lang)}`)
          : r.matched === 'phone'
            ? r.phone
            : r.matched === 'email' || !context
              ? r.email
              : null;
    return {
      kind: 'person' as const,
      id: r.id,
      title: name(r.first_name, r.last_name),
      detail: join(matched, context) || t('Teilnehmende', 'Student'),
      href: recordHref('person', r.id),
      score: 0,
      candidate: { name: r.name, idMatch: r.id_match, live, at: r.end_date ?? r.updated },
    };
  });
}

async function staff(ask: Ask, { t }: Ctx): Promise<Found[]> {
  const q = 'q' in ask ? ask.q : null;
  const rows = await query<{
    id: string;
    first_name: string;
    last_name: string | null;
    short_name: string | null;
    is_active: boolean;
    name: string;
    id_match: IdMatch;
    roles: string[] | null;
    roles_de: string[] | null;
  }>(
    `SELECT s.id, p.first_name, p.last_name, s.short_name, s.is_active, p.search_name || ' ' || ws_fold(coalesce(s.short_name, '')) AS name,
            CASE WHEN $2::text IS NOT NULL AND strpos(' ' || m.mails || ' ', ' ' || $2 || ' ') > 0 THEN 'exact' END AS id_match,
            (SELECT array_agg(sr.name_en ORDER BY sr.position) FROM staff_member_roles r JOIN staff_roles sr ON sr.code = r.role_code WHERE r.staff_member_id = s.id) AS roles,
            (SELECT array_agg(sr.name_de ORDER BY sr.position) FROM staff_member_roles r JOIN staff_roles sr ON sr.code = r.role_code WHERE r.staff_member_id = s.id) AS roles_de
       FROM staff_members s JOIN people p ON p.id = s.person_id
       LEFT JOIN LATERAL (SELECT string_agg(e.normalized, ' ') AS mails FROM emails e WHERE e.person_id = p.id) m ON true
      WHERE ${either(
        `(cardinality($1::text[]) > 0 AND ${allWords(`p.search_name || ' ' || ws_fold(coalesce(s.short_name, '')) || ' ' || coalesce(m.mails, '')`, '$1')})
         OR ($2::text IS NOT NULL AND strpos(m.mails, $2) > 0)`,
        `s.id = ANY($3::uuid[])`
      )}
      ORDER BY s.is_active DESC, p.last_name NULLS LAST, p.first_name
      LIMIT ${CANDIDATES}`,
    [q?.tokens ?? [], q?.email ?? null, 'ids' in ask ? ask.ids : []]
  );
  return rows.map((r) => ({
    kind: 'staff' as const,
    id: r.id,
    title: name(r.first_name, r.last_name),
    detail: join(r.is_active ? null : t('Ehemalig', 'Former'), t((r.roles_de ?? []).slice(0, 2).join(' · '), (r.roles ?? []).slice(0, 2).join(' · ')), r.short_name),
    href: recordHref('staff', r.id),
    score: 0,
    candidate: { name: r.name, idMatch: r.id_match, live: r.is_active },
  }));
}

/** A booking: by its number, or by its learner — with the course or the exam, the dates, the status. */
async function bookings(ask: Ask, { lang, today }: Ctx): Promise<Found[]> {
  const q = 'q' in ask ? ask.q : null;
  const rows = await query<{
    id: string;
    number: string;
    status: BookingStatus;
    first_name: string;
    last_name: string | null;
    name: string;
    id_match: IdMatch;
    via: boolean;
    type_name: string | null;
    exam_name: string | null;
    levels: string | null;
    first_start: string | null;
    last_end: string | null;
    updated: string;
  }>(
    `WITH who AS MATERIALIZED (
            -- A learner one of the words begins a name of: „okt" finds Öktem's bookings, not Göktürk's.
            SELECT id FROM people WHERE cardinality($1::text[]) > 0 AND ${wordStarts('search_name', '$1')} > 0
          ),
          hit AS MATERIALIZED (
            SELECT b.id, b.person_id, b.number, b.status, b.course_type_id, b.exam_session_id, b.updated_at,
                   CASE WHEN lower(b.number) = $2 THEN 'exact' WHEN $3::text IS NOT NULL AND lower(b.number) LIKE $3 || '%' THEN 'prefix' END AS id_match
              FROM bookings b
             WHERE b.deleted_at IS NULL
               AND ${either(
                 `lower(b.number) = $2 OR ($3::text IS NOT NULL AND lower(b.number) LIKE $3 || '%') OR b.person_id IN (SELECT id FROM who)`,
                 `b.id = ANY($5::uuid[])`
               )}
          )
     SELECT h.id, h.number, h.status::text AS status, p.first_name, p.last_name, p.search_name AS name, h.id_match,
            coalesce(nullif(trim(t.name_de), ''), t.name) AS type_name, et.name AS exam_name, per.levels,
            to_char(per.first_start, 'YYYY-MM-DD') AS first_start, to_char(per.last_end, 'YYYY-MM-DD') AS last_end,
            to_char(h.updated_at, 'YYYY-MM-DD') AS updated
       FROM hit h JOIN people p ON p.id = h.person_id
       LEFT JOIN course_types t ON t.id = h.course_type_id
       LEFT JOIN exam_sessions es ON es.id = h.exam_session_id
       LEFT JOIN exam_types et ON et.id = es.exam_type_id
       LEFT JOIN LATERAL (
         SELECT min(start_date) AS first_start, max(end_date) AS last_end, string_agg(DISTINCT level_code, ' ') AS levels
           FROM booking_periods WHERE booking_id = h.id) per ON true
      -- By the learner's name with the course's words („Schmidt B1"); no words (the ids, a number) passes.
      WHERE h.id_match IS NOT NULL
         OR ${allWords(
           `p.search_name || ' ' || ws_fold(coalesce(t.name_de, '') || ' ' || coalesce(t.name, '') || ' ' || coalesce(et.name, '')) || ' ' || lower(coalesce(per.levels, ''))`,
           '$1'
         )}
      ORDER BY h.id_match = 'exact' DESC NULLS LAST, h.id_match IS NOT NULL DESC, (per.last_end >= $4::date) DESC NULLS LAST,
               per.first_start DESC NULLS LAST, h.updated_at DESC
      LIMIT ${CANDIDATES}`,
    [q?.tokens ?? [], q?.booking.exact ?? null, q?.booking.prefix ?? null, today, 'ids' in ask ? ask.ids : []]
  );
  return rows.map((r) => ({
    kind: 'booking' as const,
    id: r.id,
    title: name(r.first_name, r.last_name),
    detail: join(
      r.number,
      r.exam_name ?? [r.type_name, r.levels].filter(Boolean).join(' '),
      r.first_start && r.last_end ? dayRange(r.first_start, r.last_end, lang) : null,
      pick(lang, BOOKING_STATUS_LABELS[r.status] ?? { de: r.status, en: r.status })
    ),
    href: recordHref('booking', r.id),
    score: 0,
    // Found by the learner's name, the booking sits under the learner; by its number, it leads.
    candidate: { name: r.name, idMatch: r.id_match, via: true, live: !!r.last_end && r.last_end >= today && r.status !== 'cancelled', at: r.first_start ?? r.updated },
  }));
}

/** A course — one level of a start — by level, month, year, type or SchoolMan's course number. */
async function courses(ask: Ask, { t, lang, today }: Ctx): Promise<Found[]> {
  const q = 'q' in ask ? ask.q : null;
  const rows = await query<{
    id: string;
    level_code: string | null;
    title: string | null;
    number: string | null;
    type_name: string;
    start_date: string;
    end_date: string;
    session: string | null;
    cancelled: boolean;
    hay: string;
    id_match: IdMatch;
  }>(
    `SELECT k.id, k.level_code, coalesce(k.title, i.title) AS title, k.filemaker_course_id AS number,
            coalesce(nullif(trim(t.name_de), ''), t.name) AS type_name,
            to_char(i.start_date, 'YYYY-MM-DD') AS start_date, to_char(i.end_date, 'YYYY-MM-DD') AS end_date,
            coalesce(k.session, i.session) AS session, (i.status = 'cancelled' OR k.status = 'cancelled') AS cancelled, h.hay,
            CASE WHEN $2::text IS NOT NULL AND ($2 = k.filemaker_course_id OR $2 = ANY(k.filemaker_group_ids)) THEN 'exact' END AS id_match
       FROM courses k
       JOIN course_instances i ON i.id = k.course_instance_id
       JOIN course_types t ON t.id = i.course_type_id
       CROSS JOIN LATERAL (
         SELECT ws_fold(concat_ws(' ', t.name_de, t.name, t.short_code, k.title, i.title, k.level_code, 'kurs course'))
                || ' ' || ($3::text[])[extract(month FROM i.start_date)::int] || ' ' || extract(year FROM i.start_date)::int
                || ' ' || coalesce(k.filemaker_course_id, '') AS hay) h
      WHERE ${either(
        `(cardinality($1::text[]) > 0 AND ${allWords('h.hay', '$1')}) OR ($2::text IS NOT NULL AND ($2 = k.filemaker_course_id OR $2 = ANY(k.filemaker_group_ids)))`,
        `k.id = ANY($5::uuid[])`
      )}
      ORDER BY ($2::text IS NOT NULL AND ($2 = k.filemaker_course_id OR $2 = ANY(k.filemaker_group_ids))) DESC,
               (i.end_date >= $4::date) DESC, CASE WHEN i.end_date >= $4::date THEN i.start_date END, i.start_date DESC
      LIMIT ${CANDIDATES}`,
    [q?.tokens ?? [], q?.number ?? null, MONTH_WORDS, today, 'ids' in ask ? ask.ids : []]
  );
  return rows.map((r) => ({
    kind: 'course' as const,
    id: r.id,
    title: join(`${r.type_name} ${r.level_code ?? r.title ?? ''}`.trim(), r.number),
    detail: join(r.cancelled ? t('Abgesagt', 'Cancelled') : null, dayRange(r.start_date, r.end_date, lang), sessionLabel(r.session, lang)),
    href: recordHref('course', r.id),
    score: 0,
    candidate: { name: r.hay, idMatch: r.id_match, live: !r.cancelled && r.end_date >= today, at: r.start_date },
  }));
}

/** A telc sitting: the exam, its day and time, and how full it is. */
async function exams(ask: Ask, { t, lang, today }: Ctx): Promise<Found[]> {
  const q = 'q' in ask ? ask.q : null;
  const rows = await query<{ id: string; exam: string; day: string; time: string; status: string; capacity: number | null; booked: string; hay: string }>(
    `SELECT s.id, e.name AS exam, to_char(s.starts_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD') AS day,
            to_char(s.starts_at AT TIME ZONE 'Europe/Berlin', 'HH24:MI') AS time, s.status, s.capacity,
            (SELECT count(*) FROM bookings b WHERE b.exam_session_id = s.id AND b.deleted_at IS NULL AND b.status <> 'cancelled') AS booked, h.hay
       FROM exam_sessions s JOIN exam_types e ON e.id = s.exam_type_id
       CROSS JOIN LATERAL (
         SELECT ws_fold(concat_ws(' ', e.name, e.short_code, e.level, e.code, 'prufung exam'))
                || ' ' || ($2::text[])[extract(month FROM s.starts_at AT TIME ZONE 'Europe/Berlin')::int]
                || ' ' || extract(year FROM s.starts_at AT TIME ZONE 'Europe/Berlin')::int AS hay) h
      WHERE ${either(`cardinality($1::text[]) > 0 AND ${allWords('h.hay', '$1')}`, `s.id = ANY($4::uuid[])`)}
      ORDER BY (s.starts_at::date >= $3::date) DESC, CASE WHEN s.starts_at::date >= $3::date THEN s.starts_at END, s.starts_at DESC
      LIMIT ${CANDIDATES}`,
    [q?.tokens ?? [], MONTH_WORDS, today, 'ids' in ask ? ask.ids : []]
  );
  return rows.map((r) => ({
    kind: 'exam' as const,
    id: r.id,
    title: r.exam,
    detail: join(
      r.status === 'cancelled' ? t('Abgesagt', 'Cancelled') : null,
      dateOf(r.day, lang),
      r.time,
      r.capacity ? t(`${num(lang, Number(r.booked))} von ${num(lang, r.capacity)}`, `${num(lang, Number(r.booked))} of ${num(lang, r.capacity)}`) : null
    ),
    href: recordHref('exam', r.id),
    score: 0,
    candidate: { name: r.hay, idMatch: null, live: r.day >= today && r.status !== 'cancelled', at: r.day },
  }));
}

async function organisations(ask: Ask, { t, lang }: Ctx): Promise<Found[]> {
  const q = 'q' in ask ? ask.q : null;
  const rows = await query<{ id: string; name: string; kind: OrganisationKind; is_active: boolean; folded: string; contact: string | null; id_match: IdMatch }>(
    `SELECT o.id, o.name, o.kind, o.is_active, ws_fold(o.name) AS folded, c.contact,
            CASE WHEN $2::text IS NOT NULL AND (lower(o.email) = $2 OR c.email = $2) THEN 'exact'
                 WHEN $2::text IS NOT NULL AND (strpos(lower(coalesce(o.email, '')), $2) > 0 OR strpos(coalesce(c.email, ''), $2) > 0) THEN 'prefix' END AS id_match
       FROM organisations o
       LEFT JOIN LATERAL (
         SELECT nullif(btrim(concat_ws(' ', c.first_name, c.last_name)), '') AS contact, lower(c.email) AS email
           FROM organisation_contacts c
          WHERE c.organisation_id = o.id
            AND ((cardinality($1::text[]) > 0 AND ${allWords(`ws_fold(concat_ws(' ', c.first_name, c.last_name, c.email))`, '$1')})
                 OR ($2::text IS NOT NULL AND strpos(lower(coalesce(c.email, '')), $2) > 0))
          LIMIT 1) c ON true
      WHERE ${either(
        `(cardinality($1::text[]) > 0 AND ${allWords(`ws_fold(concat_ws(' ', o.name, o.email))`, '$1')}) OR c.contact IS NOT NULL OR c.email IS NOT NULL
         OR ($2::text IS NOT NULL AND strpos(lower(coalesce(o.email, '')), $2) > 0)`,
        `o.id = ANY($3::uuid[])`
      )}
      ORDER BY o.is_active DESC, lower(o.name)
      LIMIT ${CANDIDATES}`,
    [q?.tokens ?? [], q?.email ?? null, 'ids' in ask ? ask.ids : []]
  );
  const tokens = q?.tokens ?? [];
  return rows.map((r) => {
    // Found through a contact person when the name alone would not have been.
    const via = !!r.contact && !tokens.every((w) => r.folded.includes(w));
    return {
      kind: 'organisation' as const,
      id: r.id,
      title: r.name,
      detail: join(pick(lang, ORGANISATION_KIND_LABELS[r.kind] ?? ORGANISATION_KIND_LABELS.other), via ? r.contact : null, r.is_active ? null : t('inaktiv', 'inactive')),
      href: recordHref('organisation', r.id),
      score: 0,
      candidate: { name: r.folded, idMatch: r.id_match, via, live: r.is_active },
    };
  });
}

async function groups(ask: Ask, { lang, today }: Ctx): Promise<Found[]> {
  const q = 'q' in ask ? ask.q : null;
  const rows = await query<{
    id: string;
    name: string;
    folded: string;
    status: GroupStatus;
    organisation: string | null;
    arrival: string | null;
    departure: string | null;
    participants: number | null;
    via: boolean;
  }>(
    `SELECT v.id, v.name, ws_fold(v.name) AS folded, v.status, coalesce(o.name, a.name) AS organisation,
            to_char(coalesce(v.arrival, v.course_from), 'YYYY-MM-DD') AS arrival, to_char(coalesce(v.departure, v.course_to), 'YYYY-MM-DD') AS departure,
            v.participants, NOT (${allWords('ws_fold(v.name)', '$1')}) AS via
       FROM group_visits v LEFT JOIN organisations o ON o.id = v.organisation_id LEFT JOIN organisations a ON a.id = v.agency_id
      WHERE ${either(`cardinality($1::text[]) > 0 AND ${allWords(`ws_fold(concat_ws(' ', v.name, o.name, a.name))`, '$1')}`, `v.id = ANY($3::uuid[])`)}
      ORDER BY (coalesce(v.departure, v.course_to) >= $2::date) DESC NULLS LAST, coalesce(v.arrival, v.course_from) DESC NULLS LAST
      LIMIT ${CANDIDATES}`,
    [q?.tokens ?? [], today, 'ids' in ask ? ask.ids : []]
  );
  return rows.map((r) => ({
    kind: 'group' as const,
    id: r.id,
    title: r.name,
    detail: join(
      r.organisation !== r.name ? r.organisation : null,
      r.arrival && r.departure ? dayRange(r.arrival, r.departure, lang) : null,
      r.status === 'confirmed' ? null : pick(lang, GROUP_STATUS_LABELS[r.status] ?? GROUP_STATUS_LABELS.open)
    ),
    href: recordHref('group', r.id),
    score: 0,
    candidate: { name: r.folded, idMatch: null, via: q ? r.via : false, live: !!r.departure && r.departure >= today && r.status !== 'cancelled', at: r.arrival },
  }));
}

async function offers(ask: Ask, { lang }: Ctx): Promise<Found[]> {
  const q = 'q' in ask ? ask.q : null;
  const rows = await query<{
    id: string;
    number: string;
    title: string;
    heading: string;
    folded: string;
    status: OfferStatus;
    arrival: string | null;
    departure: string | null;
    updated: string;
    id_match: IdMatch;
  }>(
    `SELECT o.id, o.year || '-' || lpad(o.seq::text, 3, '0') AS number, o.title, coalesce(nullif(o.group_name, ''), o.recipient_name) AS heading,
            ws_fold(coalesce(nullif(o.group_name, ''), o.recipient_name)) AS folded, o.status,
            to_char(o.arrival, 'YYYY-MM-DD') AS arrival, to_char(o.departure, 'YYYY-MM-DD') AS departure, to_char(o.updated_at, 'YYYY-MM-DD') AS updated,
            CASE WHEN o.year || '-' || lpad(o.seq::text, 3, '0') = $2 OR lower(o.contact_email) = $3 THEN 'exact'
                 WHEN $3::text IS NOT NULL AND strpos(lower(coalesce(o.contact_email, '')), $3) > 0 THEN 'prefix' END AS id_match
       FROM offers o
      WHERE o.deleted_at IS NULL
        AND ${either(
          `(cardinality($1::text[]) > 0
            AND ${allWords(`ws_fold(concat_ws(' ', o.recipient_name, o.group_name, o.title, o.contact_first_name, o.contact_last_name, o.contact_email))`, '$1')})
           OR o.year || '-' || lpad(o.seq::text, 3, '0') = $2
           OR ($3::text IS NOT NULL AND strpos(lower(coalesce(o.contact_email, '')), $3) > 0)`,
          `o.id = ANY($4::uuid[])`
        )}
      ORDER BY o.status IN ('draft', 'sent') DESC, o.updated_at DESC
      LIMIT ${CANDIDATES}`,
    [q?.tokens ?? [], q?.offer ?? null, q?.email ?? null, 'ids' in ask ? ask.ids : []]
  );
  return rows.map((r) => ({
    kind: 'offer' as const,
    id: r.id,
    title: r.heading,
    detail: join(r.number, pick(lang, OFFER_STATUS_LABELS[r.status] ?? OFFER_STATUS_LABELS.draft), r.arrival && r.departure ? dayRange(r.arrival, r.departure, lang) : r.title),
    href: recordHref('offer', r.id),
    score: 0,
    candidate: { name: r.folded, idMatch: r.id_match, live: r.status === 'draft' || r.status === 'sent', at: r.arrival ?? r.updated },
  }));
}

async function places(ask: Ask, { t, lang }: Ctx): Promise<Found[]> {
  const q = 'q' in ask ? ask.q : null;
  const rows = await query<{ id: string; name: string; folded: string; kind: AccommodationKind; contact_name: string | null; is_active: boolean; via: boolean }>(
    `SELECT a.id, a.name, ws_fold(a.name) AS folded, a.kind, a.contact_name, a.is_active,
            NOT (${allWords(`ws_fold(concat_ws(' ', a.name, a.contact_name))`, '$1')}) AS via
       FROM accommodations a
      WHERE ${either(
        `cardinality($1::text[]) > 0
         AND (${allWords(`ws_fold(concat_ws(' ', a.name, a.contact_name, a.address, a.email))`, '$1')}
              OR EXISTS (SELECT 1 FROM accommodation_members m WHERE m.accommodation_id = a.id
                          AND ${allWords(`ws_fold(concat_ws(' ', m.first_name, m.last_name, a.name))`, '$1')}))`,
        `a.id = ANY($2::uuid[])`
      )}
      ORDER BY a.is_active DESC, lower(a.name)
      LIMIT ${CANDIDATES}`,
    [q?.tokens ?? [], 'ids' in ask ? ask.ids : []]
  );
  return rows.map((r) => ({
    kind: 'place' as const,
    id: r.id,
    title: r.name,
    detail: join(pick(lang, ACCOMMODATION_KIND_LABELS[r.kind] ?? ACCOMMODATION_KIND_LABELS.other), r.contact_name !== r.name ? r.contact_name : null, r.is_active ? null : t('inaktiv', 'inactive')),
    href: recordHref('place', r.id),
    score: 0,
    candidate: { name: r.folded, idMatch: null, via: q ? r.via : false, live: r.is_active },
  }));
}

async function rooms(ask: Ask, { t, lang }: Ctx): Promise<Found[]> {
  const q = 'q' in ask ? ask.q : null;
  const rows = await query<{ id: string; name: string; nickname: string | null; zone: string | null; capacity: number | null; is_active: boolean; hay: string }>(
    `SELECT r.id, r.name, r.nickname, r.zone, r.capacity, r.is_active, h.hay
       FROM rooms r CROSS JOIN LATERAL (SELECT ws_fold(concat_ws(' ', r.nickname, r.name, r.short_name, r.zone, 'raum room')) AS hay) h
      WHERE ${either(`cardinality($1::text[]) > 0 AND ${allWords('h.hay', '$1')}`, `r.id = ANY($2::uuid[])`)}
      ORDER BY r.is_active DESC, lower(r.name)
      LIMIT ${CANDIDATES}`,
    [q?.tokens ?? [], 'ids' in ask ? ask.ids : []]
  );
  return rows.map((r) => ({
    kind: 'room' as const,
    id: r.id,
    title: r.nickname ? `${r.nickname} · ${r.name}` : r.name,
    detail: join(r.zone, r.capacity ? t(`${num(lang, r.capacity)} Plätze`, `${num(lang, r.capacity)} seats`) : null, r.is_active ? null : t('inaktiv', 'inactive')),
    href: recordHref('room', r.id),
    score: 0,
    candidate: { name: r.hay, idMatch: null, live: r.is_active },
  }));
}

/**
 * An Anmeldung (0097) as one row: who sent it and its first line's course or exam (`label`), found by
 * any of its lines (`lines`).
 */
const REGISTRATIONS = `(
  SELECT g.id, l.first_name, l.last_name, l.email, l.label, g.status, g.submitted_at,
         concat_ws(' ', (SELECT string_agg(course_type_label, ' ') FROM course_registrations WHERE registration_id = g.id),
                        (SELECT string_agg(exam_type_label, ' ') FROM exam_registrations WHERE registration_id = g.id)) AS lines
    FROM registrations g
    CROSS JOIN LATERAL (
      SELECT first_name, last_name, email, course_type_label AS label, 0 AS rank FROM course_registrations WHERE registration_id = g.id
      UNION ALL
      SELECT first_name, last_name, email, exam_type_label, 1 FROM exam_registrations WHERE registration_id = g.id
      ORDER BY rank LIMIT 1
    ) l
) anmeldungen`;

/** The inbox's records: few, small tables, found by name, address or topic. */
async function inbox(
  kind: 'enquiry' | 'registration' | 'application',
  ask: Ask,
  { t, lang }: Ctx
): Promise<Found[]> {
  const q = 'q' in ask ? ask.q : null;
  const source: { table: string; label: string; hay?: string; at: string; where: string } = {
    enquiry: { table: 'enquiries', label: 'topic', at: 'submitted_at', where: `status <> 'spam' AND deleted_at IS NULL` },
    registration: { table: REGISTRATIONS, label: 'label', hay: 'lines', at: 'submitted_at', where: `status <> 'spam'` },
    application: { table: 'career_applications', label: 'position_title', at: 'created_at', where: 'true' },
  }[kind];
  const rows = await query<{ id: string; first_name: string; last_name: string | null; label: string | null; at: string; folded: string; id_match: IdMatch }>(
    `SELECT id, first_name, last_name, ${source.label} AS label, to_char(${source.at}, 'YYYY-MM-DD') AS at,
            ws_fold(concat_ws(' ', first_name, last_name)) AS folded,
            CASE WHEN $2::text IS NOT NULL AND lower(email) = $2 THEN 'exact' WHEN $2::text IS NOT NULL AND strpos(lower(email), $2) > 0 THEN 'prefix' END AS id_match
       FROM ${source.table}
      WHERE ${source.where}
        AND ${either(
          `(cardinality($1::text[]) > 0 AND ${allWords(`ws_fold(concat_ws(' ', first_name, last_name, email, ${source.hay ?? source.label}))`, '$1')})
           OR ($2::text IS NOT NULL AND strpos(lower(email), $2) > 0)`,
          `id = ANY($3::uuid[])`
        )}
      ORDER BY ${source.at} DESC
      LIMIT ${CANDIDATES}`,
    [q?.tokens ?? [], q?.email ?? null, 'ids' in ask ? ask.ids : []]
  );
  return rows.map((r) => ({
    kind,
    id: r.id,
    title: name(r.first_name, r.last_name),
    detail: join(r.label ?? (kind === 'application' ? t('Bewerbung', 'Job application') : null), dateOf(r.at, lang)),
    href: recordHref(kind, r.id),
    score: 0,
    candidate: { name: r.folded, idMatch: r.id_match, at: r.at },
  }));
}

/**
 * A letter, when a word names its kind or its subject and another the recipient: „Zahlungserinnerung
 * Schmidt", „Visum Yilmaz". A name alone finds the learner, not their letters.
 */
async function letters(ask: Ask, { t, lang, holds }: Ctx): Promise<Found[]> {
  const allowed = LETTER_KINDS.filter((k) => holds(letterModule(k)));
  if (!allowed.length) return [];
  const q = 'q' in ask ? ask.q : null;
  const label = (k: LetterKind) => LETTER_KIND_LABELS[k];
  // The words that name a kind of letter, and which kinds they name.
  const kindWords = q ? q.tokens.filter((w) => allowed.some((k) => ` ${foldSearch(`${label(k).de} ${label(k).en}`)}`.includes(` ${w}`))) : [];
  const kinds = allowed.filter((k) => kindWords.length && kindWords.every((w) => ` ${foldSearch(`${label(k).de} ${label(k).en}`)}`.includes(` ${w}`)));
  const rest = q ? q.tokens.filter((w) => !kindWords.includes(w)) : [];
  if (q && (!rest.length || (!kinds.length && rest.length < 2))) return [];
  const rows = await query<{ id: string; kind: LetterKind; recipient_name: string | null; sent: string | null; folded: string }>(
    `SELECT l.id, l.kind, l.recipient_name, to_char(l.sent_at, 'YYYY-MM-DD') AS sent, ws_fold(coalesce(l.recipient_name, '')) AS folded
       FROM letters l
      WHERE l.kind = ANY($1::text[])
        AND ${either(
          // A kind named: its letters to the recipient the other words name. None: a word of the
          // subject that is not the recipient's name (the subject often carries it), and a word of
          // the recipient's — „telc B2" alone is the exam, not every letter about it.
          `(cardinality($2::text[]) > 0 AND l.kind = ANY($2::text[]) AND ${allWords(`ws_fold(coalesce(l.recipient_name, ''))`, '$3')})
           OR (cardinality($2::text[]) = 0 AND cardinality($3::text[]) >= 2 AND ${someWord('l.search_subject', '$3')}
               AND EXISTS (SELECT 1 FROM unnest($3::text[]) w WHERE strpos(l.search_subject, w) > 0 AND strpos(ws_fold(coalesce(l.recipient_name, '')), w) = 0)
               AND ${someWord(`ws_fold(coalesce(l.recipient_name, ''))`, '$3')}
               AND ${allWords(`l.search_subject || ' ' || ws_fold(coalesce(l.recipient_name, ''))`, '$3')})`,
          `l.id = ANY($4::uuid[])`
        )}
      ORDER BY l.sent_at DESC NULLS LAST
      LIMIT ${CANDIDATES}`,
    [allowed, kinds, rest, 'ids' in ask ? ask.ids : []]
  );
  return rows.map((r) => ({
    kind: 'letter' as const,
    id: r.id,
    title: label(r.kind)[lang],
    detail: join(r.recipient_name, r.sent ? dateOf(r.sent, lang) : t('Nicht gesendet', 'Not sent')),
    href: `/admin/letters/${r.id}`,
    score: 0,
    // Scored by the recipient's name with the kind's words set aside.
    candidate: { name: r.folded, idMatch: null, at: r.sent },
  }));
}

type Reader = { kind: SearchKind; module: WorkspaceModule | null; read: (ask: Ask, ctx: Ctx) => Promise<Found[]> };

const READERS: Reader[] = [
  { kind: 'person', module: 'people', read: people },
  { kind: 'booking', module: 'bookings', read: bookings },
  { kind: 'course', module: 'catalogue', read: courses },
  { kind: 'exam', module: 'catalogue', read: exams },
  { kind: 'staff', module: 'staff', read: staff },
  { kind: 'organisation', module: 'organisations', read: organisations },
  { kind: 'group', module: 'groups', read: groups },
  { kind: 'offer', module: 'offers', read: offers },
  { kind: 'place', module: 'accommodation', read: places },
  { kind: 'room', module: 'rooms', read: rooms },
  { kind: 'enquiry', module: 'enquiries', read: (a, c) => inbox('enquiry', a, c) },
  { kind: 'registration', module: 'registrations', read: (a, c) => inbox('registration', a, c) },
  { kind: 'application', module: 'applications', read: (a, c) => inbox('application', a, c) },
  // Each letter's own module decides; the reader filters by kind.
  { kind: 'letter', module: null, read: letters },
];

const berlinToday = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });

/** What was typed, across every module the colleague holds: the groups in order, five hits each at most. */
export async function searchWorkspace(
  text: string,
  holds: (module: WorkspaceModule) => boolean,
  t: T,
  lang: WsLang,
  perKind = 5
): Promise<SearchGroup[]> {
  const q = parseQuery(text);
  // A word of one letter alone finds everything: wait for a second.
  if (q.text.length < 2 || (!q.tokens.some((w) => w.length > 1) && !isIdentifier(q))) return [];
  const ctx: Ctx = { t, lang, today: berlinToday(), holds };
  const now = new Date();
  const found = (await Promise.all(READERS.filter((r) => !r.module || holds(r.module)).map((r) => r.read({ q }, ctx)))).flat();
  const hits: SearchHit[] = found.map(({ candidate, ...hit }) => ({ ...hit, score: scoreCandidate(q.tokens, candidate, now) }));
  return rankGroups(hits, SEARCH_KINDS, perKind);
}

export type RecordRef = { kind: SearchKind; id: string };

/** The records a colleague opened last, in that order, as search hits — only those they may still open. */
export async function recentRecords(refs: readonly RecordRef[], holds: (module: WorkspaceModule) => boolean, t: T, lang: WsLang): Promise<SearchHit[]> {
  const ctx: Ctx = { t, lang, today: berlinToday(), holds };
  const byKind = new Map<SearchKind, string[]>();
  for (const ref of refs) byKind.set(ref.kind, [...(byKind.get(ref.kind) ?? []), ref.id]);
  const found = (
    await Promise.all(
      READERS.filter((r) => byKind.has(r.kind) && (!r.module || holds(r.module))).map((r) => r.read({ ids: byKind.get(r.kind)! }, ctx))
    )
  ).flat();
  const index = new Map(found.map((hit) => [`${hit.kind}:${hit.id}`, hit]));
  return refs.flatMap((ref) => {
    const hit = index.get(`${ref.kind}:${ref.id}`);
    return hit ? [{ kind: hit.kind, id: hit.id, title: hit.title, detail: hit.detail, href: hit.href, score: 0 }] : [];
  });
}
