import { EmptyState, PageHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { listPlanMonths, loadPlan, resolvePlanMonth } from '@/lib/admin/kursplanung/repo';
import { monthLabel } from '@/lib/admin/kursplanung/weeks';

import { Board } from './board';
import { KursplanungTabs } from './tabs';

/**
 * Kursplanung — the board. docs/KURSPLANUNG.md explains the rules.
 *
 * `?month=2026-10` picks a month; the default is the latest month that has
 * course groups, and the current month when there is none. Everything the
 * board needs is loaded here in one round; the board keeps a local copy and
 * saves whole shift-weeks through `saveWeekAction`.
 */
export default async function KursplanungPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; ok?: string; error?: string }>;
}) {
  const [params, user] = await Promise.all([searchParams, requireModule('kursplanung')]);
  const month = await resolvePlanMonth(params.month);
  const [plan, months] = await Promise.all([loadPlan(month), listPlanMonths()]);
  const label = monthLabel(month);

  return (
    <>
      <PageHeader eyebrow="Management" title="Kursplanung" description={label} />
      <KursplanungTabs active="puzzle" month={month} months={months} notice={{ ok: params.ok, error: params.error }} />
      {plan.groups.length === 0 ? (
        <EmptyState title={`Kein Plan für ${label}`} description="Für diesen Monat sind noch keine Kursgruppen angelegt." />
      ) : (
        <Board plan={plan} month={month} canWrite={canAccess(user, 'kursplanung', 'edit')} />
      )}
    </>
  );
}
