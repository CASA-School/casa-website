import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { levelStyle } from '@/lib/admin/kursplanung/colours';
import { courseDays } from '@/lib/admin/kursplanung/fit';
import { listPlanMonths, loadPlan, resolvePlanMonth } from '@/lib/admin/kursplanung/repo';
import { LEVELS, SHIFT_INFO, SHIFTS, type CourseGroup } from '@/lib/admin/kursplanung/types';
import { monthLabel, nextMonth } from '@/lib/admin/kursplanung/weeks';

import { addGroupAction, createMonthAction, fillFromPairsAction, removeGroupAction, saveGroupAction } from '../actions';
import { AutoSaveRow } from '../auto-save-row';
import { Header } from '../header';
import ui from '../ui.module.css';

/**
 * Kurse — the month's groups per shift, with the pair that holds each one.
 *
 * The pair is what the board calls Stamm (or Vorschlag on a course start) and
 * what "Alle Gruppen aus ihren Paaren belegen" lays down. Everything on a row
 * is edited in place and saves itself — a dropdown on change, a field when it
 * is left — through one form per row that the controls name (`form=`), since
 * a form cannot span table cells. A group can be removed only while nothing is
 * planned in it; adding one is a plain action, because the number of parallel
 * groups is a planning result of the registrations, decided here.
 */
