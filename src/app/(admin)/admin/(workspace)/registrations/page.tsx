import { InboxScreen, inboxParams, type InboxItem } from '@/components/admin/inbox';
import { Badge } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { translator, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { inboxCounts } from '@/lib/admin/inbox';
import { listRegistrations, registrationTypeLabel, type RegistrationListItem } from '@/lib/admin/registrations';
import { registrationsWithSchoolmanCandidates } from '@/lib/admin/registration-schoolman';
import { courseNameResolver } from './course-names';
import { formatDay, formatRange, parseOptionLabel } from './option-label';
import { levelWord, registrationTitle } from './summary';

/**
 * What decides the next step, on one line: when the courses run and at which level — „4. Jan. – 22. Okt.
 * 2027 · 6 Niveaus" for a path, „26. Okt. – 18. Dez. · Niveau B1.2" for one course — or an exam's sitting.
 */
function preview(item: RegistrationListItem, lang: WsLang): string | null {
  const t = translator(lang);
  const courses = item.lines.filter((l) => l.kind === 'course');
  if (!courses.length) {
    const exam = parseOptionLabel(item.lines[0]?.option);
    if (!exam) return null;
    if (exam.toBeArranged) return t('Termin wird noch festgelegt', 'Date to be arranged');
    return exam.start ? [t(`Prüfung am ${formatDay(exam.start, lang, true)}`, `Sitting on ${formatDay(exam.start, lang, true)}`), exam.time].filter(Boolean).join(' · ') : exam.raw;
  }
  const dated = courses.map((l) => parseOptionLabel(l.option)).filter((p) => p?.start);
  const first = dated[0]?.start ?? null;
  const last = dated.reduce<Date | null>((end, p) => (p?.end && (!end || p.end > end) ? p.end : end), null);
  const when = first ? formatRange(first, last, lang) : t('Termin wird noch festgelegt', 'Date to be arranged');
  if (courses.length === 1) {
    const level = levelWord(courses[0].detail);
    return [when, level ? t(`Niveau ${level}`, `Level ${level}`) : null].filter(Boolean).join(' · ');
  }
  return [when, t(`${courses.length} Niveaus`, `${courses.length} levels`)].join(' · ');
}

/**
 * Anmeldungen (0097, 2026-10-27): the inbox (`InboxScreen`, shared with enquiries and applications), one
 * row per person's registration — the courses as a path, „Intensive German A1 → C1 + telc Deutsch B2",
 * when they run, a room if one is needed, and how many of its lines are settled while it is under way.
 */
export default async function RegistrationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const view = inboxParams(params);
  const [user, { items, total }, counts, courseName, { t, lang }, inSchoolman] = await Promise.all([
    requireModule('registrations'),
    listRegistrations({ period: view.period, state: view.state, search: view.search, limit: view.limit, offset: view.offset }),
    inboxCounts('registration'),
    courseNameResolver(),
    getI18n(),
    // An open Anmeldung a colleague has probably booked in SchoolMan already (0113): the page asks which booking.
    registrationsWithSchoolmanCandidates(),
  ]);

  const rows: InboxItem[] = items.map((item) => {
    const settled = item.lines.filter((l) => l.settled).length;
    const onlyExam = item.lines.length === 1 && item.lines[0].kind === 'exam' ? item.lines[0] : null;
    return {
      id: item.id,
      href: `/admin/registrations/${item.id}`,
      name: [item.firstName, item.lastName].filter(Boolean).join(' '),
      status: item.status,
      at: item.submittedAt,
      title:
        registrationTitle(item.lines.map((l) => ({ kind: l.kind, name: l.kind === 'course' ? courseName(l.label, l.typeId) : l.label, level: l.detail }))) ||
        t('Anmeldung', 'Registration'),
      preview: preview(item, lang),
      badges: (
        <>
          {inSchoolman.has(item.id) ? <Badge tone="positive">{t('In SchoolMan gebucht?', 'Booked in SchoolMan?')}</Badge> : null}
          {item.accommodationRequired ? <Badge tone="stay">{t('Unterkunft', 'Accommodation')}</Badge> : null}
          {item.visaRequired ? <Badge tone="visa">{t('Visum', 'Visa')}</Badge> : null}
          {onlyExam?.detail && onlyExam.detail !== 'full' ? <Badge tone="neutral">{registrationTypeLabel(onlyExam.detail, lang)}</Badge> : null}
          {item.lines.length > 1 && settled > 0 && settled < item.lines.length ? (
            <Badge tone="neutral">{t(`${settled} von ${item.lines.length} erledigt`, `${settled} of ${item.lines.length} done`)}</Badge>
          ) : null}
        </>
      ),
      locale: item.locale,
      assigneeName: item.assigneeName,
    };
  });

  return (
    <InboxScreen
      entity="registration"
      basePath="/admin/registrations"
      title={t('Anmeldungen', 'Registrations')}
      nouns={{ one: { de: 'Anmeldung', en: 'registration' }, many: { de: 'Anmeldungen', en: 'registrations' } }}
      searchPlaceholder={t('Name, E-Mail, Kurs oder Prüfung', 'Name, email, course or exam')}
      view={view.view}
      state={view.state}
      search={view.search}
      page={view.page}
      params={params}
      counts={counts}
      items={rows}
      total={total}
      canClose={canAccess(user, 'registrations', 'edit')}
    />
  );
}
