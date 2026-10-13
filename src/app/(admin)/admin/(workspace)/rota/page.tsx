import Link from 'next/link';

import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Avatar, dayRange, ListEmpty } from '@/components/admin/list';
import { Button, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { addDays, isoWeek, weekStartOf } from '@/lib/admin/kursplanung/weeks';
import { absencesFrom, isAwayOn, officeDay, rotaSpan } from '@/lib/admin/rota';
import { ABSENCE_LABELS } from '@/lib/admin/rota-rules';
import { todayInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';

import { AbsenceForm } from './absence-form';
import { copyLastWeekAction, deleteAbsenceAction } from './actions';
import { ShiftCell } from './shift-cell';

/**
 * The rota — who is at the office desk when, and who is away: FileMaker's
 * "Shift | Reception" and "Reception | Administration" columns, as a week.
 *
 * A row a colleague, a column a weekday; a cell is the shift, set in a small
 * panel. Under the week, whether reception is covered through the office
 * hours the public site states, day by day — what FileMaker left to the eye.
 * "Copy last week" plans a week in one click, since the rota repeats more
 * than it changes; it leaves a day someone is away empty.
 *
 * Who may: everyone sees it (`view`), planning is `edit`, deleting an absence
 * `full`. An absence's reason and note show only at `edit`: "sick" is
 * personal data, and a note may say why.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

export default async function RotaPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; ok?: string; error?: string }>;
}) {
  const [params, user] = await Promise.all([searchParams, requireModule('rota')]);
  const canEdit = canAccess(user, 'rota', 'edit');
  const canDelete = canAccess(user, 'rota', 'full');
  const today = todayInputValue();
  const monday = weekStartOf(DATE.test(params.week ?? '') ? params.week! : today);
  const days = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
  const friday = days[4];
  const thisWeek = weekStartOf(today);

  const [{ staff, shifts, absences }, upcoming] = await Promise.all([rotaSpan(monday, friday), absencesFrom(monday)]);
  const office = new Map(days.map((d) => [d, officeDay(d, shifts, absences)]));
  const planned = shifts.length > 0;
  const weekHref = (m: string) => (m === thisWeek ? '/admin/rota' : `/admin/rota?week=${m}`);
  const label = (d: string) => {
    const date = new Date(`${d}T00:00:00`);
    return { weekday: date.toLocaleDateString('en-GB', { weekday: 'short' }), day: date.getDate() };
  };
  const copied = /^copied-(\d+)$/.exec(params.ok ?? '')?.[1];

  return (
    <>
      <PageHeader
        title="Rota"
        actions={
          canEdit ? (
            <FormDialog trigger="Add an absence" title="An absence" size="md">
              <AbsenceForm staff={staff} week={monday} firstDay={days.includes(today) ? today : monday} />
            </FormDialog>
          ) : undefined
        }
      />

      {params.error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {params.error}
        </p>
      ) : copied !== undefined ? (
        <p role="status" className="mb-4 text-sm font-medium text-[var(--casa-muted)]">
          {copied === '0' ? 'Nothing to copy from the week before.' : `${copied} ${copied === '1' ? 'shift' : 'shifts'} copied from the week before.`}
        </p>
      ) : null}

      <Card bleed overflow="visible" className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-3xl border-b border-ws-line px-5 py-2.5">
          <h2 className="text-sm font-extrabold text-[var(--casa-ink)]">
            Week {isoWeek(monday)}
            <span className="ml-2 font-semibold text-[var(--casa-text-subtle)]">
              {(() => {
                const [, am, ad] = monday.split('-').map(Number);
                const [, bm, bd] = friday.split('-').map(Number);
                return am === bm ? `${ad}–${bd} ${MONTHS[bm - 1]}` : `${ad} ${MONTHS[am - 1]} – ${bd} ${MONTHS[bm - 1]}`;
              })()}
            </span>
          </h2>
          <div className="flex items-center gap-1.5">
            {canEdit ? (
              <form action={copyLastWeekAction}>
                <input type="hidden" name="week" value={monday} />
                <Button type="submit" variant="secondary" size="sm">
                  Copy last week
                </Button>
              </form>
            ) : null}
            {monday !== thisWeek ? (
              <Link href="/admin/rota" className="flex h-8 items-center rounded-lg border border-ws-line bg-white px-3 text-xs font-semibold text-[var(--casa-ink)] transition-colors hover:border-ws-line-firm">
                This week
              </Link>
            ) : null}
            <Link href={weekHref(addDays(monday, -7))} aria-label="Previous week" className="flex size-8 items-center justify-center rounded-lg text-[var(--casa-text-subtle)] transition-colors hover:bg-ws-sunk hover:text-[var(--casa-ink)]">
              <Chevron left />
            </Link>
            <Link href={weekHref(addDays(monday, 7))} aria-label="Next week" className="flex size-8 items-center justify-center rounded-lg text-[var(--casa-text-subtle)] transition-colors hover:bg-ws-sunk hover:text-[var(--casa-ink)]">
              <Chevron />
            </Link>
          </div>
        </div>

        {/* The week: a colleague a row, a weekday a column. On a phone each colleague is a block with the five days under the name. */}
        <div className="text-sm">
          <div className="hidden border-b border-ws-line-soft px-3 md:grid md:grid-cols-[minmax(11rem,1.2fr)_repeat(5,minmax(0,1fr))]">
            <span className="px-2 py-2.5 text-xs font-medium text-[var(--casa-text-subtle)]">Colleague</span>
            {days.map((d) => {
              const l = label(d);
              return (
                <span key={d} className={cn('px-2 py-2.5 text-xs font-semibold', d === today ? 'text-[var(--casa-accent-text)]' : 'text-[var(--casa-muted)]')}>
                  {l.weekday} <span className="font-extrabold">{l.day}</span>
                </span>
              );
            })}
          </div>

          {staff.map((colleague) => (
            <div
              key={colleague.id}
              className="grid grid-cols-[4.25rem_minmax(0,1fr)] items-center border-b border-ws-line-soft px-3 py-1.5 md:grid-cols-[minmax(11rem,1.2fr)_repeat(5,minmax(0,1fr))] md:py-1"
            >
              <span className="col-span-2 flex items-center gap-2.5 px-2 py-1.5 md:col-span-1">
                <Avatar name={colleague.name} staff size="sm" />
                <span className="truncate font-semibold text-[var(--casa-ink)]">{colleague.name}</span>
              </span>
              {days.map((d, i) => {
                const l = label(d);
                return [
                  <span key={`${d}-l`} className="px-2 text-xs font-semibold text-[var(--casa-muted)] md:hidden">
                    {l.weekday} {l.day}
                  </span>,
                  <div key={d} className="min-w-0">
                    <ShiftCell
                      colleague={colleague}
                      day={d}
                      week={monday}
                      shift={shifts.find((s) => s.staffUserId === colleague.id && s.onDate === d) ?? null}
                      absence={isAwayOn(absences, colleague.id, d)}
                      canEdit={canEdit}
                      showReason={canEdit}
                      align={i >= 3 ? 'right' : 'left'}
                    />
                  </div>,
                ];
              })}
            </div>
          ))}

          {/* Reception through the office hours, day by day — only once the week has shifts, so an unplanned week is not five alarms. */}
          <div className="grid grid-cols-[4.25rem_minmax(0,1fr)] rounded-b-3xl bg-[#f8fafc] px-3 py-2 md:grid-cols-[minmax(11rem,1.2fr)_repeat(5,minmax(0,1fr))]">
            <span className="col-span-2 px-2 py-1.5 text-xs font-bold text-[var(--casa-muted)] md:col-span-1">Reception</span>
            {days.map((d) => {
              const day = office.get(d)!;
              const l = label(d);
              return [
                <span key={`${d}-l`} className="px-2 py-1 text-xs font-semibold text-[var(--casa-muted)] md:hidden">
                  {l.weekday} {l.day}
                </span>,
                <div key={d} className="px-2 py-1 text-xs">
                  {!planned ? null : day.gaps.length === 0 ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#137a3c]">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-[#16a34a]" />
                      Covered
                    </span>
                  ) : (
                    day.gaps.map((g) => (
                      <span key={g.from} className="block font-semibold text-[#9a5b00] tabular-nums">
                        {g.from}–{g.to} open
                      </span>
                    ))
                  )}
                </div>,
              ];
            })}
          </div>
        </div>
      </Card>

      <Card title="Absences" icon={Icon.calendar} tint="blue" bleed>
        {upcoming.length === 0 ? (
          <ListEmpty title="Nobody is away" />
        ) : (
          <Table
            head={[
              'Colleague',
              { label: 'When', className: 'w-[13rem]' },
              ...(canEdit ? [{ label: 'Reason', className: 'hidden w-[9rem] md:table-cell' }] : []),
              ...(canEdit ? [{ label: 'Note', className: 'hidden md:table-cell' }, { label: '', className: 'w-[9rem]' }] : []),
            ]}
          >
            {upcoming.map((a) => (
              <TableRow key={a.id}>
                <Cell>
                  <span className="flex items-center gap-2.5">
                    <Avatar name={a.staffName} staff size="sm" />
                    <span className="font-semibold">{a.staffName}</span>
                  </span>
                </Cell>
                <Cell className="whitespace-nowrap text-[#2b3546] tabular-nums">{dayRange(a.fromDate, a.toDate)}</Cell>
                {canEdit ? <Cell className="hidden text-[var(--casa-muted)] md:table-cell">{ABSENCE_LABELS[a.reason]}</Cell> : null}
                {canEdit ? <Cell className="hidden max-w-0 truncate text-[var(--casa-muted)] md:table-cell">{a.note}</Cell> : null}
                {canEdit ? (
                  <Cell align="right">
                    <span className="flex justify-end gap-1">
                      <FormDialog trigger="Edit" title="An absence" triggerVariant="ghost" size="sm">
                        <AbsenceForm staff={staff} week={monday} absence={a} firstDay={a.fromDate} />
                      </FormDialog>
                      {canDelete ? (
                        <form action={deleteAbsenceAction}>
                          <input type="hidden" name="week" value={monday} />
                          <input type="hidden" name="id" value={a.id} />
                          <ConfirmSubmit title="Remove this absence?" description={`${a.staffName} shows as in the office again on those days.`} confirmLabel="Remove" variant="ghost">
                            Remove
                          </ConfirmSubmit>
                        </form>
                      ) : null}
                    </span>
                  </Cell>
                ) : null}
              </TableRow>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}

function Chevron({ left = false }: { left?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={left ? 'M10 3.5 5.5 8l4.5 4.5' : 'm6 3.5 4.5 4.5L6 12.5'} />
    </svg>
  );
}
