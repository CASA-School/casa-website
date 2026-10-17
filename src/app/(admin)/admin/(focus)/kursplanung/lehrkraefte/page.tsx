import Link from 'next/link';

import { NewStaffForm } from '../../../(workspace)/staff/staff-forms';
import { FormDialog } from '@/components/admin/dialogs';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { pick, type T, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { levelStyle } from '@/lib/admin/kursplanung/colours';
import { listPlanMonths, loadPlan, resolvePlanMonth } from '@/lib/admin/kursplanung/repo';
import { staffRoles } from '@/lib/admin/staff-members';
import { ABSENCE_LABELS, SHIFT_INFO, SHIFTS, WEEKDAY_LABELS, WEEKDAYS, type Absence, type Teacher } from '@/lib/admin/kursplanung/types';
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
const contractLabel = (teacher: Teacher, t: T) => (teacher.contract === 'freelance' ? t('Honorarkraft', 'freelance') : t('angestellt', 'employed'));

function absenceText(absences: readonly Absence[], weeks: readonly PlanningWeek[], lang: WsLang) {
  return weeks
    .map((w) => {
      const mine = absences.filter((a) => w.days.includes(a.onDate));
      if (!mine.length) return null;
      const days = WEEKDAYS.filter((d) => mine.some((a) => weekdayOf(a.onDate) === d));
      return `KW ${w.kw} ${pick(lang, ABSENCE_LABELS[mine[0].reason])}${days.length < 5 ? ` (${days.map((d) => pick(lang, WEEKDAY_LABELS[d])).join(', ')})` : ''}`;
    })
    .filter(Boolean)
    .join(' · ');
}

export default async function LehrkraeftePage({ searchParams }: { searchParams: Promise<{ month?: string; ok?: string; error?: string; teacher?: string }> }) {
  const [params, user] = await Promise.all([searchParams, requireModule('kursplanung')]);
  // `tr`, since `t` is the teacher in the rows below.
  const { t: tr, lang } = await getI18n();
  const month = await resolvePlanMonth(params.month);
  const [plan, months] = await Promise.all([loadPlan(month), listPlanMonths()]);
  const canWrite = canAccess(user, 'kursplanung', 'edit');
  // A new teacher is a new colleague on the staff register (0039), with the role Unterricht.
  const canAdd = canWrite && canAccess(user, 'staff', 'edit');
  const seesStaff = canAccess(user, 'staff');
  const roles = canAdd ? await staffRoles() : [];
  const returnTo = '/admin/kursplanung/lehrkraefte';
  const active = plan.teachers.filter((t) => t.isActive).sort((a, b) => a.fullName.localeCompare(b.fullName, 'de'));
  const under = (shift: (typeof SHIFTS)[number]) => active.filter((t) => (shift === 'morning' ? t.shifts.includes('morning') : !t.shifts.includes('morning')));

  return (
    <div className={ui.module}>
      <Header active="lehrkraefte" month={month} months={months} notice={{ ok: params.ok, error: params.error }}>
        {canAdd ? (
          <FormDialog trigger={tr('Lehrkraft anlegen', 'Add teacher')} size="sm" width="lg" title={tr('Neue Lehrkraft', 'A new teacher')} titleClassName={ui.dlgTitle}>
            <NewStaffForm roles={roles} preset={['teaching']} returnTo={returnTo} />
          </FormDialog>
        ) : null}
      </Header>

      {SHIFTS.map((shift) => {
        const list = under(shift);
        if (!list.length) return null;
        return (
          <section key={shift} className={ui.section}>
            <div className={ui.shiftHead}>
              <h2>{pick(lang, SHIFT_INFO[shift].label)}</h2>
              <span className={ui.sub}>· {list.length} {tr('Lehrkräfte', 'teachers')}</span>
            </div>
            <div className={ui.card}>
              {list.map((t) => {
                const absences = plan.absences.filter((a) => a.teacherId === t.id);
                const text = absenceText(absences, plan.weeks, lang);
                return (
                  <div key={t.id} className={ui.trow}>
                    <div className={ui.who}>
                      <b>{seesStaff ? <Link href={`/admin/staff/${t.id}`} className={ui.plainLink}>{t.fullName}</Link> : t.fullName}</b>
                      <small>{t.shortName}{t.note ? ` · ${t.note}` : ''}</small>
                    </div>
                    <div className={ui.chips}>
                      {SHIFTS.filter((s) => t.shifts.includes(s)).map((s) => <span key={s} className={ui.chip}>{s === 'morning' ? tr('V', 'AM') : tr('N', 'PM')}</span>)}
                      {t.contract === 'freelance' ? <span className={ui.chip}>{tr('HON', 'FL')}</span> : null}
                      <span className={ui.days}>{t.daysPerWeek} {t.daysPerWeek === 1 ? tr('Tag', 'day') : tr('Tage', 'days')}{t.weekdays.length < 5 ? ` · ${t.weekdays.map((d) => pick(lang, WEEKDAY_LABELS[d])).join(' ')}` : ''}</span>
                      {t.levels.map((L) => <i key={L} className={ui.lvChip} style={levelStyle(L)}>{L}</i>)}
                    </div>
                    <div>{text ? <span className={ui.abs}>{text}</span> : <span className={ui.absNone}>{tr('keine Abwesenheit', 'no absence')}</span>}</div>
                    <div>
                      {canWrite ? (
                        <FormDialog trigger="Details" size="sm" width="lg" title={t.fullName} description={tr(`Im Puzzle: ${t.shortName} · ${contractLabel(t, tr)}`, `In the puzzle: ${t.shortName} · ${contractLabel(t, tr)}`)} defaultOpen={params.teacher === t.id} titleClassName={ui.dlgTitle}>
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
