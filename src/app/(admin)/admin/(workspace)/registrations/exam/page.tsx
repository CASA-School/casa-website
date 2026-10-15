import { InboxScreen, inboxParams, type InboxItem } from '@/components/admin/inbox';
import { RegistrationTabs } from '@/components/admin/registration-tabs';
import { Badge } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { translator, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { inboxCounts, openCount } from '@/lib/admin/inbox';
import { listExamRegistrations, registrationTypeLabel } from '@/lib/admin/registrations';
import { formatDay, parseOptionLabel } from '../option-label';

/** "Sa., 7. Nov. 2026 · 09:00": the sitting, as stored when it does not parse. */
function sittingDetails(option: string | null, lang: WsLang): string | null {
  const t = translator(lang);
  const parsed = parseOptionLabel(option);
  if (!parsed) return null;
  if (parsed.toBeArranged) return t('Termin wird noch festgelegt', 'Date to be arranged');
  if (!parsed.start) return parsed.raw;
  return [t(`Prüfung am ${formatDay(parsed.start, lang, true)}`, `Sitting on ${formatDay(parsed.start, lang, true)}`), parsed.time].filter(Boolean).join(' · ');
}

/** The full exam is the normal case; only a single part is marked on its row. */
const FULL_EXAM = 'full';

/**
 * Exam registrations: the inbox (`InboxScreen`, shared with enquiries and
 * applications), each row the exam and its sitting, marked when only one part
 * is taken. Kurs | Prüfung beside the title switches to the course registrations.
 */
export default async function ExamRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = inboxParams(params);
  const [user, { items, total }, counts, courseCounts, { t, lang }] = await Promise.all([
    requireModule('registrations'),
    listExamRegistrations({ period: view.period, state: view.state, search: view.search, limit: view.limit, offset: view.offset }),
    inboxCounts('exam_registration'),
    inboxCounts('course_registration'),
    getI18n(),
  ]);

  const rows: InboxItem[] = items.map((item) => ({
    id: item.id,
    href: `/admin/registrations/exam/${item.id}`,
    name: [item.firstName, item.lastName].filter(Boolean).join(' '),
    status: item.status,
    at: item.submittedAt,
    title: item.productLabel ?? t('Prüfung', 'Exam'),
    preview: sittingDetails(item.optionLabel, lang),
    badges:
      item.detailNote && item.detailNote !== FULL_EXAM ? <Badge tone="neutral">{registrationTypeLabel(item.detailNote, lang)}</Badge> : null,
    locale: item.locale,
    assigneeName: item.assigneeName,
  }));

  return (
    <InboxScreen
      entity="exam_registration"
      basePath="/admin/registrations/exam"
      title={t('Anmeldungen', 'Registrations')}
      actions={<RegistrationTabs active="exam" counts={{ course: openCount(courseCounts), exam: openCount(counts) }} lang={lang} />}
      nouns={{ one: { de: 'Anmeldung', en: 'registration' }, many: { de: 'Anmeldungen', en: 'registrations' } }}
      searchPlaceholder={t('Name, E-Mail oder Prüfung', 'Name, email or exam')}
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
