import Link from 'next/link';
import type { ReactNode } from 'react';

import { DateFormField } from '@/components/admin/date-picker';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Badge, Button, Card, Cell, EmptyState, Field, Input, PageHeader, Select, Table, TableRow, type Tint } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import {
  FEES,
  listOn,
  listStatus,
  nextYearStart,
  priceAt,
  slotKey,
  type FeeCode,
  type PriceList,
  type PriceListStatus,
  type PriceUnit,
  type Slot,
} from '@/lib/admin/prices/price-list';
import { loadPriceLists, priceListSubjects } from '@/lib/admin/prices/repo';
import { todayInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { deletePriceListAction, preparePriceListAction, savePricesAction } from './actions';

/**
 * Prices — every amount an offer or a booking is priced from, as a list per
 * year. Finance's and management's (module `prices`). The list in force is
 * shown first; next year's is prepared as a copy and changed where it
 * changes, and takes over on its date. A list that has ended is read only.
 * docs/CATALOGUE_AND_PRICING.md §Price lists.
 */

const INTENSIVE = 'intensive-german';
const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const RENT_WEEKS = [1, 2, 3];

const money = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
const typed = (n: number | undefined) => (n == null ? '' : n.toFixed(2).replace('.', ',').replace(/,00$/, ''));
const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const weeksLabel = (n: number) => (n === 1 ? '1 week' : `${n} weeks`);

const UNIT_LABEL: Record<PriceUnit, string> = { lesson: 'per lesson', week: 'per week', item: 'per course' };
const FEE_LABEL: Record<FeeCode, { name: string; sub: string }> = {
  enrolment_fee: { name: 'Enrolment fee', sub: 'Once per learner' },
  accommodation_placement_fee: { name: 'Placement fee', sub: 'On a first stay' },
  deposit: { name: 'Deposit', sub: 'On a first stay, refundable' },
};

const STATUS_WORD: Record<PriceListStatus, (l: PriceList) => string> = {
  current: () => 'In force',
  future: (l) => `From ${longDate(l.validFrom)}`,
  past: (l) => `Until ${l.validTo ? longDate(l.validTo) : ''}`,
};

export default async function PricesPage({ searchParams }: { searchParams: Promise<{ list?: string; error?: string; saved?: string }> }) {
  const [sp, user] = await Promise.all([searchParams, requireModule('prices')]);
  const today = todayInputValue();
  const [lists, subjects] = await Promise.all([loadPriceLists(), priceListSubjects()]);
  const selected = lists.find((l) => l.validFrom === sp.list) ?? listOn(lists, today);
  const newest = lists[lists.length - 1] ?? null;
  const status = selected ? listStatus(selected, today) : null;
  const canEdit = canAccess(user, 'prices', 'edit') && status !== 'past';
  const canDelete = canAccess(user, 'prices', 'full') && status === 'future';
  const canPrepare = canAccess(user, 'prices', 'edit') && newest != null && listStatus(newest, today) !== 'future';
  const nextStart = nextYearStart(today);

  return (
    <>
      <PageHeader
        backHref="/admin/settings"
        backLabel="Settings"
        title="Prices"
        actions={
          canPrepare ? (
            <FormDialog trigger={`Prepare ${nextStart.slice(0, 4)}`} title={`Price list from ${nextStart.slice(0, 4)}`} description="A copy of the prices in force, to change where they change." triggerVariant="primary">
              <form action={preparePriceListAction} className="space-y-4">
                <Field label="In force from" htmlFor="prices-from">
                  <DateFormField id="prices-from" name="validFrom" defaultValue={nextStart} min={today} required />
                </Field>
                <div className="flex justify-end">
                  <Button type="submit">Prepare the list</Button>
                </div>
              </form>
            </FormDialog>
          ) : null
        }
      />

      {lists.length > 1 ? (
        <nav aria-label="Price lists" className="mb-4 inline-flex gap-0.5 rounded-xl border border-ws-line bg-white p-1">
          {lists.map((l) => {
            const on = l.validFrom === selected?.validFrom;
            return (
              <Link
                key={l.validFrom}
                href={`/admin/settings/prices?list=${l.validFrom}`}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'inline-flex h-[30px] items-center gap-2 rounded-lg px-3.5 text-[0.8rem] font-bold transition-colors',
                  'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
                  on ? 'bg-[var(--casa-ink-deep)] text-white' : 'text-[var(--casa-muted)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]'
                )}
              >
                {l.validFrom.endsWith('-01-01') ? l.validFrom.slice(0, 4) : longDate(l.validFrom)}
                <span className={cn('font-semibold', on ? 'text-white/70' : 'text-[var(--casa-text-subtle)]')}>{STATUS_WORD[listStatus(l, today)](l)}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}

      {sp.error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {sp.error}
        </p>
      ) : null}
      {sp.saved ? (
        <p role="status" className="mb-4 rounded-lg border border-[#137a3c]/25 bg-[#e5f5eb] px-4 py-3 text-sm font-semibold text-[#137a3c]">
          {sp.saved === '0' ? 'Nothing changed.' : sp.saved === '1' ? '1 price saved.' : `${sp.saved} prices saved.`}
        </p>
      ) : null}

      {!selected ? (
        <EmptyState title="No price list yet" description="Prices arrive with the database's seeds." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-ws-line bg-white px-4 py-3">
            <span className="flex flex-wrap items-center gap-2.5 text-sm">
              <Badge tone={status === 'current' ? 'positive' : status === 'future' ? 'warning' : 'quiet'}>
                {status === 'current' ? 'In force' : status === 'future' ? 'Not yet in force' : 'Ended'}
              </Badge>
              <span className="font-semibold text-[var(--casa-ink)]">
                {status === 'future' ? `Takes effect on ${longDate(selected.validFrom)}` : `From ${longDate(selected.validFrom)}`}
                {selected.validTo ? ` until ${longDate(selected.validTo)}` : ''}
              </span>
            </span>
            {canDelete ? (
              <form action={deletePriceListAction}>
                <input type="hidden" name="list" value={selected.validFrom} />
                <ConfirmSubmit
                  title="Delete this price list?"
                  description={`The prices from ${longDate(selected.validFrom)} are removed, and the list before them stays in force.`}
                  confirmLabel="Delete the list"
                >
                  Delete
                </ConfirmSubmit>
              </form>
            ) : null}
          </div>

          <PriceCards list={selected} subjects={subjects} canEdit={canEdit} />
        </>
      )}
    </>
  );
}

type Subjects = Awaited<ReturnType<typeof priceListSubjects>>;

type Row = { slot: Slot; label: ReactNode; sub?: string; units?: readonly PriceUnit[] };

function PriceCards({ list, subjects, canEdit }: { list: PriceList; subjects: Subjects; canEdit: boolean }) {
  const intensive = subjects.courses.find((c) => c.slug === INTENSIVE);
  const others = subjects.courses.filter((c) => c.slug !== INTENSIVE);
  const levelled = subjects.books.filter((b) => b.level);
  const otherBooks = subjects.books.filter((b) => !b.level);

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      {intensive ? (
        <PriceCard
          title={intensive.name}
          icon={Icon.catalogue}
          tint="red"
          list={list}
          canEdit={canEdit}
          rows={[
            ...WEEKS.map((w) => ({ slot: { kind: 'course', slug: INTENSIVE, weeks: w } as Slot, label: weeksLabel(w) })),
            { slot: { kind: 'course', slug: INTENSIVE, weeks: null }, label: 'Longer, per week', units: ['week'] },
          ]}
        />
      ) : null}

      <div className="space-y-4">
        {others.length ? (
          <PriceCard
            title="Other courses"
            icon={Icon.calendar}
            tint="red"
            list={list}
            canEdit={canEdit}
            rows={others.map((c) => ({ slot: { kind: 'course', slug: c.slug, weeks: null } as Slot, label: c.name, units: ['lesson', 'week', 'item'] as const }))}
          />
        ) : null}

        <PriceCard
          title="Accommodation"
          icon={Icon.rooms}
          tint="blue"
          list={list}
          canEdit={canEdit}
          rows={[
            ...RENT_WEEKS.map((w) => ({ slot: { kind: 'rent', weeks: w } as Slot, label: weeksLabel(w) })),
            { slot: { kind: 'rent', weeks: null }, label: 'Four weeks or longer, per week', units: ['week'] },
          ]}
        />

        <PriceCard
          title="Fees"
          icon={Icon.money}
          tint="ink"
          list={list}
          canEdit={canEdit}
          rows={FEES.map((fee) => ({ slot: { kind: 'fee', fee } as Slot, label: FEE_LABEL[fee].name, sub: FEE_LABEL[fee].sub }))}
        />

        {subjects.exams.length ? (
          <PriceCard
            title="Exams"
            icon={Icon.placement}
            tint="sun"
            list={list}
            canEdit={canEdit}
            rows={subjects.exams.flatMap((e) => [
              { slot: { kind: 'exam', code: e.code, parts: 2 } as Slot, label: e.name, sub: 'Both parts' },
              { slot: { kind: 'exam', code: e.code, parts: 1 } as Slot, label: e.name, sub: 'One part' },
            ])}
          />
        ) : null}
      </div>

      <div className="lg:col-span-2">
        <PriceCard
          title="Books"
          icon={Icon.book}
          tint="red"
          list={list}
          canEdit={canEdit}
          columns={2}
          rows={[...levelled, ...otherBooks].map((b) => ({
            slot: { kind: 'book', materialId: b.id } as Slot,
            label: (
              <>
                {b.level ? <span className="mr-2 inline-block w-11 text-xs font-bold text-[var(--casa-text-subtle)]">{b.level}</span> : null}
                {b.title}
              </>
            ),
          }))}
        />
      </div>
    </div>
  );
}

/** One area of the list: its prices as a table, and an Edit that opens them all in one dialog. */
function PriceCard({
  title,
  icon,
  tint,
  list,
  rows,
  canEdit,
  columns = 1,
}: {
  title: string;
  icon: ReactNode;
  tint: Tint;
  list: PriceList;
  rows: Row[];
  canEdit: boolean;
  columns?: 1 | 2;
}) {
  const shown = rows.map((row) => ({ row, price: priceAt(list, row.slot) }));
  return (
    <Card
      title={title}
      icon={icon}
      tint={tint}
      bleed
      actions={
        canEdit ? (
          <FormDialog trigger="Edit" size="sm" title={title} width={rows.length > 8 ? 'lg' : 'md'}>
            <form action={savePricesAction} className="space-y-4">
              <input type="hidden" name="list" value={list.validFrom} />
              <div className={cn('grid max-h-[60vh] gap-3 overflow-y-auto pr-1', rows.length > 8 ? 'sm:grid-cols-2' : '')}>
                {shown.map(({ row, price }) => {
                  const key = slotKey(row.slot);
                  return (
                    <Field key={key} label={typeof row.label === 'string' ? row.label : (row.sub ?? 'Price')} hint={typeof row.label === 'string' ? row.sub : undefined} htmlFor={`p-${key}`}>
                      {typeof row.label === 'string' ? null : <span className="mb-1 block text-sm font-semibold text-[var(--casa-ink)]">{row.label}</span>}
                      <div className="flex gap-2">
                        <Input id={`p-${key}`} name={`p:${key}`} inputMode="decimal" defaultValue={typed(price?.amount)} placeholder="—" className="text-right tabular-nums" />
                        {row.units && row.units.length > 1 ? (
                          <Select name={`u:${key}`} defaultValue={price?.unit ?? row.units[0]} aria-label={`${typeof row.label === 'string' ? row.label : title}: per`} className="w-36 shrink-0">
                            {row.units.map((u) => (
                              <option key={u} value={u}>
                                {UNIT_LABEL[u]}
                              </option>
                            ))}
                          </Select>
                        ) : row.units ? (
                          <input type="hidden" name={`u:${key}`} value={row.units[0]} />
                        ) : null}
                      </div>
                    </Field>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <Button type="submit">Save</Button>
              </div>
            </form>
          </FormDialog>
        ) : null
      }
    >
      <div className={columns === 2 ? 'grid lg:grid-cols-2 lg:divide-x lg:divide-ws-line-soft' : ''}>
        {(columns === 2 ? [shown.slice(0, Math.ceil(shown.length / 2)), shown.slice(Math.ceil(shown.length / 2))] : [shown]).map((part, i) => (
          <Table key={i} head={['', { label: 'Price', align: 'right' }]}>
            {part.map(({ row, price }) => (
              <TableRow key={slotKey(row.slot)}>
                <Cell className="text-sm">
                  <span className="font-semibold text-[var(--casa-ink)]">{row.label}</span>
                  {row.sub ? <span className="ml-2 text-xs text-[var(--casa-text-subtle)]">{row.sub}</span> : null}
                </Cell>
                <Cell align="right" className="text-sm whitespace-nowrap tabular-nums">
                  {price ? (
                    <>
                      <span className="font-semibold">{money(price.amount)}</span>
                      {price.unit && row.units ? <span className="ml-1.5 text-xs text-[var(--casa-text-subtle)]">{UNIT_LABEL[price.unit]}</span> : null}
                    </>
                  ) : (
                    <span className="text-[var(--casa-text-subtle)]">—</span>
                  )}
                </Cell>
              </TableRow>
            ))}
          </Table>
        ))}
      </div>
    </Card>
  );
}
