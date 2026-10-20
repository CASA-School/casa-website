import { dayLabel } from '../day-header';
import { EntryTestCard } from '../entry-test-panel';
import { Icon } from '@/components/admin/icons';
import { ButtonLink, Card, EmptyState, PageHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { berlinDay } from '@/lib/admin/days';
import { archivePastSittings, entryTestDays, entryTestViews } from '@/lib/admin/entry-tests';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { publicSiteAddress } from '@/lib/cms/origins';
import { ENTRY_TEST_IDS, ENTRY_TESTS } from '@/lib/entry-test/tests';

/**
 * The day-one tests' archive (Rahman, 2026-10-20: once the day is over, its tests are archived): every
 * test day, the latest first, each test opening the same panel as on its day — results, answers, the
 * Excel, a paper booklet typed in late. Above them, the booklets and QR codes to print ahead of a start.
 * A deletion period comes later (docs/ENTRY_TEST.md).
 */
export default async function EntryTestArchivePage() {
  const [user, { t, lang }] = await Promise.all([requireModule('day'), getI18n()]);
  await archivePastSittings();
  const [days, origin] = await Promise.all([entryTestDays(), publicSiteAddress()]);
  const today = berlinDay(new Date());
  const archive = await Promise.all(days.map(async (day) => ({ day, tests: (await entryTestViews(day, origin)).filter((test) => test.sitting) })));

  return (
    <>
      <PageHeader backHref="/admin/day" backLabel={t('Tagesplan', 'Day plan')} title={t('Einstufungstests', 'Placement tests')} />

      <Card title={t('Testhefte und QR-Codes', 'Booklets and QR codes')} icon={Icon.placement} tint="blue" bleed>
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
              isToday={day === today}
              archived={day < today}
              canEdit={canAccess(user, 'day', 'edit')}
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
