import { EmptyState, PageHeader, StatBand } from '@/components/admin/ui';
import { planMonthSummary, resolvePlanMonth } from '@/lib/admin/kursplanung/repo';
import { monthLabel } from '@/lib/admin/kursplanung/weeks';

/**
 * Kursplanung — the landing screen of the board.
 *
 * This step ships the module, its tables and its rules; the board itself
 * follows in the next change. Until then the screen shows what the tables
 * hold for the planning month, so the import can be checked from here rather
 * than from a SQL prompt.
 *
 * `?month=2026-10` picks a month; the default is the latest month that has
 * course groups, and the current month when there is none.
 */
export default async function KursplanungPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = await resolvePlanMonth(params.month);
  const summary = await planMonthSummary(month);
  const label = monthLabel(month);

  return (
    <>
      <PageHeader eyebrow="Management" title="Kursplanung" description={label} />

      {summary.groups === 0 ? (
        <EmptyState
          title={`Kein Plan für ${label}`}
          description="Für diesen Monat sind noch keine Kursgruppen angelegt."
        />
      ) : (
        <StatBand
          items={[
            { label: 'Kursgruppen', value: summary.groups, hint: `${summary.morning} Vormittag · ${summary.afternoon} Nachmittag` },
            { label: 'Lehrkräfte', value: summary.teachers, hint: 'aktiv' },
            { label: 'Geplante Kurstage', value: summary.assignments, hint: `von ${summary.courseDays} im Monat` },
            { label: 'Offene Kurstage', value: summary.courseDays - summary.assignments, alert: true },
          ]}
        />
      )}
    </>
  );
}
