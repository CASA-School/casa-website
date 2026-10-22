import { EmptyState } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { getI18n } from '@/lib/admin/i18n.server';
import { listPlanMonths, loadPlan, planRegulars, planToday, resolvePlanMonth } from '@/lib/admin/kursplanung/repo';
import { monthLabel } from '@/lib/admin/kursplanung/weeks';

import { Board } from './board';
import { Header, HeaderStart } from './header';
import ui from './ui.module.css';

/**
 * Kursplanung — the board. docs/KURSPLANUNG.md explains the rules.
 *
 * `?month=2026-10` picks a month; the default is the planning month today
 * falls in, and the board opens on today's week. Everything the board needs is
 * loaded here in one round; the board keeps a local copy and saves whole
 * shift-weeks through `saveWeekAction`.
 */
export default async function KursplanungPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; ok?: string; error?: string }>;
}) {
  const [params, user] = await Promise.all([searchParams, requireModule('kursplanung')]);
  const month = await resolvePlanMonth(params.month);
  const [plan, months, regulars] = await Promise.all([loadPlan(month), listPlanMonths(), planRegulars(month)]);
  const notice = { ok: params.ok, error: params.error };

  if (plan.groups.length === 0) {
    const { t, lang } = await getI18n();
    const label = monthLabel(month, lang);
    return (
      <div className={ui.module}>
        <Header active="puzzle" month={month} months={months} notice={notice} />
        <EmptyState
          title={t(`Kein Plan für ${label}`, `No plan for ${label}`)}
          description={t('Für diesen Monat sind noch keine Kursgruppen angelegt.', 'No course groups have been set up for this month yet.')}
        />
      </div>
    );
  }

  return (
    <Board
      plan={plan}
      month={month}
      today={planToday()}
      regulars={regulars}
      canWrite={canAccess(user, 'kursplanung', 'edit')}
      canSeeStaff={canAccess(user, 'staff')}
      header={<HeaderStart active="puzzle" month={month} months={months} />}
      notice={notice}
    />
  );
}
