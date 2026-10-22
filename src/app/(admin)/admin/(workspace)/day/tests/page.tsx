import { dayLabel } from '../day-header';
import { EntryTestCard } from '../entry-test-panel';
import { OpenTestsDialog } from '../open-tests-dialog';
import { Icon } from '@/components/admin/icons';
import { ButtonLink, Card, EmptyState, PageHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { berlinDay } from '@/lib/admin/days';
import { archivePastSittings, dayEntryTests, entryTestDays, entryTestOrigin, entryTestViews, nextEntryTestDay } from '@/lib/admin/entry-tests';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { ENTRY_TEST_IDS, ENTRY_TESTS } from '@/lib/entry-test/tests';

/**
 * The day-one tests' archive (Rahman, 2026-10-20: once the day is over, its tests are archived): every
 * test day, the latest first, each test opening the same panel as on its day — results, answers, the
 * Excel, a paper booklet typed in late. Above them, per test, the booklets and QR codes to print ahead of a
 * start; and „Tests öffnen" for the next intensive start, on its day or ahead of it: every A2, B1 and B1+
 * course's test, or the chosen ones' (Rahman, 2026-10-22).
 * A deletion period comes later (docs/ENTRY_TEST.md).
 */
export default async function EntryTestArchivePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [params, user, { t, lang }] = await Promise.all([searchParams, requireModule('day'), getI18n()]);
  await archivePastSittings();
  const [days, origin] = await Promise.all([entryTestDays(), entryTestOrigin()]);
  const today = berlinDay(new Date());
  const archive = await Promise.all(days.map(async (day) => ({ day, tests: (await entryTestViews(day, origin)).filter((test) => test.sitting) })));
  const canEdit = canAccess(user, 'day', 'edit');
  // „Tests öffnen" for the next intensive start, today or ahead of it, so the codes are ready.
  const testDay = canEdit ? await nextEntryTestDay(today) : null;
  const startTests = testDay ? await dayEntryTests(testDay) : [];

  return (
    <>
      <PageHeader
        backHref="/admin/day"
        backLabel={t('Tagesplan', 'Day plan')}
        title={t('Einstufungstests', 'Placement tests')}
        actions={
          testDay && startTests.length ? (
            <>
              <ButtonLink href={`/admin/day/tests/mail?date=${testDay}`} variant="secondary">
                {Icon.mail}
                {t('E-Mail an Lehrkräfte', 'Email the teachers')}
              </ButtonLink>
              <OpenTestsDialog
                tests={startTests}
                day={testDay}
                when={testDay === today ? undefined : dayLabel(testDay, lang, { weekday: 'short', day: 'numeric', month: 'short' })}
                from="tests"
              />
            </>
          ) : null
        }
      />

      {params.error ? (
        <p role="alert" className="mb-5 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {params.error}
        </p>
      ) : null}

      <Card
        title={t('Tests', 'Tests')}
        icon={Icon.placement}
        tint="blue"
        bleed
        actions={
          <ButtonLink href="/admin/day/tests/guide" variant="secondary" size="sm">
            {t('Leitfaden für Lehrkräfte', 'Guide for teachers')}
          </ButtonLink>
        }
      >
        <ul className="divide-y divide-ws-line-soft">
          {ENTRY_TEST_IDS.map((test) => (
            <li key={test} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-[var(--casa-ink)]">{ENTRY_TESTS[test].title}</span>
                <span className="block text-[0.8rem] text-[var(--casa-muted)]">
                  {t(`Kurs ${ENTRY_TESTS[test].course} · prüft ${ENTRY_TESTS[test].checks}`, `${ENTRY_TESTS[test].course} course · checks ${ENTRY_TESTS[test].checks}`)}
                </span>
              </span>
              <span className="flex flex-wrap gap-2">
                {(['A', 'B'] as const).map((v) => (
                  <ButtonLink key={v} href={`/admin/day/tests/booklet?kurs=${test}&version=${v}`} variant="secondary" size="sm">
                    {t(`Testheft ${v}`, `Booklet ${v}`)}
                  </ButtonLink>
                ))}
                <ButtonLink href={`/admin/day/tests/qr?kurs=${test}`} variant="secondary" size="sm">
                  {t('QR-Code', 'QR code')}
                </ButtonLink>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-6">
        {archive.length ? (
          archive.map(({ day, tests }) => (
            <EntryTestCard
              key={day}
              heading={dayLabel(day, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              tests={tests}
              day={day}
              archived={day < today}
              canEdit={canEdit}
              canDelete={canAccess(user, 'day', 'full')}
            />
          ))
        ) : (
          <EmptyState title={t('Noch kein Test geschrieben.', 'No test written yet.')} />
        )}
      </div>
    </>
  );
}
