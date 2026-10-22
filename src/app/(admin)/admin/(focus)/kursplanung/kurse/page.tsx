import Link from 'next/link';

import { ConfirmSubmit, FormDialog, DialogFooter } from '@/components/admin/dialogs';
import { canAccess } from '@/lib/admin/access';
import { SESSION_COLOURS } from '@/lib/admin/day-plan-labels';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { levelStyle } from '@/lib/admin/kursplanung/colours';
import { courseDays } from '@/lib/admin/kursplanung/fit';
import { monthBookings } from '@/lib/admin/kursplanung/link';
import { listPlanMonths, loadPlan, resolvePlanMonth } from '@/lib/admin/kursplanung/repo';
import { LEVELS, levelName, SHIFT_INFO, SHIFTS, type CourseGroup } from '@/lib/admin/kursplanung/types';
import { monthLabel, nextMonth } from '@/lib/admin/kursplanung/weeks';

import { addGroupAction, createMonthAction, fillFromPairsAction, removeGroupAction, saveGroupAction } from '../actions';
import { AutoSaveRow } from '../auto-save-row';
import { Header } from '../header';
import ui from '../ui.module.css';
import { Select } from '@/components/admin/menu-select';

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
  const { t, lang } = await getI18n();
  const month = await resolvePlanMonth(params.month);
  const [plan, months, linked] = await Promise.all([loadPlan(month), listPlanMonths(), monthBookings(month)]);
  const seesStarts = canAccess(user, 'catalogue');
  const startDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short' });
  const canWrite = canAccess(user, 'kursplanung', 'edit');
  const canRemove = canAccess(user, 'kursplanung', 'full');
  const returnTo = '/admin/kursplanung/kurse';
  const name = (id: string | null) => (id ? plan.teachers.find((t) => t.id === id)?.shortName ?? '?' : '—');
  // Everyone planned on a group this month, most days first, covers marked (Rahman, 2026-10-22: the pair alone
  // hid who else teaches it).
  const taughtBy = (g: CourseGroup) => {
    const by = new Map<string, { days: number; cover: boolean }>();
    for (const a of plan.assignments) {
      if (a.groupId !== g.id) continue;
      const seen = by.get(a.teacherId) ?? { days: 0, cover: true };
      by.set(a.teacherId, { days: seen.days + 1, cover: seen.cover && a.isSubstitute });
    }
    return [...by.entries()].sort((a, b) => b[1].days - a[1].days).map(([id, v]) => ({ name: name(id), ...v }));
  };
  const planned = (g: CourseGroup) => {
    // The group's days inside its course: a week before the start or after the end has none.
    const need = plan.weeks.reduce((n, w) => n + courseDays(g, w).length, 0);
    const have = plan.weeks.reduce((n, w) => n + courseDays(g, w).filter((d) => plan.assignments.some((a) => a.groupId === g.id && a.onDate === d)).length, 0);
    return { have, need };
  };
  const pairOptions = (g: CourseGroup) => {
    const own = plan.teachers.filter((t) => t.isActive && t.shifts.includes(g.shift));
    const other = plan.teachers.filter((t) => t.isActive && !t.shifts.includes(g.shift));
    return (
      <>
        <option value="">—</option>
        <optgroup label={pick(lang, SHIFT_INFO[g.shift].label)}>
          {own.map((t) => (
            <option key={t.id} value={t.id}>{t.shortName}{t.levels.includes(g.level) ? '' : ` · ${g.level}?`}</option>
          ))}
        </optgroup>
        <optgroup label={t('Andere Schicht (Vertretung)', 'Other shift (cover)')}>
          {other.map((t) => (
            <option key={t.id} value={t.id}>{t.shortName}</option>
          ))}
        </optgroup>
      </>
    );
  };
  const hidden = (fields: Record<string, string>) => Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);
  const next = nextMonth(month);
  const thisLabel = monthLabel(month, lang), nextLabel = monthLabel(next, lang);
  const phaseLabel = (phase: '1' | '2') => (phase === '1' ? t('Kursstart', 'Course start') : t('Fortsetzung', 'Continuation'));

  return (
    <div className={ui.module}>
      <Header active="kurse" month={month} months={months} notice={{ ok: params.ok, error: params.error }}>
        {canWrite && !months.includes(next) ? (
          <form action={createMonthAction}>
            {hidden({ month, returnTo })}
            <button type="submit" className={ui.ghost}>{t(`${nextLabel} aus ${thisLabel} anlegen`, `Create ${nextLabel} from ${thisLabel}`)}</button>
          </form>
        ) : null}
      </Header>

      {SHIFTS.map((shift) => {
        const groups = plan.groups.filter((g) => g.shift === shift);
        const otherPhase = plan.groups.find((g) => g.shift !== shift)?.phase;
        const phase: '1' | '2' = groups[0]?.phase ?? (otherPhase === '2' ? '1' : otherPhase === '1' ? '2' : '1');
        const halves = SHIFT_INFO[shift].halves.map((h) => pick(lang, h));
        const shiftLabel = pick(lang, SHIFT_INFO[shift].label);
        return (
          <section key={shift} className={ui.section}>
            <div className={ui.shiftHead}>
              <span aria-hidden="true" className={ui.shiftDot} style={{ background: SESSION_COLOURS[shift].hex }} />
              <h2>{shiftLabel}</h2>
              <span className={ui.sub}>· {phaseLabel(phase)} (.{phase}) · {SHIFT_INFO[shift].time}</span>
              <span className={ui.spacer} />
              {canWrite && groups.length ? (
                <form action={fillFromPairsAction}>
                  {hidden({ month, shift, returnTo })}
                  <button type="submit" className={ui.ghost}>{t('Alle Gruppen aus ihren Paaren belegen', 'Fill all groups from their pairs')}</button>
                </form>
              ) : null}
              {canWrite ? (
                <FormDialog trigger={t('Gruppe anlegen', 'Add group')} size="sm" title={`${t('Gruppe anlegen', 'Add group')} · ${shiftLabel}`} description={`${thisLabel} · ${phaseLabel(phase)} (.${phase})`} titleClassName={ui.dlgTitle}>
                  <form action={addGroupAction} className={ui.module}>
                    {hidden({ month, shift, phase, returnTo })}
                    <div className={ui.sec}>
                      <label className={ui.lbl} htmlFor={`lvl-${shift}`}>{t('Niveau', 'Level')}</label>
                      <Select bare id={`lvl-${shift}`} name="level" defaultValue="A1" className={`${ui.sel} ${ui.selLg}`}>
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>{levelName(l, phase)}</option>
                        ))}
                      </Select>
                    </div>
                    <DialogFooter><button type="submit" className={ui.primary}>{t('Anlegen', 'Add')}</button></DialogFooter>
                  </form>
                </FormDialog>
              ) : null}
            </div>

            <div className={ui.card}>
              {groups.length === 0 ? (
                <div className={ui.empty}>{t('Noch keine Gruppen in diesem Monat.', 'No groups this month yet.')}</div>
              ) : (
                <table className={ui.tbl}>
                  <thead>
                    <tr>
                      <th>{t('Gruppe', 'Group')}</th>
                      <th className={ui.right}>{t('TN', 'Students')}</th>
                      <th>{halves[0]}</th>
                      <th>{halves[1]}</th>
                      <th>{t('Geplant im Monat', 'Planned this month')}</th>
                      <th>{t('Kurs', 'Course')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {LEVELS.flatMap((level) => {
                      const lg = groups.filter((g) => g.level === level);
                      if (!lg.length) return [];
                      const total = lg.reduce((n, g) => n + g.registrations, 0);
                      const suggest = Math.max(1, Math.ceil(total / 16));
                      const booked = linked.booked.get(`${level}.${phase}`) ?? 0;
                      // A phase-1 group is this month's course start; a phase-2 group the previous start's class, continued.
                      const start = level === 'C1H' ? null : linked.startOf(phase, shift);
                      return [
                        <tr key={`${level}-h`} className={ui.lvlRow}>
                          <td colSpan={6}>
                            <span className={ui.lv} style={levelStyle(level)}>{levelName(level, phase)}</span>
                            <span className={ui.meta}>
                              <span>{lg.every((g) => g.live) ? t('Teilnehmende', 'Learners') : t('Anmeldungen', 'Registrations')} <b>{total}</b></span>
                              {booked ? <span>{t('Gebucht', 'Booked')} <b>{booked}</b></span> : null}
                              <span>{t('Gruppen', 'Groups')} <b>{lg.length}</b></span>
                              {suggest !== lg.length ? <span>{t('Vorschlag', 'Suggested')} <b>{suggest}</b></span> : null}
                              {start && seesStarts ? (
                                <Link href={`/admin/catalogue/${start.id}?level=${encodeURIComponent(`${level}.1`)}#level-${level}.1`} className={ui.link}>
                                  {t(`Kursstart ${startDay(start.date)}`, `Start ${startDay(start.date)}`)}
                                </Link>
                              ) : null}
                            </span>
                          </td>
                          <td className={ui.right}>
                            {canWrite ? (
                              <form action={addGroupAction}>
                                {hidden({ month, shift, level, phase, returnTo })}
                                <button type="submit" className={`${ui.ghost} ${ui.ghostSm}`}>{t('+ Gruppe', '+ Group')}</button>
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
                                <span className={ui.name}>{levelName(g.level, g.phase)}{lg.length > 1 ? <small>{t('Gruppe', 'Group')} {g.groupIndex}</small> : null}</span>
                              </td>
                              <td className={ui.right}>
                                {/* A group of a course reads its learners live; only one of no course has a number typed. */}
                                {g.live ? (
                                  <>
                                    {canWrite ? <input form={fid} type="hidden" name="registrations" value={g.typedRegistrations} /> : null}
                                    <span className={ui.num}>{g.registrations}</span>
                                  </>
                                ) : canWrite ? (
                                  <input form={fid} name="registrations" type="number" min={0} max={999} defaultValue={g.registrations} className={`${ui.dashed} ${ui.dashedNum}`} aria-label={t('Anmeldungen', 'Registrations')} />
                                ) : (
                                  <span className={ui.num}>{g.registrations}</span>
                                )}
                              </td>
                              <td>{canWrite ? <Select bare form={fid} name="teacherFirst" defaultValue={g.teacherFirst ?? ''} className={ui.sel} aria-label={halves[0]}>{pairOptions(g)}</Select> : name(g.teacherFirst)}</td>
                              <td>{canWrite ? <Select bare form={fid} name="teacherSecond" defaultValue={g.teacherSecond ?? ''} className={ui.sel} aria-label={halves[1]}>{pairOptions(g)}</Select> : name(g.teacherSecond)}</td>
                              <td>
                                <span className={ui.prog}>
                                  <span className={ui.track}><i className={p.have === p.need ? 'done' : ''} style={{ width: `${pct}%` }} /></span>
                                  <b>{p.have} <small>/ {p.need}</small></b>
                                </span>
                                {taughtBy(g).length ? (
                                  <span className={ui.who}>
                                    {taughtBy(g).map((x) => (
                                      <span key={x.name} className={x.cover ? ui.whoCover : undefined}>
                                        {x.name} <small>{x.days}</small>
                                      </span>
                                    ))}
                                  </span>
                                ) : null}
                              </td>
                              <td>
                                {/* A group of a course opens its course, by SchoolMan's number; only one of no course has a number typed. */}
                                {g.courseId ? (
                                  <>
                                    {canWrite ? <input form={fid} type="hidden" name="filemakerCourseId" value={g.filemakerCourseId ?? ''} /> : null}
                                    {seesStarts ? (
                                      <Link href={`/admin/catalogue/courses/${g.courseId}`} className={ui.link}>
                                        {g.schoolmanNumber ? `SchoolMan ${g.schoolmanNumber}` : t('Kurs öffnen', 'Open course')}
                                      </Link>
                                    ) : (
                                      <span className={ui.num}>{g.schoolmanNumber ?? '—'}</span>
                                    )}
                                  </>
                                ) : canWrite ? (
                                  <input form={fid} name="filemakerCourseId" defaultValue={g.filemakerCourseId ?? ''} placeholder={t('Kurs-ID', 'Course ID')} maxLength={40} className={ui.dashed} aria-label={t('SchoolMan Kurs-ID', 'SchoolMan course ID')} />
                                ) : (
                                  <span className={ui.num}>{g.filemakerCourseId ?? '—'}</span>
                                )}
                              </td>
                              <td className={ui.right}>
                                <span className={ui.acts}>
                                  {canWrite && p.have < p.need ? (
                                    <form action={fillFromPairsAction}>
                                      {hidden({ month, shift, groupId: g.id, returnTo })}
                                      <button type="submit" className={`${ui.ghost} ${ui.ghostSm}`}>{t('Alle Wochen belegen', 'Fill all weeks')}</button>
                                    </form>
                                  ) : null}
                                  {canRemove && p.have === 0 ? (
                                    <form action={removeGroupAction}>
                                      {hidden({ groupId: g.id, month, returnTo })}
                                      <ConfirmSubmit
                                        title={t('Gruppe entfernen?', 'Remove group?')}
                                        description={t(
                                          `${levelName(g.level, g.phase)} Gruppe ${g.groupIndex} ist leer und wird aus ${thisLabel} entfernt.`,
                                          `${levelName(g.level, g.phase)} group ${g.groupIndex} is empty and will be removed from ${thisLabel}.`
                                        )}
                                        confirmLabel={t('Entfernen', 'Remove')}
                                      >
                                        {t('Entfernen', 'Remove')}
                                      </ConfirmSubmit>
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
