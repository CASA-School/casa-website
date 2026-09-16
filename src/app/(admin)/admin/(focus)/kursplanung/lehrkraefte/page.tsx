import { FormDialog } from '@/components/admin/dialogs';
import { Badge, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { listPlanMonths, loadPlan, resolvePlanMonth } from '@/lib/admin/kursplanung/repo';
import { SHIFT_INFO, type Shift } from '@/lib/admin/kursplanung/types';
import { monthLabel } from '@/lib/admin/kursplanung/weeks';

import { KursplanungTabs } from '../tabs';
import { TeacherForm } from '../teacher-form';

/**
 * Lehrkräfte — the teaching staff and the rules that shape each piece.
 *
 * A quiet list; everything is edited in the dialog. `?teacher=<id>` opens it
 * straight away, which is how the board's "Lehrkraft-Details" arrives here.
 */
export default async function LehrkraeftePage({ searchParams }: { searchParams: Promise<{ month?: string; ok?: string; error?: string; teacher?: string }> }) {
  const [params, user] = await Promise.all([searchParams, requireModule('kursplanung')]);
  const month = await resolvePlanMonth(params.month);
  const [plan, months] = await Promise.all([loadPlan(month), listPlanMonths()]);
  const canWrite = canAccess(user, 'kursplanung', 'edit');
  const returnTo = '/admin/kursplanung/lehrkraefte';
  const order = (s: readonly Shift[]) => (s.length > 1 ? 2 : s[0] === 'morning' ? 0 : 1);
  const teachers = plan.teachers.filter((t) => t.isActive).sort((a, b) => order(a.shifts) - order(b.shifts) || a.shortName.localeCompare(b.shortName, 'de'));
  const shiftLabel = (s: readonly Shift[]) => (s.length > 1 ? 'Beide' : SHIFT_INFO[s[0]].label);

  return (
    <>
      <PageHeader eyebrow="Management" title="Kursplanung" description={monthLabel(month)} />
      <KursplanungTabs active="lehrkraefte" month={month} months={months} notice={{ ok: params.ok, error: params.error }} />

      <Card title="Lehrkräfte" description={`${teachers.length} aktiv · Tage pro Woche = Länge des Teils, Niveaus = wo es passt`} bleed>
        <Table head={['Name', 'Auf dem Brett', 'Schicht', { label: 'Tage / Woche', align: 'right' }, 'Wochentage', 'Niveaus', 'Abwesend', '']}>
          {teachers.map((t) => {
            const absences = plan.absences.filter((a) => a.teacherId === t.id);
            return (
              <TableRow key={t.id}>
                <Cell>
                  <span className="font-semibold">{t.fullName}</span>
                  {t.contract === 'freelance' ? <Badge tone="quiet" className="ml-2">Honorar</Badge> : null}
                  {t.note ? <span className="block text-xs text-[var(--casa-text-subtle)]">{t.note}</span> : null}
                </Cell>
                <Cell>{t.shortName}</Cell>
                <Cell>{shiftLabel(t.shifts)}</Cell>
                <Cell align="right">{t.daysPerWeek}</Cell>
                <Cell>{t.weekdays.length === 5 ? 'Mo–Fr' : t.weekdays.join(' ')}</Cell>
                <Cell>{t.levels.length ? t.levels.join(', ') : <span className="text-[var(--casa-text-subtle)]">—</span>}</Cell>
                <Cell>{absences.length ? <Badge tone="warning">{absences.length} {absences.length === 1 ? 'Tag' : 'Tage'}</Badge> : <span className="text-[var(--casa-text-subtle)]">—</span>}</Cell>
                <Cell align="right">
                  {canWrite ? (
                    <FormDialog trigger="Details" size="sm" width="lg" title={t.fullName} description={`Regeln und Abwesenheiten für ${monthLabel(month)}`} defaultOpen={params.teacher === t.id}>
                      <TeacherForm teacher={t} month={month} weeks={plan.weeks} absences={absences} returnTo={returnTo} />
                    </FormDialog>
                  ) : null}
                </Cell>
              </TableRow>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