export default async function KursePage({ searchParams }: { searchParams: Promise<{ month?: string; ok?: string; error?: string }> }) {
  const [params, user] = await Promise.all([searchParams, requireModule('kursplanung')]);
  const month = await resolvePlanMonth(params.month);
  const [plan, months] = await Promise.all([loadPlan(month), listPlanMonths()]);
  const canWrite = canAccess(user, 'kursplanung', 'edit');
  const canRemove = canAccess(user, 'kursplanung', 'full');
  const returnTo = '/admin/kursplanung/kurse';
  const name = (id: string | null) => (id ? plan.teachers.find((t) => t.id === id)?.shortName ?? '?' : '—');
  const planned = (g: CourseGroup) => {
    const need = plan.weeks.length * SHIFT_INFO[g.shift].days;
    const have = plan.weeks.reduce((n, w) => n + courseDays(g, w).filter((d) => plan.assignments.some((a) => a.groupId === g.id && a.onDate === d)).length, 0);
    return { have, need };
  };
  const pairOptions = (g: CourseGroup) => {
    const own = plan.teachers.filter((t) => t.isActive && t.shifts.includes(g.shift));
    const other = plan.teachers.filter((t) => t.isActive && !t.shifts.includes(g.shift));
    return (
      <>
        <option value="">—</option>
        <optgroup label={SHIFT_INFO[g.shift].label}>
          {own.map((t) => (
            <option key={t.id} value={t.id}>{t.shortName}{t.levels.includes(g.level) ? '' : ` · ${g.level}?`}</option>
          ))}
        </optgroup>
        <optgroup label="Andere Schicht (Vertretung)">
          {other.map((t) => (
            <option key={t.id} value={t.id}>{t.shortName}</option>
          ))}
        </optgroup>
      </>
    );
  };
  const hidden = (fields: Record<string, string>) => Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);
  const next = nextMonth(month);

  return (
    <div className={ui.module}>
      <Header active="kurse" month={month} months={months} notice={{ ok: params.ok, error: params.error }}>
        {canWrite && !months.includes(next) ? (
          <form action={createMonthAction}>
            {hidden({ month, returnTo })}
            <button type="submit" className={ui.ghost}>{monthLabel(next)} aus {monthLabel(month)} anlegen</button>
          </form>
        ) : null}
      </Header>

      {SHIFTS.map((shift) => {
        const groups = plan.groups.filter((g) => g.shift === shift);
        const otherPhase = plan.groups.find((g) => g.shift !== shift)?.phase;
        const phase: '1' | '2' = groups[0]?.phase ?? (otherPhase === '2' ? '1' : otherPhase === '1' ? '2' : '1');
        const halves = SHIFT_INFO[shift].halves;
        return (
          <section key={shift} className={ui.section}>
            <div className={ui.shiftHead}>
              <h2>{SHIFT_INFO[shift].label}</h2>
              <span className={ui.sub}>· {phase === '1' ? 'Kursstart' : 'Fortsetzung'} (.{phase}) · {SHIFT_INFO[shift].time}</span>
              <span className={ui.spacer} />
              {canWrite && groups.length ? (
                <form action={fillFromPairsAction}>
                  {hidden({ month, shift, returnTo })}
                  <button type="submit" className={ui.ghost}>Alle Gruppen aus ihren Paaren belegen</button>
                </form>
              ) : null}
              {canWrite ? (
                <FormDialog trigger="Gruppe anlegen" size="sm" title={`Gruppe anlegen · ${SHIFT_INFO[shift].label}`} description={`${monthLabel(month)} · ${phase === '1' ? 'Kursstart' : 'Fortsetzung'} (.${phase})`} titleClassName={ui.dlgTitle}>
                  <form action={addGroupAction} className={ui.module}>
                    {hidden({ month, shift, phase, returnTo })}
                    <div className={ui.sec}>
                      <label className={ui.lbl} htmlFor={`lvl-${shift}`}>Niveau</label>
                      <select id={`lvl-${shift}`} name="level" defaultValue="A1" className={`${ui.sel} ${ui.selLg}`}>
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>{l}.{phase}</option>
                        ))}
                      </select>
                    </div>
                    <div className={ui.foot}><button type="submit" className={ui.primary}>Anlegen</button></div>
                  </form>
                </FormDialog>
              ) : null}
            </div>

            <div className={ui.card}>
              {groups.length === 0 ? (
                <div className={ui.empty}>Noch keine Gruppen in diesem Monat.</div>
              ) : (
                <table className={ui.tbl}>
                  <thead>
                    <tr>
                      <th>Gruppe</th>
                      <th className={ui.right}>TN</th>
                      <th>{halves[0]}</th>
                      <th>{halves[1]}</th>
                      <th>Geplant im Monat</th>
                      <th>FileMaker</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {LEVELS.flatMap((level) => {
                      const lg = groups.filter((g) => g.level === level);
                      if (!lg.length) return [];
                      const total = lg.reduce((n, g) => n + g.registrations, 0);
                      const suggest = Math.max(1, Math.ceil(total / 16));
                      return [
                        <tr key={`${level}-h`} className={ui.lvlRow}>
                          <td colSpan={6}>
                            <span className={ui.lv} style={levelStyle(level)}>{level}.{phase}</span>
                            <span className={ui.meta}>
                              <span>Anmeldungen <b>{total}</b></span>
                              <span>Gruppen <b>{lg.length}</b></span>
                              {suggest !== lg.length ? <span>Vorschlag <b>{suggest}</b></span> : null}
                            </span>
                          </td>
                          <td className={ui.right}>
                            {canWrite ? (
                              <form action={addGroupAction}>
                                {hidden({ month, shift, level, phase, returnTo })}
                                <button type="submit" className={`${ui.ghost} ${ui.ghostSm}`}>+ Gruppe</button>
                              </form>
                            ) : null}
                          </td>
                        </tr>,
                        ...lg.map((g) => {
                          const p = planned(g);
                          const fid = `g-${g.id}`;
                          const pct = p.need ? Math.round((p.have / p.need) * 100) : 0;
                          return (
                            <AutoSaveRow key={g.id}>
                              <td>
                                {canWrite ? (
                                  <form id={fid} action={saveGroupAction}>
                                    {hidden({ groupId: g.id, month, returnTo })}
                                    <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
                                  </form>
                                ) : null}
                                <span className={ui.name}>{g.level}.{g.phase}{lg.length > 1 ? <small>Gruppe {g.groupIndex}</small> : null}</span>
                              </td>
                              <td className={ui.right}>
                                {canWrite ? <input form={fid} name="registrations" type="number" min={0} max={999} defaultValue={g.registrations} className={`${ui.dashed} ${ui.dashedNum}`} aria-label="Anmeldungen" /> : <span className={ui.num}>{g.registrations}</span>}
                              </td>
                              <td>{canWrite ? <select form={fid} name="teacherFirst" defaultValue={g.teacherFirst ?? ''} className={ui.sel} aria-label={halves[0]}>{pairOptions(g)}</select> : name(g.teacherFirst)}</td>
                              <td>{canWrite ? <select form={fid} name="teacherSecond" defaultValue={g.teacherSecond ?? ''} className={ui.sel} aria-label={halves[1]}>{pairOptions(g)}</select> : name(g.teacherSecond)}</td>
                              <td>
                                <span className={ui.prog}>
                                  <span className={ui.track}><i className={p.have === p.need ? 'done' : ''} style={{ width: `${pct}%` }} /></span>
                                  <b>{p.have} <small>/ {p.need}</small></b>
                                </span>
                              </td>
                              <td>{canWrite ? <input form={fid} name="filemakerCourseId" defaultValue={g.filemakerCourseId ?? ''} placeholder="Kurs-ID" maxLength={40} className={ui.dashed} aria-label="FileMaker Kurs-ID" /> : <span className={ui.num}>{g.filemakerCourseId ?? '—'}</span>}</td>
                              <td className={ui.right}>
                                <span className={ui.acts}>
                                  {canWrite && p.have < p.need ? (
                                    <form action={fillFromPairsAction}>
                                      {hidden({ month, shift, groupId: g.id, returnTo })}
                                      <button type="submit" className={`${ui.ghost} ${ui.ghostSm}`}>Alle Wochen belegen</button>
                                    </form>
                                  ) : null}
                                  {canRemove && p.have === 0 ? (
                                    <form action={removeGroupAction}>
                                      {hidden({ groupId: g.id, month, returnTo })}
                                      <ConfirmSubmit title="Gruppe entfernen?" description={`${g.level}.${g.phase} Gruppe ${g.groupIndex} ist leer und wird aus ${monthLabel(month)} entfernt.`} confirmLabel="Entfernen">Entfernen</ConfirmSubmit>
                                    </form>
                                  ) : null}
                                </span>
                              </td>
                            </AutoSaveRow>
                          );
                        }),
                      ];
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
