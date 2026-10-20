import { redirect } from 'next/navigation';

import { canAccess } from '@/lib/admin/access';
import { logActivity } from '@/lib/admin/activity';
import { getStaffUser } from '@/lib/admin/auth';
import { isWorkspaceDatabaseConfigured } from '@/lib/admin/db';
import { exportSittings, type EntryTestAttempt } from '@/lib/admin/entry-tests';
import { buildXlsx, XLSX_TYPE, type Cell } from '@/lib/xlsx';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION = { morning: 'Vormittag', afternoon: 'Nachmittag' } as const;
const STATUS = { running: 'läuft', paused: 'pausiert', submitted: 'abgegeben', expired: 'abgegeben (Zeit abgelaufen)' } as const;

/**
 * The day-one test's results as an Excel file (docs/ENTRY_TEST.md), as the Google sheet mailed them:
 * „Auswertung" one learner a row, „Antworten" each answer marked right, wrong or blank.
 *
 * A route handler is not a child of the workspace layout, so it checks the session and the Tagesplan
 * module itself (CLAUDE.md rule 7); a refusal is a 404. Results are personal data: the download is logged.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isWorkspaceDatabaseConfigured()) {
    return new Response('Not found', { status: 404 });
  }

  const user = await getStaffUser();

  if (!user) {
    redirect('/admin/sign-in');
  }

  if (!canAccess(user, 'day', 'view')) {
    return new Response('Not found', { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const day = params.get('date') ?? '';
  const sitting = params.get('sitting') ?? undefined;
  if (!DAY.test(day) || (sitting !== undefined && !UUID.test(sitting))) return new Response('Not found', { status: 404 });

  const sittings = await exportSittings(day, sitting);
  if (!sittings.length) return new Response('Not found', { status: 404 });

  const at = (value: Date | null) =>
    value ? new Date(value).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
  const note = (a: EntryTestAttempt) =>
    [
      a.source === 'paper' ? `Papier${a.enteredBy ? ` (${a.enteredBy})` : ''}` : null,
      a.status === 'expired' ? 'Zeit abgelaufen – automatisch abgegeben' : null,
      a.blank && a.blank >= 10 ? `${a.blank} Aufgaben leer` : null,
      a.interruptions ? `${a.interruptions}× Testseite verlassen – zur Prüfung` : null,
      a.personId ? null : 'keinem Lernenden zugeordnet',
    ]
      .filter(Boolean)
      .join(' · ');

  const evaluation: Cell[][] = [
    ['Abgegeben', 'Vor- und Nachname', 'E-Mail-Adresse', 'Test', 'Gruppe', 'Version', 'Status', 'Punkte', 'Von', 'Prozent', 'Aufgaben', 'Lesen', 'Leer', 'Unterbrechungen', 'Lernende/r', 'Hinweis'],
  ];
  // „Antworten" per test: each test numbers its answers its own way (17.1 is a reading statement in B1).
  const answers = new Map<string, { title: string; labels: string[]; rows: Cell[][] }>();

  for (const s of sittings) {
    for (const a of s.attempts) {
      const handedIn = a.status === 'submitted' || a.status === 'expired';
      evaluation.push([
        at(a.submittedAt ?? a.startedAt),
        a.name,
        a.email,
        s.title,
        SESSION[s.session],
        a.version,
        STATUS[a.status],
        handedIn ? a.score : null,
        handedIn ? a.max : null,
        handedIn && a.max ? Math.round(((a.score ?? 0) / a.max) * 100) : null,
        handedIn ? `${a.grammar}/${a.grammarMax}` : null,
        handedIn ? `${a.reading}/${a.readingMax}` : null,
        handedIn ? a.blank : null,
        a.interruptions,
        a.personName,
        note(a) ? { value: note(a), fill: 'note' } : null,
      ]);
      const sheet = answers.get(s.test) ?? { title: s.title, labels: [] as string[], rows: [] as Cell[][] };
      if (a.marks && !sheet.labels.length) sheet.labels = a.marks.map((m) => m.label);
      sheet.rows.push([
        a.name,
        a.version,
        handedIn ? a.score : null,
        ...(a.marks ?? []).map((m): Cell => ({ value: m.given || '–', fill: m.mark === 'right' ? 'right' : m.mark === 'wrong' ? 'wrong' : 'blank' })),
      ]);
      answers.set(s.test, sheet);
    }
  }

  const file = buildXlsx([
    { name: 'Auswertung', rows: evaluation, widths: [17, 26, 30, 26, 12, 8, 14, 8, 6, 9, 10, 8, 6, 15, 26, 50] },
    ...[...answers.values()].map((sheet) => ({
      name: answers.size === 1 ? 'Antworten' : `Antworten ${sheet.title.replace(/^Einstufungstest /, '').replace(/ Tag 1$/, '')}`,
      rows: [['Vor- und Nachname', 'Version', 'Punkte', ...sheet.labels], ...sheet.rows],
      widths: [26, 8, 8, ...sheet.labels.map(() => 8)],
    })),
  ]);

  await logActivity({ actor: user, entity: 'entry_test', entityId: sitting ?? null, action: 'entry_test_exported', detail: { day } });

  const name = `Einstufungstest ${day}${sittings.length === 1 ? ` ${SESSION[sittings[0].session]} ${sittings[0].title.replace(/^Einstufungstest /, '').replace(/ Tag 1$/, '')}` : ''}.xlsx`;
  return new Response(file as BodyInit, {
    headers: {
      'Content-Type': XLSX_TYPE,
      'Content-Disposition': `attachment; filename="${name.replace(/[^\w .+-]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
