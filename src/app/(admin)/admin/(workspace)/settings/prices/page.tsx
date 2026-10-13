import Link from 'next/link';
import type { ReactNode } from 'react';

import { DateFormField } from '@/components/admin/date-picker';
import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Status } from '@/components/admin/list';
import { Button, Card, Cell, EmptyState, Field, Input, PageHeader, Select, TableRow, type Tint } from '@/components/admin/ui';
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
  type PriceUnit,
  type Slot,
} from '@/lib/admin/prices/price-list';
import { loadPriceLists, priceListSubjects } from '@/lib/admin/prices/repo';
import { PUBLISHED_SLOTS } from '@/lib/content/published-prices';
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
const FEE_LABEL: Record<FeeCode, string> = {
  enrolment_fee: 'Enrolment fee',
  accommodation_placement_fee: 'Placement fee',
  deposit: 'Deposit',
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
            <FormDialog trigger={`Prepare ${nextStart.slice(0, 4)}`} title={`Price list from ${nextStart.slice(0, 4)}`} triggerVariant="primary">
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
        <EmptyState title="No price list yet" />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-3xl border border-ws-line bg-white px-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-1">
              {lists.length > 1 ? (
                <nav aria-label="Price lists" className="-mb-px flex max-w-full gap-5 overflow-x-auto [scrollbar-width:none]">
                  {lists.map((l) => {
                    const on = l.validFrom === selected.validFrom;
                    return (
                      <Link
                        key={l.validFrom}
                        href={`/admin/settings/prices?list=${l.validFrom}`}
                        aria-current={on ? 'page' : undefined}
                        className={cn(
                          'inline-flex h-12 shrink-0 items-center border-b-2 text-[0.84rem] font-semibold whitespace-nowrap transition-colors outline-none',
                          'focus-visible:text-[var(--casa-ink)] focus-visible:underline',
                          on
                            ? 'border-[var(--casa-ink-deep)] text-[var(--casa-ink)]'
                            : 'border-transparent text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
                        )}
                      >
                        {l.validFrom.endsWith('-01-01') ? l.validFrom.slice(0, 4) : longDate(l.validFrom)}
                      </Link>
                    );
                  })}
                </nav>
              ) : null}
              <span className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <Status tone={status === 'current' ? 'positive' : status === 'future' ? 'warning' : 'quiet'}>
                  {status === 'current' ? 'In force' : status === 'future' ? 'Not yet in force' : 'Ended'}
                </Status>
                <span className="text-[0.84rem] text-[var(--casa-muted)]">
                  {status === 'future' ? `Takes effect on ${longDate(selected.validFrom)}` : `From ${longDate(selected.validFrom)}`}
                  {selected.validTo ? ` until ${longDate(selected.validTo)}` : ''}
                </span>
              </span>
            </div>
            {canDelete ? (
              <form action={deletePriceListAction} className="py-2">
                <input type="hidden" name="list" value={selected.validFrom} />
                <ConfirmSubmit
                  title="Delete this price list?"
                  description={`The prices from ${longDate(selected.validFrom)} are removed, and the list before them stays in force.`}
                  confirmLabel="Delete the list"
                  variant="ghost"
                >
                  Delete
                </ConfirmSubmit>
              </form>
            ) : null}
          </div>

          <PriceCards
            list={selected}
            previous={status === 'future' ? (lists[lists.indexOf(selected) - 1] ?? null) : null}
            subjects={subjects}
            canEdit={canEdit}
          />
        </>
      )}
    </>
  );
}

type Subjects = Awaited<ReturnType<typeof priceListSubjects>>;

type Row = { slot: Slot; label: ReactNode; sub?: string; units?: readonly PriceUnit[] };

/** `previous`: the list a coming one takes over from, so a changed price shows what it was. */
function PriceCards({ list, previous, subjects, canEdit }: { list: PriceList; previous: PriceList | null; subjects: Subjects; canEdit: boolean }) {
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
          previous={previous}
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
            previous={previous}
            canEdit={canEdit}
            rows={others.map((c) => ({ slot: { kind: 'course', slug: c.slug, weeks: null } as Slot, label: c.name, units: ['lesson', 'week', 'item'] as const }))}
          />
        ) : null}

        <PriceCard
          title="Accommodation"
          icon={Icon.rooms}
          tint="blue"
          list={list}
          previous={previous}
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
          previous={previous}
          canEdit={canEdit}
          rows={FEES.map((fee) => ({ slot: { kind: 'fee', fee } as Slot, label: FEE_LABEL[fee] }))}
        />

        {subjects.exams.length ? (
          <PriceCard
            title="Exams"
            icon={Icon.placement}
            tint="sun"
            list={list}
            previous={previous}
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
          previous={previous}
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
  previous,
  rows,
  canEdit,
  columns = 1,
}: {
  title: string;
  icon: ReactNode;
  tint: Tint;
  list: PriceList;
  previous: PriceList | null;
  rows: Row[];
  canEdit: boolean;
  columns?: 1 | 2;
}) {
  const shown = rows.map((row) => ({ row, price: priceAt(list, row.slot), was: previous ? (priceAt(previous, row.slot)?.amount ?? null) : undefined }));
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
          // A label and its price: the card's title names the column, so the table has no head row.
          <table key={i} className={cn('w-full border-collapse text-sm', i > 0 && 'border-t border-ws-line-soft lg:border-t-0')}>
            <tbody className="divide-y divide-ws-line-soft">
              {part.map(({ row, price, was }) => (
                <TableRow key={slotKey(row.slot)}>
                  <Cell className="py-3 text-[0.875rem] text-[var(--casa-ink)]">
                    {row.label}
                    {row.sub ? <span className="ml-2 text-xs whitespace-nowrap text-[var(--casa-text-subtle)]">{row.sub}</span> : null}
                    {PUBLISHED_SLOTS.includes(slotKey(row.slot)) ? <OnTheWebsite /> : null}
                  </Cell>
                  <Cell align="right" className="py-3 text-[0.875rem] whitespace-nowrap tabular-nums">
                    {was !== undefined && was !== (price?.amount ?? null) ? (
                      <span className="mr-2 text-xs text-[var(--casa-text-subtle)] line-through">{was == null ? 'new' : money(was)}</span>
                    ) : null}
                    {price ? (
                      <>
                        <span className="font-semibold">{money(price.amount)}</span>
                        {price.unit && row.units ? <span className="ml-1.5 text-xs text-[var(--casa-text-subtle)]">{UNIT_LABEL[price.unit]}</span> : null}
                      </>
                    ) : null}
                  </Cell>
                </TableRow>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </Card>
  );
}

/** A price the public site shows: a small globe, the rail's sign for the website, named on hover and for a screen reader. */
function OnTheWebsite() {
  return (
    <span title="On the website" className="ml-2 inline-flex translate-y-[2px] text-[var(--casa-text-subtle)] [&_svg]:h-3.5 [&_svg]:w-3.5">
      <span aria-hidden="true">{Icon.website}</span>
      <span className="sr-only">On the website</span>
    </span>
  );
}
