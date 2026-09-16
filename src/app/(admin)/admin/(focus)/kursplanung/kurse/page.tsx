import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Badge, Button, Card, Cell, Field, PageHeader, Select, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { courseDays } from '@/lib/admin/kursplanung/fit';
import { listPlanMonths, loadPlan, resolvePlanMonth } from '@/lib/admin/kursplanung/repo';
import { LEVELS, SHIFT_INFO, SHIFTS, type CourseGroup } from '@/lib/admin/kursplanung/types';
import { monthLabel, nextMonth } from '@/lib/admin/kursplanung/weeks';

import { addGroupAction, createMonthAction, fillFromPairsAction, removeGroupAction } from '../actions';
import { GroupForm } from '../group-form';
import { KursplanungTabs } from '../tabs';

/**
 * Kurse — the month's groups per shift, with the pair that holds each one.
 *
 * The pair is what the board calls Stamm (or Vorschlag on a course start) and
 * what "Alle Wochen aus Paaren belegen" lays down. A group can be removed only
 * while nothing is planned in it, and adding one is a plain action: the number
 * of parallel groups is a planning result of the registrations, decided here.
 */
export default async function KursePage({ searchParams }: { searchParams: Promise<{ month?: string; ok?: string; error?: string; group?: string }> }) {
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

  return (
    <>
      <PageHeader eyebrow="Management" title="Kursplanung" description={monthLabel(month)} />
      <KursplanungTabs active="kurse" month={month} months={months} notice={{ ok: params.ok, error: params.error }} />

      {canWrite && !months.includes(nextMonth(month)) ? (
        <form action={createMonthAction} className="mb-5">
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" variant="secondary" size="sm">{monthLabel(nextMonth(month))} aus {monthLabel(month)} anlegen</Button>
        </form>
      ) : null}

      <div className="space-y-6">
        {SHIFTS.map((shift) => {
          const groups = plan.groups.filter((g) => g.shift === shift);
          const otherPhase = plan.groups.find((g) => g.shift !== shift)?.phase;
          const phase: '1' | '2' = groups[0]?.phase ?? (otherPhase === '2' ? '1' : otherPhase === '1' ? '2' : '1');
          return (
            <Card
              key={shift}
              title={SHIFT_INFO[shift].label}
              description={`${phase === '1' ? 'Kursstart' : 'Fortsetzung'} · ${SHIFT_INFO[shift].time} · Paar: ${SHIFT_INFO[shift].halves.join(' / ')}`}
              actions={
                canWrite ? (
                  <>
                    <FormDialog trigger="Gruppe anlegen" size="sm" title={`Gruppe anlegen · ${SHIFT_INFO[shift].label}`} description={`${monthLabel(month)} · ${phase === '1' ? 'Kursstart' : 'Fortsetzung'} (.${phase})`}>
                      <form action={addGroupAction} className="space-y-4">
                        <input type="hidden" name="month" value={month} />
                        <input type="hidden" name="shift" value={shift} />
                        <input type="hidden" name="phase" value={phase} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <Field label="Niveau" htmlFor={`lvl-${shift}`}>
                          <Select id={`lvl-${shift}`} name="level" defaultValue="A1">
                            {LEVELS.map((l) => (
                              <option key={l} value={l}>{l}.{phase}</option>
                            ))}
                          </Select>
                        </Field>
                        <div className="flex justify-end"><Button type="submit">Anlegen</Button></div>
                      </form>
                    </FormDialog>
                    {groups.length ? (
                      <form action={fillFromPairsAction}>
                        <input type="hidden" name="month" value={month} />
                        <input type="hidden" name="shift" value={shift} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <Button type="submit" variant="secondary" size="sm">Alle Wochen aus Paaren belegen</Button>
                      </form>
                    ) : null}
                  </>
                ) : null
              }
              bleed
            >
              {groups.length === 0 ? (
                <div className="px-5 py-6 text-sm text-[var(--casa-text-subtle)]">Noch keine Gruppen in diesem Monat.</div>
              ) : (
              <Table head={['Kurs', { label: 'Anmeldungen', align: 'right' }, SHIFT_INFO[shift].halves[0], SHIFT_INFO[shift].halves[1], 'Geplant', '']}>
                {LEVELS.flatMap((level) => {
                  const lg = groups.filter((g) => g.level === level);
                  if (!lg.length) return [];
                  const total = lg.reduce((n, g) => n + g.registrations, 0);
                  return [
                    <tr key={`${level}-h`} className="bg-ws-sunk/60">
                      <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-[var(--casa-muted)]">
                        {level}.{phase} · {total} Anmeldungen · {lg.length} {lg.length === 1 ? 'Gruppe' : 'Gruppen'} · Vorschlag {Math.max(1, Math.ceil(total / 16))}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {canWrite ? (
                          <form action={addGroupAction} className="inline">
                            <input type="hidden" name="month" value={month} />
                            <input type="hidden" name="shift" value={shift} />
                            <input type="hidden" name="level" value={level} />
                            <input type="hidden" name="phase" value={phase} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <Button type="submit" variant="ghost" size="sm">+ Gruppe</Button>
                          </form>
                        ) : null}
                      </td>
                    </tr>,
                    ...lg.map((g) => {
                      const p = planned(g);
                      return (
                        <TableRow key={g.id}>
                          <Cell>
                            <span className="font-semibold">{g.level}.{g.phase}</span>
                            {lg.length > 1 ? <span className="ml-2 text-[var(--casa-text-subtle)]">Gruppe {g.groupIndex}</span> : null}
                            {g.filemakerCourseId ? <span className="ml-2 text-xs text-[var(--casa-text-subtle)]">FM {g.filemakerCourseId}</span> : null}
                          </Cell>
                          <Cell align="right">{g.registrations}</Cell>
                          <Cell>{name(g.teacherFirst)}</Cell>
                          <Cell>{name(g.teacherSecond)}</Cell>
                          <Cell>
                            <Badge tone={p.have === p.need ? 'positive' : p.have === 0 ? 'quiet' : 'warning'}>{p.have} / {p.need} Tage</Badge>
                          </Cell>
                          <Cell align="right">
                            <span className="inline-flex items-center gap-2">
                              {canWrite ? (
                                <FormDialog trigger="Bearbeiten" size="sm" title={`${g.level}.${g.phase}${lg.length > 1 ? ` · Gruppe ${g.groupIndex}` : ''}`} description="Das Paar hält den Kurs; das Brett bietet es zuerst an." defaultOpen={params.group === g.id}>
                                  <GroupForm group={g} teachers={plan.teachers} month={month} returnTo={returnTo} />
                                </FormDialog>
                              ) : null}
                              {canRemove && p.have === 0 ? (
                                <form action={removeGroupAction} className="inline">
                                  <input type="hidden" name="groupId" value={g.id} />
                                  <input type="hidden" name="month" value={month} />
                                  <input type="hidden" name="returnTo" value={returnTo} />
                                  <ConfirmSubmit title="Gruppe entfernen?" description={`${g.level}.${g.phase} Gruppe ${g.groupIndex} ist leer und wird aus ${monthLabel(month)} entfernt.`} confirmLabel="Entfernen">Entfernen</ConfirmSubmit>
                                </form>
                              ) : null}
                            </span>
                          </Cell>
                        </TableRow>
                      );
                    }),
                  ];
                })}
              </Table>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
