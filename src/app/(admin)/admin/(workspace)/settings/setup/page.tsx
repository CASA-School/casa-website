import { Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { vocabularySummaries } from '@/lib/admin/configuration';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * Lists — the types CASA fixes once and leaves alone.
 *
 * It lives under Settings, not in the main navigation, because that is what it
 * is: a season's configuration. The price list and the rooms are its
 * neighbours in the rail's Settings group, so the screen carries no tabs of its
 * own. One card, one row per list: its name, how many entries it holds (and how
 * many of those are not in use, only when some are), and the first few of them.
 */
export default async function SetupPage() {
  await requireModule('settings');
  const { t, lang } = await getI18n();
  const vocabularies = await vocabularySummaries(lang);

  return (
    <>
      <PageHeader backHref="/admin/settings" backLabel={t('Einstellungen', 'Settings')} title={t('Listen', 'Lists')} />

      <Card bleed>
        <Table
          head={[
            { label: t('Liste', 'List'), className: 'w-[13rem]' },
            { label: t('Einträge', 'Entries'), align: 'right', className: 'w-[9rem]' },
            { label: t('Enthält', 'Contains'), className: 'hidden md:table-cell' },
          ]}
        >
          {vocabularies.map((v) => (
            <TableRow key={v.key}>
              <Cell className="text-[0.9rem] font-semibold whitespace-nowrap">{pick(lang, v.label)}</Cell>
              <Cell align="right" className="whitespace-nowrap tabular-nums">
                <span className="font-semibold">{v.total}</span>
                {v.active < v.total ? (
                  <span className="ml-1.5 text-xs text-[var(--casa-text-subtle)]">{t(`${v.total - v.active} nicht in Gebrauch`, `${v.total - v.active} not in use`)}</span>
                ) : null}
              </Cell>
              <Cell className="hidden max-w-0 text-[0.84rem] text-[var(--casa-muted)] md:table-cell">
                {v.sample.length > 0 ? (
                  <span className="block truncate">
                    {v.sample.join(', ')}
                    {v.total > v.sample.length ? ' …' : ''}
                  </span>
                ) : null}
              </Cell>
            </TableRow>
          ))}
        </Table>
      </Card>
    </>
  );
}
