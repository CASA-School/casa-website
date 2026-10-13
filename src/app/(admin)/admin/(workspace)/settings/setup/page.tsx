import Link from 'next/link';

import { Icon } from '@/components/admin/icons';
import { Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { vocabularySummaries } from '@/lib/admin/configuration';
import { requireModule } from '@/lib/admin/guard';
import { cn } from '@/lib/utils';

/**
 * Lists — the types CASA fixes once and leaves alone.
 *
 * It lives under Settings, not in the main navigation, because that is what it
 * is: a season's configuration. The price list is its own screen beside it
 * (Settings → Prices, finance's and management's); the tabs join the three.
 */
export default async function SetupPage() {
  const user = await requireModule('settings');
  const vocabularies = await vocabularySummaries();
  const tabs = [
    ...(canAccess(user, 'prices') ? [{ key: 'prices', label: 'Prices', href: '/admin/settings/prices' }] : []),
    { key: 'types', label: 'Lists', href: '/admin/settings/setup' },
    ...(canAccess(user, 'rooms') ? [{ key: 'rooms', label: 'Rooms', href: '/admin/settings/rooms' }] : []),
  ];

  return (
    <>
      <PageHeader backHref="/admin/settings" backLabel="Settings" title="Lists" />

      <div className="mb-4 inline-flex gap-0.5 rounded-xl border border-ws-line bg-white p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={t.key === 'types' ? 'page' : undefined}
            className={cn(
              'inline-flex h-[30px] items-center rounded-lg px-3.5 text-[0.8rem] font-bold transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30',
              t.key === 'types'
                ? 'bg-[var(--casa-ink-deep)] text-white'
                : 'text-[var(--casa-muted)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]'
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Card title="Lists" icon={Icon.catalogue} tint="ink" bleed>
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
    </>
  );
}
