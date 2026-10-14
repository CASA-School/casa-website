import 'server-only';

import type { WorkspaceModule } from './access';
import { query } from './db';
import type { T } from './i18n';

/**
 * The workspace's search (⌘K in the top bar): a name, an address or an offer
 * number finds the record across the modules the colleague holds — a student,
 * an enquiry, a registration, an offer, a booking, a job application. Five of
 * each at most, newest first; a module the colleague does not hold is not
 * searched at all.
 */

export type SearchKind = 'person' | 'enquiry' | 'course' | 'exam' | 'offer' | 'booking' | 'application';

export type SearchHit = { kind: SearchKind; id: string; title: string; detail: string; href: string };

const LIMIT = 5;

const name = (first: string | null, last: string | null) => [first, last].filter(Boolean).join(' ');
const day = (d: Date | null) => (d ? d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Europe/Berlin' }) : '');

export async function searchWorkspace(
  text: string,
  holds: (module: WorkspaceModule) => boolean,
  t: T
): Promise<SearchHit[]> {
  const status: Record<string, string> = {
    reserved: t('Reserviert', 'Reserved'),
    confirmed: t('Bestätigt', 'Confirmed'),
    cancelled: t('Storniert', 'Cancelled'),
    completed: t('Abgeschlossen', 'Completed'),
  };
  const term = text.trim().toLowerCase().slice(0, 80);
  if (term.length < 2) return [];
  const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

  const runs: Promise<SearchHit[]>[] = [];

  if (holds('people')) {
    runs.push(
      query<{ id: string; first_name: string; last_name: string | null; email: string | null; bookings: string }>(
        `SELECT p.id, p.first_name, p.last_name,
                (SELECT address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC LIMIT 1) AS email,
                (SELECT count(*) FROM bookings b WHERE b.person_id = p.id AND b.deleted_at IS NULL) AS bookings
           FROM people p
          WHERE p.deleted_at IS NULL AND p.merged_into IS NULL
            AND (lower(concat_ws(' ', p.first_name, p.last_name)) LIKE $1
                 OR EXISTS (SELECT 1 FROM emails e WHERE e.person_id = p.id AND lower(e.address) LIKE $1))
          ORDER BY p.updated_at DESC LIMIT ${LIMIT}`,
        [like]
      ).then((rows) =>
        rows.map((r) => {
          const n = Number(r.bookings);
          return {
            kind: 'person' as const,
            id: r.id,
            title: name(r.first_name, r.last_name),
            detail: [n ? (n === 1 ? t('1 Buchung', '1 booking') : t(`${n} Buchungen`, `${n} bookings`)) : t('Teilnehmende', 'Student'), r.email].filter(Boolean).join(' · '),
            href: `/admin/people/${r.id}`,
          };
        })
      )
    );
  }

  if (holds('enquiries')) {
    runs.push(
      query<{ id: string; first_name: string; last_name: string | null; topic: string | null; submitted_at: Date }>(
        `SELECT id, first_name, last_name, topic, submitted_at FROM enquiries
          WHERE status <> 'spam'
            AND (lower(concat_ws(' ', first_name, last_name)) LIKE $1 OR lower(email) LIKE $1 OR lower(coalesce(topic, '')) LIKE $1)
          ORDER BY submitted_at DESC LIMIT ${LIMIT}`,
        [like]
      ).then((rows) =>
        rows.map((r) => ({
          kind: 'enquiry' as const,
          id: r.id,
          title: name(r.first_name, r.last_name),
          detail: [r.topic, day(r.submitted_at)].filter(Boolean).join(' · '),
          href: `/admin/enquiries/${r.id}`,
        }))
      )
    );
  }

  if (holds('registrations')) {
    runs.push(
      query<{ id: string; first_name: string; last_name: string | null; label: string | null; submitted_at: Date }>(
        `SELECT id, first_name, last_name, course_type_label AS label, submitted_at FROM course_registrations
          WHERE status <> 'spam' AND (lower(concat_ws(' ', first_name, last_name)) LIKE $1 OR lower(email) LIKE $1)
          ORDER BY submitted_at DESC LIMIT ${LIMIT}`,
        [like]
      ).then((rows) =>
        rows.map((r) => ({
          kind: 'course' as const,
          id: r.id,
          title: name(r.first_name, r.last_name),
          detail: [r.label, day(r.submitted_at)].filter(Boolean).join(' · '),
          href: `/admin/registrations/course/${r.id}`,
        }))
      ),
      query<{ id: string; first_name: string; last_name: string | null; label: string | null; submitted_at: Date }>(
        `SELECT id, first_name, last_name, exam_type_label AS label, submitted_at FROM exam_registrations
          WHERE status <> 'spam' AND (lower(concat_ws(' ', first_name, last_name)) LIKE $1 OR lower(email) LIKE $1)
          ORDER BY submitted_at DESC LIMIT ${LIMIT}`,
        [like]
      ).then((rows) =>
        rows.map((r) => ({
          kind: 'exam' as const,
          id: r.id,
          title: name(r.first_name, r.last_name),
          detail: [r.label, day(r.submitted_at)].filter(Boolean).join(' · '),
          href: `/admin/registrations/exam/${r.id}`,
        }))
      )
    );
  }

  if (holds('offers')) {
    runs.push(
      query<{ id: string; number: string; recipient_name: string; group_name: string | null; title: string; status: string }>(
        `SELECT id, year || '-' || lpad(seq::text, 3, '0') AS number, recipient_name, group_name, title, status FROM offers
          WHERE deleted_at IS NULL
            AND (lower(recipient_name) LIKE $1 OR lower(coalesce(group_name, '')) LIKE $1 OR lower(title) LIKE $1
                 OR (year || '-' || lpad(seq::text, 3, '0')) LIKE $1 OR lower(coalesce(contact_email, '')) LIKE $1)
          ORDER BY updated_at DESC LIMIT ${LIMIT}`,
        [like]
      ).then((rows) =>
        rows.map((r) => ({
          kind: 'offer' as const,
          id: r.id,
          title: r.group_name || r.recipient_name,
          detail: [r.number, r.title].filter(Boolean).join(' · '),
          href: `/admin/offers/${r.id}`,
        }))
      )
    );
  }

  if (holds('bookings')) {
    runs.push(
      query<{ id: string; first_name: string; last_name: string | null; course: string | null; status: string }>(
        `SELECT b.id, p.first_name, p.last_name, t.name AS course, b.status::text AS status
           FROM bookings b JOIN people p ON p.id = b.person_id LEFT JOIN course_types t ON t.id = b.course_type_id
          WHERE b.deleted_at IS NULL AND lower(concat_ws(' ', p.first_name, p.last_name)) LIKE $1
          ORDER BY b.updated_at DESC LIMIT ${LIMIT}`,
        [like]
      ).then((rows) =>
        rows.map((r) => ({
          kind: 'booking' as const,
          id: r.id,
          title: name(r.first_name, r.last_name),
          detail: [r.course, status[r.status] ?? r.status].filter(Boolean).join(' · '),
          href: `/admin/bookings/${r.id}`,
        }))
      )
    );
  }

  if (holds('applications')) {
    runs.push(
      query<{ id: string; first_name: string; last_name: string | null; position_title: string | null }>(
        `SELECT id, first_name, last_name, position_title FROM career_applications
          WHERE lower(concat_ws(' ', first_name, last_name)) LIKE $1 OR lower(email) LIKE $1
          ORDER BY created_at DESC LIMIT ${LIMIT}`,
        [like]
      ).then((rows) =>
        rows.map((r) => ({
          kind: 'application' as const,
          id: r.id,
          title: name(r.first_name, r.last_name),
          detail: r.position_title ?? t('Bewerbung', 'Job application'),
          href: `/admin/applications/${r.id}`,
        }))
      )
    );
  }

  return (await Promise.all(runs)).flat();
}
