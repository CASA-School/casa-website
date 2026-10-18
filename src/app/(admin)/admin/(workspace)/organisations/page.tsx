import { NewOrganisationForm } from './organisation-forms';
import { FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { ListBar, ListEmpty, RecordName } from '@/components/admin/list';
import { Pagination } from '@/components/admin/pagination';
import { Badge, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { num, pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import {
  isOrganisationView,
  ORGANISATION_KIND_LABELS,
  ORGANISATION_RELATION_LABELS,
  ORGANISATION_VIEW_LABELS,
  ORGANISATION_VIEWS,
  type OrganisationView,
} from '@/lib/admin/organisation-labels';
import { listOrganisations, organisationCounts, organisationCountries } from '@/lib/admin/organisations';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { cn } from '@/lib/utils';

/**
 * The organisations CASA works with (2026-10-18, migration 0057; docs/ADMIN_WORKSPACE.md
 * §Organisations): agencies, companies, schools and offices. One row each — the name, what it is and
 * the contact written to last, the country, how many contacts, and how many bookings it pays that run
 * today or are still to come. The views are by kind, schools and offices together, and the ones CASA no
 * longer works with; those are muted wherever they show. The search finds a name, an address, or a
 * contact by name or address.
 */
export default async function OrganisationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [params, user, { t, lang }] = await Promise.all([searchParams, requireModule('organisations'), getI18n()]);
  const rawView = firstParam(params.view);
  const view: OrganisationView = isOrganisationView(rawView) ? rawView : 'all';
  const search = firstParam(params.q)?.slice(0, 80);
  const page = clampPage(params.page);
  const canEdit = canAccess(user, 'organisations', 'edit');
  const [{ items, total }, counts, countries] = await Promise.all([
    listOrganisations({ view, search, limit: PAGE_SIZE, offset: offsetFor(page) }),
    organisationCounts(),
    canEdit ? organisationCountries() : Promise.resolve([]),
  ]);
  const href = (v: OrganisationView) => `/admin/organisations${v === 'all' ? '' : `?view=${v}`}`;
  // A row says its kind where the view does not already say it.
  const saysKind = view === 'all' || view === 'school' || view === 'inactive';
  const error = firstParam(params.error);
  const hide = 'hidden md:table-cell';

  return (
    <>
      <PageHeader
        title={t('Organisationen', 'Organisations')}
        actions={
          canEdit ? (
            <FormDialog
              icon={Icon.globe}
              tint="ink"
              trigger={t('Neue Organisation', 'New organisation')}
              title={t('Neue Organisation', 'New organisation')}
              triggerVariant="primary"
              width="lg"
              defaultOpen={params.new === '1'}
            >
              <NewOrganisationForm countries={countries} />
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
          tabs={ORGANISATION_VIEWS.map((v) => ({ key: v, label: pick(lang, ORGANISATION_VIEW_LABELS[v]), href: href(v), count: counts[v] }))}
          active={view}
          search={{
            action: '/admin/organisations',
            value: search,
            placeholder: t('Name, Kontakt oder E-Mail', 'Name, contact or email'),
            keep: { view: view === 'all' ? undefined : view },
          }}
        />
        {items.length === 0 ? (
          <ListEmpty title={search ? t('Nichts gefunden', 'Nothing found') : t('Hier ist keine Organisation', 'No organisation here')}>
            {search ? t(`Nichts passt zu „${search}“.`, `Nothing matches “${search}”.`) : null}
          </ListEmpty>
        ) : (
          <Table
            head={[
              t('Organisation', 'Organisation'),
              { label: t('Land', 'Country'), className: `w-[11rem] ${hide}` },
              { label: t('Kontakte', 'Contacts'), align: 'right', className: `w-[7rem] ${hide}` },
              { label: t('Buchungen', 'Bookings'), align: 'right', className: 'w-[7.5rem]' },
            ]}
          >
            {items.map((o) => (
              <TableRow key={o.id} interactive>
                <Cell href={`/admin/organisations/${o.id}`} className="max-w-0">
                  <span className={cn('block', !o.isActive && 'opacity-60')}>
                    <RecordName
                      name={o.name}
                      flag={!o.isActive && view !== 'inactive' ? <Badge tone="quiet">{t('Inaktiv', 'Inactive')}</Badge> : undefined}
                      about={
                        [
                          o.relation ? pick(lang, ORGANISATION_RELATION_LABELS[o.relation]) : saysKind ? pick(lang, ORGANISATION_KIND_LABELS[o.kind]) : null,
                          o.contactName,
                        ]
                          .filter(Boolean)
                          .join(' · ') || undefined
                      }
                    />
                  </span>
                </Cell>
                <Cell className={cn('text-[0.84rem] text-[#2b3546]', hide, !o.isActive && 'text-[var(--casa-muted)]')}>{o.country ? pick(lang, o.country) : null}</Cell>
                <Cell align="right" className={cn('text-[0.84rem] text-[#2b3546] tabular-nums', hide, !o.isActive && 'text-[var(--casa-muted)]')}>
                  {o.contacts ? num(lang, o.contacts) : null}
                </Cell>
                <Cell align="right" className={cn('text-[0.84rem] font-semibold tabular-nums', !o.isActive && 'text-[var(--casa-muted)]')}>
                  {o.bookings ? num(lang, o.bookings) : null}
                </Cell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>

      <Pagination basePath="/admin/organisations" page={page} total={total} params={params} />
    </>
  );
}
