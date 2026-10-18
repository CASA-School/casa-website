import { NewPlaceForm } from './accommodation-forms';
import { FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { ListBar, ListEmpty, RecordName } from '@/components/admin/list';
import { Pagination } from '@/components/admin/pagination';
import { Badge, Card, Cell, DateText, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { listPlaces, placeCounts } from '@/lib/admin/accommodation';
import { ACCOMMODATION_KIND_LABELS, isPlaceView, PLACE_VIEW_LABELS, PLACE_VIEWS, type PlaceView } from '@/lib/admin/accommodation-labels';
import { requireModule } from '@/lib/admin/guard';
import { num, pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { cn } from '@/lib/utils';

/**
 * The places learners stay (2026-10-18, migration 0060; docs/ADMIN_WORKSPACE.md §Accommodation): host
 * families and CASA's flats. One row each — the name, the host and the town; how many rooms; how many
 * learners stay there today, and when the next one arrives. Views by kind and the ones no longer used;
 * the search finds a name, the host, an address or someone of the family.
 */
export default async function AccommodationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [params, user, { t, lang }] = await Promise.all([searchParams, requireModule('accommodation'), getI18n()]);
  const rawView = firstParam(params.view);
  const view: PlaceView = isPlaceView(rawView) ? rawView : 'all';
  const search = firstParam(params.q)?.slice(0, 80);
  const page = clampPage(params.page);
  const canEdit = canAccess(user, 'accommodation', 'edit');
  const [{ items, total }, counts] = await Promise.all([listPlaces({ view, search, limit: PAGE_SIZE, offset: offsetFor(page) }), placeCounts()]);
  const href = (v: PlaceView) => `/admin/accommodation${v === 'all' ? '' : `?view=${v}`}`;
  const error = firstParam(params.error);
  const hide = 'hidden md:table-cell';

  return (
    <>
      <PageHeader
        title={t('Unterkünfte', 'Accommodation')}
        actions={
          canEdit ? (
            <FormDialog
              icon={Icon.home}
              tint="ink"
              trigger={t('Neue Unterkunft', 'New place')}
              title={t('Neue Unterkunft', 'New place')}
              triggerVariant="primary"
              width="lg"
              defaultOpen={params.new === '1'}
            >
              <NewPlaceForm />
            </FormDialog>
          ) : null
        }
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {error}
        </p>
      ) : null}

      <Card bleed>
        <ListBar
          tabs={PLACE_VIEWS.map((v) => ({ key: v, label: pick(lang, PLACE_VIEW_LABELS[v]), href: href(v), count: counts[v] }))}
          active={view}
          search={{
            action: '/admin/accommodation',
            value: search,
            placeholder: t('Name, Familie oder Adresse', 'Name, family or address'),
            keep: { view: view === 'all' ? undefined : view },
          }}
        />
        {items.length === 0 ? (
          <ListEmpty title={search ? t('Nichts gefunden', 'Nothing found') : t('Hier ist keine Unterkunft', 'No place here')}>
            {search ? t(`Nichts passt zu „${search}“.`, `Nothing matches “${search}”.`) : null}
          </ListEmpty>
        ) : (
          <Table
            head={[
              t('Unterkunft', 'Place'),
              { label: t('Zimmer', 'Rooms'), align: 'right', className: `w-[6rem] ${hide}` },
              { label: t('Wohnen jetzt', 'Staying now'), align: 'right', className: 'w-[8rem]' },
              { label: t('Nächste Anreise', 'Next arrival'), className: `w-[9rem] ${hide}` },
            ]}
          >
            {items.map((p) => (
              <TableRow key={p.id} interactive>
                <Cell href={`/admin/accommodation/${p.id}`} className="max-w-0">
                  <span className={cn('block', !p.isActive && 'opacity-60')}>
                    <RecordName
                      name={p.name}
                      flag={
                        !p.isActive && view !== 'inactive' ? (
                          <Badge tone="quiet">{t('Inaktiv', 'Inactive')}</Badge>
                        ) : p.kind === 'casa_flat' && view !== 'casa_flat' ? (
                          <Badge tone="accent">{pick(lang, ACCOMMODATION_KIND_LABELS.casa_flat)}</Badge>
                        ) : undefined
                      }
                      about={[p.contactName && p.contactName !== p.name ? p.contactName : null, p.town].filter(Boolean).join(' · ') || undefined}
                    />
                  </span>
                </Cell>
                <Cell align="right" className={cn('text-[0.84rem] text-[#2b3546] tabular-nums', hide)}>
                  {p.rooms ? num(lang, p.rooms) : null}
                </Cell>
                <Cell align="right" className="text-[0.84rem] font-semibold tabular-nums">
                  {p.staying ? num(lang, p.staying) : null}
                </Cell>
                <Cell className={cn('text-[0.84rem] text-[#2b3546]', hide)}>{p.nextArrival ? <DateText value={p.nextArrival} compact /> : null}</Cell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>

      <Pagination basePath="/admin/accommodation" page={page} total={total} params={params} />
    </>
  );
}
