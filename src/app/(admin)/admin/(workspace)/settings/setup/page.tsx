import Link from 'next/link';

import { ConfirmSubmit, FormDialog } from '@/components/admin/dialogs';
import {
  Badge,
  Card,
  Cell,
  DateText,
  EmptyState,
  PageHeader,
  Table,
  TableRow,
} from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { listRates, rateTargets, vocabularySummaries } from '@/lib/admin/configuration';
import { RATE_SCOPE_LABELS, RATE_UNIT_LABELS } from '@/lib/admin/configuration-labels';
import { requireModule } from '@/lib/admin/guard';
import { cn } from '@/lib/utils';
import { deleteRateAction, endRateAction } from './actions';
import { RateForm } from './rate-form';

/**
 * Setup — the values CASA fixes once and leaves alone.
 *
 * It lives under Settings, not in the main navigation, because that is what it
 * is: a season's configuration, visited when a price list changes and not on a
 * Tuesday morning. Two tabs, so the price list and the vocabularies do not
 * compete on one page.
 *
 * Reading it needs Settings, which everyone has. Changing a price needs
 * Settings at `full` — owner or administrator — since every future booking is
 * priced from these rows.
 */
export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string; scope?: string }>;
}) {
  const [{ tab, error, scope }, user] = await Promise.all([
    searchParams,
    requireModule('settings'),
  ]);
  const canEdit = canAccess(user, 'settings', 'full');
  const active = tab === 'types' ? 'types' : 'prices';

  const [rates, vocabularies, targets] = await Promise.all([
    active === 'prices' ? listRates(scope) : Promise.resolve([]),
    active === 'types' ? vocabularySummaries() : Promise.resolve([]),
    active === 'prices' && canEdit ? rateTargets() : Promise.resolve(null),
  ]);

  const money = (n: number, currency: string) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(n);

  return (
    <>
      <PageHeader
        backHref="/admin/settings"
        backLabel="Settings"
        eyebrow="Settings"
        title="Types & prices"
        description="Set once, and left alone for a season."
        actions={
          active === 'prices' && canEdit && targets ? (
            <FormDialog trigger="Add price" title="Add a price" triggerVariant="primary">
              <RateForm targets={targets} />
            </FormDialog>
          ) : null
        }
      />

      <div className="mb-5 inline-flex gap-1 rounded-xl border border-ws-line bg-white p-1">
        {[
          { key: 'prices', label: 'Prices', href: '/admin/settings/setup?tab=prices' },
          { key: 'types', label: 'Lists', href: '/admin/settings/setup?tab=types' },
          { key: 'rooms', label: 'Rooms', href: '/admin/settings/rooms' },
        ].map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={t.key === active ? 'page' : undefined}
            className={cn(
              'rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
              t.key === active
                ? 'bg-[var(--casa-ink-deep)] text-white'
                : 'text-[var(--casa-text-subtle)] hover:text-[var(--casa-ink)]'
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {error ? (
        <p
          role="alert"
          className="mb-5 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]"
        >
          {error}
        </p>
      ) : null}

      {active === 'prices' ? (
        rates.length === 0 ? (
          <EmptyState
            title="No prices yet"
            description={canEdit ? 'Add the first one.' : 'An administrator sets these.'}
          />
        ) : (
          <div className="space-y-5">
            {Object.keys(RATE_SCOPE_LABELS).map((s) => {
              const group = rates.filter((r) => r.scope === s);
              if (group.length === 0) return null;
              return (
                <Card key={s} title={RATE_SCOPE_LABELS[s]} bleed>
                  <Table
                    head={[
                      'For',
                      'Conditions',
                      { label: 'Amount', align: 'right' },
                      'Per',
                      'Valid',
                      { label: '', align: 'right' },
                    ]}
                  >
                    {group.map((r) => (
                      <TableRow key={r.id}>
                        <Cell className="font-semibold">
                          <span className="flex items-center gap-2">
                            {r.target}
                            {!r.isCurrent ? <Badge tone="quiet">Not current</Badge> : null}
                          </span>
                        </Cell>
                        <Cell className="text-sm text-[var(--casa-text-subtle)]">
                          {r.conditions.length > 0 ? r.conditions.join(' · ') : '—'}
                        </Cell>
                        <Cell align="right" className="text-sm font-semibold tabular-nums">
                          {money(r.amount, r.currency)}
                          {r.vatRate > 0 ? (
                            <span className="ml-1 font-normal text-[var(--casa-text-subtle)]">
                              +{r.vatRate}%
                            </span>
                          ) : null}
                        </Cell>
                        <Cell className="text-sm">{RATE_UNIT_LABELS[r.unit]}</Cell>
                        <Cell className="text-xs text-[var(--casa-text-subtle)]">
                          <DateText value={r.validFrom} compact />
                          {r.validTo ? (
                            <>
                              {' – '}
                              <DateText value={r.validTo} compact />
                            </>
                          ) : (
                            ' onwards'
                          )}
                        </Cell>
                        <Cell align="right">
                          {canEdit ? (
                            <span className="flex items-center justify-end gap-1">
                              {r.isCurrent && !r.validTo ? (
                                <form action={endRateAction}>
                                  <input type="hidden" name="rateId" value={r.id} />
                                  <ConfirmSubmit
                                    title={`Stop this price today?`}
                                    description={`${r.target} at ${money(r.amount, r.currency)} stops applying from today. Bookings already priced from it keep their amounts.`}
                                    confirmLabel="Stop it"
                                    variant="secondary"
                                  >
                                    End
                                  </ConfirmSubmit>
                                </form>
                              ) : null}
                              <form action={deleteRateAction}>
                                <input type="hidden" name="rateId" value={r.id} />
                                <ConfirmSubmit
                                  title="Delete this price?"
                                  description="Only possible while no booking has been priced from it."
                                  variant="ghost"
                                >
                                  Delete
                                </ConfirmSubmit>
                              </form>
                            </span>
                          ) : null}
                        </Cell>
                      </TableRow>
                    ))}
                  </Table>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <Card bleed>
          <Table
            head={[
              'List',
              { label: 'Entries', align: 'right' },
              { label: 'In use', align: 'right' },
              'Contains',
            ]}
          >
            {vocabularies.map((v) => (
              <TableRow key={v.key}>
                <Cell className="font-semibold">{v.label}</Cell>
                <Cell align="right" className="text-sm tabular-nums">
                  {v.total}
                </Cell>
                <Cell align="right" className="text-sm tabular-nums">
                  {v.active}
                </Cell>
                <Cell className="text-sm text-[var(--casa-text-subtle)]">
                  {v.sample.length > 0
                    ? `${v.sample.join(', ')}${v.total > v.sample.length ? ' …' : ''}`
                    : '—'}
                </Cell>
              </TableRow>
            ))}
          </Table>
        </Card>
      )}
    </>
  );
}
