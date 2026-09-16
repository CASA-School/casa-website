import { EmptyState } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { listPlanMonths, loadPlan, resolvePlanMonth } from '@/lib/admin/kursplanung/repo';
import { monthLabel } from '@/lib/admin/kursplanung/weeks';

import { Board } from './board';
import { Header, HeaderStart } from './header';
import ui from './ui.module.css';

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
  const notice = { ok: params.ok, error: params.error };

  if (plan.groups.length === 0) {
    return (
      <div className={ui.module}>
        <Header active="puzzle" month={month} months={months} notice={notice} />
        <EmptyState title={`Kein Plan für ${monthLabel(month)}`} description="Für diesen Monat sind noch keine Kursgruppen angelegt." />
      </div>
    );
  }

  return (
    <Board
      plan={plan}
      month={month}
      canWrite={canAccess(user, 'kursplanung', 'edit')}
      header={<HeaderStart active="puzzle" month={month} months={months} />}
      notice={notice}
    />
  );
}
