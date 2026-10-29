import Link from 'next/link';

import { Icon } from '@/components/admin/icons';
import { ListEmpty } from '@/components/admin/list';
import { ButtonLink, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { requireModule } from '@/lib/admin/guard';
import { wsLocale, type WsLang } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { siteTotals, sources, STAT_RANGES, topPages, viewsByDay, type StatRange } from '@/lib/admin/site-stats';
import { cn } from '@/lib/utils';

/**
 * The website's statistics (2026-10-29): visits, the pages they start on and where readers come
 * from, counted on the server from page loads without cookies or scripts (migration 0106, docs/SEO_AND_GEO.md
 * §Statistics). What people searched for, rankings and real readers' load times (Core Web Vitals)
 * are Google's and Bing's to tell: the two buttons open Search Console and Bing Webmaster Tools.
 */
export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const [, { range: requested }] = await Promise.all([requireModule('website'), searchParams]);
  const { t, lang } = await getI18n();
  const range: StatRange = STAT_RANGES.find((days) => String(days) === requested) ?? 30;

  const [totals, days, pages, origins] = await Promise.all([siteTotals(range), viewsByDay(range), topPages(range), sources(range)]);
  const number = (value: number) => new Intl.NumberFormat(wsLocale(lang)).format(value);
  const fromSearch = origins.filter((o) => o.kind === 'search').reduce((sum, o) => sum + o.visits, 0);
  const fromAi = origins.filter((o) => o.kind === 'ai').reduce((sum, o) => sum + o.visits, 0);

  return (
    <>
      <PageHeader
        title={t('Statistik', 'Statistics')}
        actions={
          <>
            <ButtonLink href="https://search.google.com/search-console?resource_id=sc-domain%3Acasa-bremen.de" variant="secondary" plain>
              Google Search Console {Icon.external}
            </ButtonLink>
            <ButtonLink href="https://www.bing.com/webmasters/home?siteUrl=https%3A%2F%2Fcasa-bremen.de%2F" variant="secondary" plain>
              Bing Webmaster Tools {Icon.external}
            </ButtonLink>
          </>
        }
      />

      <nav aria-label={t('Zeitraum', 'Period')} className="mb-4 flex gap-1.5">
        {STAT_RANGES.map((days) => (
          <Link
            key={days}
            href={days === 30 ? '/admin/statistics' : `/admin/statistics?range=${days}`}
            aria-current={range === days ? 'page' : undefined}
            className={cn(
              'rounded-full px-3 py-1 text-[0.8rem] font-semibold ring-1 ring-inset',
              range === days ? 'bg-[var(--fm-navy)] text-white ring-[var(--fm-navy)]' : 'bg-white text-[#2b3546] ring-ws-line hover:bg-[var(--ws-row-hover)]'
            )}
          >
            {t(`${days} Tage`, `${days} days`)}
          </Link>
        ))}
      </nav>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Figure label={t('Besuche', 'Visits')} value={number(totals.visits)} />
        <Figure label={t('Seiten geöffnet', 'Pages opened')} value={number(totals.views)} />
        <Figure label={t('Vom Handy', 'On a phone')} value={`${Math.round(totals.mobileShare * 100)} %`} />
        <Figure label={t('Über Suchmaschinen · KI', 'From search · AI')} value={`${number(fromSearch)} · ${number(fromAi)}`} />
      </div>

      <Card title={t('Besuche pro Tag', 'Visits per day')} icon={Icon.overview} tint="blue" className="mb-4">
        <DayBars days={days} lang={lang} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <Card title={t('Einstiegsseiten', 'Landing pages')} icon={Icon.website} tint="ink" bleed>
          {pages.length === 0 ? (
            <ListEmpty title={t('Noch keine Besuche', 'No visits yet')} />
          ) : (
            <Table
              head={[
                t('Seite', 'Page'),
                { label: t('Besuche', 'Visits'), align: 'right' },
                { label: t('Geöffnet', 'Opened'), align: 'right', className: 'hidden sm:table-cell' },
              ]}
            >
              {pages.map((page) => (
                <TableRow key={page.path}>
                  <Cell className="max-w-0">
                    <a
                      href={`https://casa-bremen.de${page.path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-medium text-[var(--casa-ink)] hover:underline"
                    >
                      {page.path}
                    </a>
                  </Cell>
                  <Cell align="right" className="tabular-nums">{number(page.entries)}</Cell>
                  <Cell align="right" className="hidden tabular-nums sm:table-cell">{number(page.views)}</Cell>
                </TableRow>
              ))}
            </Table>
          )}
        </Card>

        <Card title={t('Herkunft', 'Where readers come from')} icon={Icon.globe} tint="green" bleed>
          {origins.length === 0 ? (
            <ListEmpty title={t('Noch keine Besuche', 'No visits yet')} />
          ) : (
            <Table head={[t('Quelle', 'Source'), { label: t('Besuche', 'Visits'), align: 'right' }]}>
              {origins.map((origin) => (
                <TableRow key={origin.host ?? 'direct'}>
                  <Cell className="max-w-0">
                    <span className="block truncate">{origin.host ?? t('Direkt oder Lesezeichen', 'Direct or bookmark')}</span>
                    {origin.kind === 'search' || origin.kind === 'ai' ? (
                      <span className="text-xs text-[var(--casa-muted)]">
                        {origin.kind === 'search' ? t('Suchmaschine', 'Search engine') : t('KI-Assistent', 'AI assistant')}
                      </span>
                    ) : null}
                  </Cell>
                  <Cell align="right" className="tabular-nums">{number(origin.visits)}</Cell>
                </TableRow>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-ws-card-line bg-white px-5 py-4 shadow-ws-card">
      <p className="text-xs font-medium text-[var(--casa-text-subtle)]">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-[-0.02em] text-[var(--casa-ink)] tabular-nums">{value}</p>
    </div>
  );
}

function DayBars({ days, lang }: { days: readonly { day: Date; count: number }[]; lang: WsLang }) {
  const peak = Math.max(4, ...days.map((d) => d.count));
  const format = new Intl.DateTimeFormat(wsLocale(lang), { day: 'numeric', month: 'short' });
  return (
    <div>
      <div className="flex h-28 items-end gap-[3px]">
        {days.map((entry) => (
          <div
            key={new Date(entry.day).toISOString()}
            title={`${format.format(new Date(entry.day))}: ${entry.count}`}
            className="flex-1 rounded-t-[3px] bg-[var(--casa-accent-surface)]"
            style={{ height: `${entry.count ? Math.max((entry.count / peak) * 100, 3) : 0}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-[var(--casa-muted)]">
        <span>{days[0] ? format.format(new Date(days[0].day)) : ''}</span>
        <span>{days.at(-1) ? format.format(new Date(days.at(-1)!.day)) : ''}</span>
      </div>
    </div>
  );
}
