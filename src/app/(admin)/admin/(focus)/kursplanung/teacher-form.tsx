import { levelStyle } from '@/lib/admin/kursplanung/colours';
import { ABSENCE_REASONS, LEVELS, SHIFT_INFO, SHIFTS, WEEKDAYS, type Absence, type Level, type Teacher } from '@/lib/admin/kursplanung/types';
import { monthLabel, weekdayOf, type PlanningWeek } from '@/lib/admin/kursplanung/weeks';

import { saveTeacherAction } from './actions';
import ui from './ui.module.css';

/**
 * The teacher dialog: the rules that shape a piece, and the month's absences.
 *
 * Pills throughout — native checkboxes and radios dressed as the prototype's
 * options, so the form posts without JavaScript and looks like the one the
 * planners approved. Absences are one row per planning week: tick the days,
 * pick the reason. Rows FileMaker wrote are shown but stay the bridge's to change.
 */
function Opt({ type, name, value, checked, label, level }: { type: 'checkbox' | 'radio'; name: string; value: string; checked: boolean; label: string; level?: Level }) {
  return (
    <label className={`${ui.opt} ${level ? ui.optLvl : ''}`} style={level ? levelStyle(level) : undefined}>
      <input type={type} name={name} value={value} defaultChecked={checked} />
      <span>{label}</span>
    </label>
  );
}

export function TeacherForm({
  teacher,
  month,
  weeks,
  absences,
  returnTo,
}: {
  teacher: Teacher;
  month: string;
  weeks: readonly PlanningWeek[];
  absences: readonly Absence[];
  returnTo: string;
}) {
  const id = `t-${teacher.id.slice(0, 8)}`;
  return (
    <form action={saveTeacherAction} className={ui.module}>
      <input type="hidden" name="teacherId" value={teacher.id} />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="returnTo" value={returnTo} />

      <div className={ui.sec}>
        <span className={ui.lbl}>Einsatz</span>
        <div className={ui.row}>
          <div className={ui.f}>
            <span className={ui.lbl}>Schicht</span>
            <div className={ui.opts}>
              {SHIFTS.map((s) => <Opt key={s} type="checkbox" name="shifts" value={s} checked={teacher.shifts.includes(s)} label={SHIFT_INFO[s].label} />)}
            </div>
          </div>
          <div className={ui.f}>
            <span className={ui.lbl}>Tage pro Woche</span>
            <div className={ui.opts}>
              {[1, 2, 3, 4, 5].map((n) => <Opt key={n} type="radio" name="daysPerWeek" value={String(n)} checked={teacher.daysPerWeek === n} label={String(n)} />)}
            </div>
          </div>
        </div>
        <div className={ui.row}>
          <div className={ui.f}>
            <span className={ui.lbl}>Vertrag</span>
            <div className={ui.opts}>
              <Opt type="radio" name="contract" value="employed" checked={teacher.contract === 'employed'} label="angestellt" />
              <Opt type="radio" name="contract" value="freelance" checked={teacher.contract === 'freelance'} label="Honorarkraft" />
            </div>
          </div>
        </div>
      </div>

      <div className={ui.sec}>
        <span className={ui.lbl}>Mögliche Wochentage</span>
        <div className={ui.opts}>
          {WEEKDAYS.map((d) => <Opt key={d} type="checkbox" name="weekdays" value={d} checked={teacher.weekdays.includes(d)} label={d} />)}
        </div>
      </div>

      <div className={ui.sec}>
        <span className={ui.lbl}>Niveaus · bestimmen, wo das Teil passt</span>
        <div className={ui.opts}>
          {LEVELS.map((L) => <Opt key={L} type="checkbox" name="levels" value={L} checked={teacher.levels.includes(L)} label={L} level={L} />)}
        </div>
      </div>

      <div className={ui.sec}>
        <span className={ui.lbl}>Abwesenheiten {monthLabel(month)}</span>
        {weeks.map((w) => {
          const mine = absences.filter((a) => w.days.includes(a.onDate));
          const checked = mine.map((a) => weekdayOf(a.onDate));
          const reason = mine[0]?.reason ?? 'Urlaub';
          return (
            <div key={w.start} className={ui.absrow}>
              <span className={ui.kw}>KW {w.kw}<small>{w.label}</small></span>
              <div className={ui.dd}>
                {WEEKDAYS.map((d) => <Opt key={d} type="checkbox" name={`abs_${w.start}`} value={d} checked={checked.includes(d)} label={d} />)}
              </div>
              <select name={`reason_${w.start}`} defaultValue={reason} className={ui.sel} aria-label={`Grund KW ${w.kw}`}>
                {ABSENCE_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div className={ui.sec}>
        <div className={ui.row}>
          <div className={`${ui.f} ${ui.grow}`}>
            <label className={ui.lbl} htmlFor={`${id}-short`}>Name auf dem Brett</label>
            <input id={`${id}-short`} name="shortName" defaultValue={teacher.shortName} required maxLength={40} className={ui.input} />
          </div>
          <div className={`${ui.f} ${ui.grow}`} style={{ flex: 2 }}>
            <label className={ui.lbl} htmlFor={`${id}-note`}>Hinweis</label>
            <input id={`${id}-note`} name="note" defaultValue={teacher.note ?? ''} maxLength={200} placeholder="z. B. ab Oktober freigestellt" className={ui.input} />
          </div>
        </div>
      </div>

      <div className={ui.foot}>
        <button type="submit" className={ui.primary}>Speichern</button>
      </div>
    </form>
  );
}
