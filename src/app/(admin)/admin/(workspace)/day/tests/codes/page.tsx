import { PrintSheet } from '../print-sheet';
import { EmptyState, PageHeader } from '@/components/admin/ui';
import { berlinDay } from '@/lib/admin/days';
import { dayEntryTests, upcomingEntryTestDays } from '@/lib/admin/entry-tests';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const longDay = (day: string) =>
  new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));

/**
 * The teachers' codes on cards of their own (Rahman, 2026-10-22: the QR code, the guide and the code
 * each on their own page, so the teachers are not confused): one card per class of a start day, with the
 * test, the class, its teacher and the code that lets a paused phone go on — to cut out and hand over, or
 * to send. Only tests opened (on the day or ahead) have a code.
 */
export default async function EntryTestCodesPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const [params] = await Promise.all([searchParams, requireModule('day', 'edit')]);
  const { t } = await getI18n();
  const day = params.date && DAY.test(params.date) ? params.date : (await upcomingEntryTestDays(berlinDay(new Date()), 1))[0];
  const tests = day ? (await dayEntryTests(day)).filter((x) => x.sitting && x.sitting.state !== 'closed' && x.classes.length) : [];
  const cards = tests.flatMap((x) =>
    x.classes.map((c) => ({
      key: c.dayId,
      title: x.title,
      session: x.session === 'morning' ? 'Vormittag' : 'Nachmittag',
      minutes: x.sitting!.minutes,
      code: x.sitting!.code,
      cls: [c.label, x.classes.filter((o) => o.label === c.label).length > 1 ? `Gruppe ${c.groupIndex}` : null, c.roomName].filter(Boolean).join(' · '),
      teacher: c.teacherName,
    }))
  );

  return (
    <>
      <PageHeader backHref="/admin/day/tests" backLabel={t('Einstufungstests', 'Placement tests')} title={t('Codes für die Lehrkräfte', 'Codes for the teachers')} />
      {day && cards.length ? (
        <PrintSheet name={`Codes Einstufungstest ${day}`}>
          <div className="text-[#111827]">
            <header className="flex items-end justify-between gap-6 border-b border-[#d9e0ea] pb-3">
              <div
                role="img"
                aria-label="CASA Internationale Sprachschule"
                className="aspect-[1155/325] w-[38mm] max-w-[40%] bg-contain bg-left bg-no-repeat"
                style={{ backgroundImage: 'url(/brand/casa-logo.png)' }}
              />
              <p className="text-right text-[9.5pt] font-semibold text-[#5b6b82]">
                Codes für die Lehrkräfte · {longDay(day)}
              </p>
            </header>
            <ul className="mt-4 grid grid-cols-2 gap-3">
              {cards.map((card) => (
                <li key={card.key} className="rounded-2xl border-2 border-dashed border-[#c3cddb] px-5 py-3 print:break-inside-avoid">
                  <p className="text-[9pt] font-semibold text-[#5b6b82]">
                    {card.session} · {card.minutes} Minuten
                  </p>
                  <p className="mt-0.5 text-[12pt] leading-tight font-extrabold">{card.title}</p>
                  <p className="mt-1 text-[10pt] text-[#374151]">{card.cls}</p>
                  {card.teacher ? <p className="text-[10pt] text-[#374151]">{card.teacher}</p> : null}
                  <p className="mt-2 text-[9pt] font-semibold text-[#5b6b82]">Code für die Lehrkraft</p>
                  <p className="text-[28pt] leading-none font-extrabold tracking-[0.22em] tabular-nums">{card.code}</p>
                  <p className="mt-2 text-[8.5pt] leading-snug text-[#5b6b82]">Damit geht ein pausierter Test weiter. Nicht an die Teilnehmenden weitergeben.</p>
                </li>
              ))}
            </ul>
          </div>
        </PrintSheet>
      ) : (
        <EmptyState title={t('Für diesen Tag gibt es noch keine Codes.', 'There are no codes for this day yet.')} description={t('Öffne zuerst die Tests.', 'Open the tests first.')} />
      )}
    </>
  );
}
