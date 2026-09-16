import { FormDialog } from '@/components/admin/dialogs';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { levelStyle } from '@/lib/admin/kursplanung/colours';
import { listPlanMonths, loadPlan, resolvePlanMonth } from '@/lib/admin/kursplanung/repo';
import { SHIFT_INFO, SHIFTS, WEEKDAYS, type Absence, type Teacher } from '@/lib/admin/kursplanung/types';
import { weekdayOf, type PlanningWeek } from '@/lib/admin/kursplanung/weeks';

import { Header } from '../header';
import { TeacherForm } from '../teacher-form';
import ui from '../ui.module.css';

/**
 * Lehrkräfte — the teaching staff and the rules that shape each piece, one
 * row each under their shift. Everything is edited in the dialog;
 * `?teacher=<id>` opens it straight away, which is how the board's
 * "Lehrkraft-Details" arrives here.
 */
const contractLabel = (t: Teacher) => (t.contract === 'freelance' ? 'Honorarkraft' : 'angestellt');

function absenceText(absences: readonly Absence[], weeks: readonly PlanningWeek[]) {
  return weeks
    .map((w) => {
      const mine = absences.filter((a) => w.days.includes(a.onDate));
      if (!mine.length) return null;
      const days = WEEKDAYS.filter((d) => mine.some((a) => weekdayOf(a.onDate) === d));
      return `KW ${w.kw} ${mine[0].reason}${days.length < 5 ? ` (${days.join(', ')})` : ''}`;
    })
    .filter(Boolean)
    .join(' · ');
}

export default async function LehrkraeftePage({ searchParams }: { searchParams: Promise<{ month?: string; ok?: string; error?: string; teacher?: string }> }) {
  const [params, user] = await Promise.all([searchParams, requireModule('kursplanung')]);
  const month = await resolvePlanMonth(params.month);
  const [plan, months] = await Promise.all([loadPlan(month), listPlanMonths()]);
  const canWrite = canAccess(user, 'kursplanung', 'edit');
  const returnTo = '/admin/kursplanung/lehrkraefte';
  const active = plan.teachers.filter((t) => t.isActive).sort((a, b) => a.fullName.localeCompare(b.fullName, 'de'));
  const under = (shift: (typeof SHIFTS)[number]) => active.filter((t) => (shift === 'morning' ? t.shifts.includes('morning') : !t.shifts.includes('morning')));

  return (
    <div className={ui.module}>
      <Header active="lehrkraefte" month={month} months={months} notice={{ ok: params.ok, error: params.error }} />

      {SHIFTS.map((shift) => {
        const list = under(shift);
        if (!list.length) return null;
        return (
          <section key={shift} className={ui.section}>
            <div className={ui.shiftHead}>
              <h2>{SHIFT_INFO[shift].label}</h2>
              <span className={ui.sub}>· {list.length} Lehrkräfte</span>
            </div>
            <div className={ui.card}>
              {list.map((t) => {
                const absences = plan.absences.filter((a) => a.teacherId === t.id);
                const text = absenceText(absences, plan.weeks);
                return (
                  <div key={t.id} className={ui.trow}>
                    <div className={ui.who}>
                      <b>{t.fullName}</b>
                      <small>{t.shortName}{t.note ? ` · ${t.note}` : ''}</small>
                    </div>
                    <div className={ui.chips}>
                      {SHIFTS.filter((s) => t.shifts.includes(s)).map((s) => <span key={s} className={ui.chip}>{s === 'morning' ? 'V' : 'N'}</span>)}
                      {t.contract === 'freelance' ? <span className={ui.chip}>HON</span> : null}
                      <span className={ui.days}>{t.daysPerWeek} {t.daysPerWeek === 1 ? 'Tag' : 'Tage'}{t.weekdays.length < 5 ? ` · ${t.weekdays.join(' ')}` : ''}</span>
                      {t.levels.map((L) => <i key={L} className={ui.lvChip} style={levelStyle(L)}>{L}</i>)}
                    </div>
                    <div>{text ? <span className={ui.abs}>{text}</span> : <span className={ui.absNone}>keine Abwesenheit</span>}</div>
                    <div>
                      {canWrite ? (
                        <FormDialog trigger="Details" size="sm" width="lg" title={t.fullName} description={`Im Puzzle: ${t.shortName} · ${contractLabel(t)}`} defaultOpen={params.teacher === t.id} titleClassName={ui.dlgTitle}>
                          <TeacherForm teacher={t} month={month} weeks={plan.weeks} absences={absences} returnTo={returnTo} />
                        </FormDialog>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
