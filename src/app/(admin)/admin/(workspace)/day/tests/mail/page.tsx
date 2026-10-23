import { TeacherMailComposer } from './composer';
import { dayLabel } from '../../day-header';
import { EmptyState, PageHeader } from '@/components/admin/ui';
import { berlinDay } from '@/lib/admin/days';
import { teacherMailDraft } from '@/lib/admin/entry-test-mail';
import { upcomingEntryTestDays } from '@/lib/admin/entry-tests';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { LOGO_PNG_BASE64 } from '@/lib/notifications/casa-logo';
import { graphSender } from '@/lib/notifications/graph-mail.server';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The mail to a start day's teachers (Rahman, 2026-10-22): their codes, the QR codes and the guide in one
 * mail, a few days ahead, on the workspace's mail screen — sent from one's own mail program or directly, after a review
 * (docs/ADMIN_WORKSPACE.md §Mail, docs/ENTRY_TEST.md §The teachers' mail).
 */
export default async function TeacherMailPage({ searchParams }: { searchParams: Promise<{ date?: string; error?: string; sent?: string }> }) {
  const [params, user, { t, lang }] = await Promise.all([searchParams, requireModule('day', 'edit'), getI18n()]);
  const today = berlinDay(new Date());
  const upcoming = await upcomingEntryTestDays(today, 4);
  const day = params.date && DAY.test(params.date) ? params.date : upcoming[0];
  const draft = day ? await teacherMailDraft(day, user) : null;
  const days = [...new Set([...(day && !upcoming.includes(day) ? [day] : []), ...upcoming])].sort();

  return (
    <>
      <PageHeader backHref="/admin/day/tests" backLabel={t('Einstufungstests', 'Placement tests')} title={t('E-Mail an Lehrkräfte', 'Email the teachers')} />
      {params.error ? (
        <p role="alert" className="mb-5 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {params.error}
        </p>
      ) : null}
      {draft ? (
        <TeacherMailComposer
          key={draft.day}
          draft={draft}
          days={days.map((d) => ({ day: d, label: dayLabel(d, lang, { weekday: 'short', day: 'numeric', month: 'short' }) }))}
          from={graphSender()}
          logo={`data:image/png;base64,${LOGO_PNG_BASE64}`}
          sent={params.sent === '1'}
        />
      ) : (
        <EmptyState title={t('Kein Kursstart mit Einstufungstest in Sicht.', 'No course start with a placement test ahead.')} />
      )}
    </>
  );
}
