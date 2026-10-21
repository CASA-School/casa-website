import { NewGroupForm } from './group-forms';
import { FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { dayRange, ListBar, ListEmpty, ListGroup, RecordName } from '@/components/admin/list';
import { Pagination } from '@/components/admin/pagination';
import { RowActions, type RowAction } from '@/components/admin/row-actions';
import { Badge, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { groupByMonth, monthHeading } from '@/lib/admin/days';
import { GROUP_STATUS_LABELS, GROUP_VIEW_LABELS, GROUP_VIEWS, isGroupView, type GroupView } from '@/lib/admin/group-labels';
import { groupCounts, groupOptions, listGroups, type GroupListItem } from '@/lib/admin/groups';
import { requireModule } from '@/lib/admin/guard';
import { num, pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { clampPage, firstParam, offsetFor, PAGE_SIZE } from '@/lib/admin/paging';
import { toDateInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';

/**
 * The group visits (2026-10-18, migration 0058; docs/ADMIN_WORKSPACE.md §Groups). One row each — the
 * name, the school or company and the agency, the country, the dates, how many come and how many of
 * them are booked. The views: confirmed visits ahead or under way (the default), those asked for and
 * not yet decided, those that are over, those called off, and all. The search finds a name, a school,
 * a company or an agency.
 *
 * In months by arrival (Rahman, 2026-10-21), with each row's actions: an offer to the agency (or the
 * school or company) as the button where a visit is asked for and not yet decided; its participants,
 * offers and programme in the menu.
 */
export default async function GroupsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [params, user, { t, lang }] = await Promise.all([searchParams, requireModule('groups'), getI18n()]);
  const rawView = firstParam(params.view);
  const view: GroupView = isGroupView(rawView) ? rawView : 'upcoming';
  const search = firstParam(params.q)?.slice(0, 80);
  const page = clampPage(params.page);
  const canEdit = canAccess(user, 'groups', 'edit');
  const [{ items, total }, counts, options] = await Promise.all([
    listGroups({ view, search, limit: PAGE_SIZE, offset: offsetFor(page) }),
    groupCounts(),
    canEdit ? groupOptions() : Promise.resolve(null),
  ]);
  const href = (v: GroupView) => `/admin/groups${v === 'upcoming' ? '' : `?view=${v}`}`;
  // A row says its state where the view does not already say it.
  const saysStatus = view === 'all';
  const error = firstParam(params.error);
  const hide = 'hidden md:table-cell';
  const canOffer = canAccess(user, 'offers', 'edit');
  // Asked for, undecided and already over: their own group at the end, to be closed rather than offered.
  const lapsed = (g: GroupListItem) => view === 'open' && g.isOver;
  const groups = [
    ...groupByMonth(
      items.filter((g) => g.startDate && !lapsed(g)),
      (g) => g.startDate!
    ).map(({ month, rows }) => ({ key: month, label: monthHeading(month, lang), rows })),
    { key: 'undated', label: t('Ohne Termin', 'No dates'), rows: items.filter((g) => !g.startDate) },
    { key: 'lapsed', label: t('Termin vorbei', 'Dates passed'), rows: items.filter(lapsed) },
  ].filter((g) => g.rows.length);
  const actionsOf = (g: GroupListItem): { primary: RowAction | null; actions: RowAction[] } => {
    const offer: RowAction | null =
      canOffer && g.offerTo ? { label: t('Angebot erstellen', 'Write an offer'), href: `/admin/offers/new?organisation=${g.offerTo}`, icon: Icon.offers } : null;
    const primary = view === 'open' && !g.isOver ? offer : null;
    return {
      primary,
      actions: [
        ...(offer && !primary ? [offer] : []),
        { label: t('Teilnehmende', 'Students'), href: `/admin/groups/${g.id}?tab=participants`, icon: Icon.people, divide: Boolean(offer && !primary) },
        { label: t('Angebote', 'Offers'), href: `/admin/groups/${g.id}?tab=offers`, icon: Icon.offers },
        { label: t('Programm', 'Programme'), href: `/admin/groups/${g.id}?tab=programme`, icon: Icon.calendar },
      ],
    };
  };

  return (
    <>
      <PageHeader
        title={t('Gruppen', 'Groups')}
        actions={
          options ? (
            <FormDialog
              icon={Icon.group}
              tint="ink"
              trigger={t('Neue Gruppe', 'New group')}
              title={t('Neue Gruppe', 'New group')}
              triggerVariant="primary"
              width="lg"
              defaultOpen={params.new === '1'}
            >
              <NewGroupForm options={options} />
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
          tabs={GROUP_VIEWS.map((v) => ({ key: v, label: pick(lang, GROUP_VIEW_LABELS[v]), href: href(v), count: counts[v] }))}
          active={view}
          search={{
            action: '/admin/groups',
            value: search,
            placeholder: t('Gruppe, Schule, Firma oder Agentur', 'Group, school, company or agency'),
            keep: { view: view === 'upcoming' ? undefined : view },
          }}
        />
        {items.length === 0 ? (
          <ListEmpty title={search ? t('Nichts gefunden', 'Nothing found') : t('Hier ist keine Gruppe', 'No group here')}>
            {search ? t(`Nichts passt zu „${search}“.`, `Nothing matches “${search}”.`) : null}
          </ListEmpty>
        ) : (
          <Table
            head={[
              t('Gruppe', 'Group'),
              { label: t('Land', 'Country'), className: `w-[10rem] ${hide}` },
              { label: t('Zeitraum', 'Dates'), className: `w-[12rem] ${hide}` },
              { label: t('Personen', 'People'), align: 'right', className: 'w-[7.5rem]' },
              { label: '', className: view === 'open' && canOffer ? 'w-[12rem]' : 'w-[3.5rem]' },
            ]}
          >
            {groups.map((group) => [
              <ListGroup key={group.key} label={group.label} count={group.rows.length} span={5} />,
              ...group.rows.map((g) => {
              const quiet = g.status === 'cancelled' || (g.status === 'confirmed' && g.isOver);
              return (
                <TableRow key={g.id} interactive>
                  <Cell href={`/admin/groups/${g.id}`} className="max-w-0">
                    <span className={cn('block', quiet && 'opacity-70')}>
                      <RecordName
                        name={g.name}
                        flag={
                          saysStatus || (g.status === 'cancelled' && view !== 'cancelled') ? (
                            <Badge tone={g.status === 'confirmed' ? 'positive' : g.status === 'open' ? 'accent' : 'quiet'}>{pick(lang, GROUP_STATUS_LABELS[g.status])}</Badge>
                          ) : undefined
                        }
                        about={[g.organisationName, g.agencyName && g.agencyName !== g.organisationName ? t(`über ${g.agencyName}`, `via ${g.agencyName}`) : null].filter(Boolean).join(' · ') || undefined}
                      />
                    </span>
                  </Cell>
                  <Cell className={cn('text-[0.84rem] text-[#2b3546]', hide, quiet && 'text-[var(--casa-muted)]')}>{g.country ? pick(lang, g.country) : null}</Cell>
                  <Cell className={cn('text-[0.84rem] text-[#2b3546] tabular-nums', hide, quiet && 'text-[var(--casa-muted)]')}>
                    {g.startDate ? dayRange(toDateInputValue(g.startDate), toDateInputValue(g.endDate ?? g.startDate), lang) : null}
                  </Cell>
                  <Cell align="right" className={cn('text-[0.84rem] tabular-nums', quiet && 'text-[var(--casa-muted)]')}>
                    {g.participants != null ? (
                      <span className="font-semibold">
                        {num(lang, g.participants)}
                        {g.escorts ? <span className="font-normal text-[var(--casa-muted)]"> + {num(lang, g.escorts)}</span> : null}
                      </span>
                    ) : null}
                    {g.booked ? <span className="block text-[0.72rem] text-[var(--casa-muted)]">{t(`${num(lang, g.booked)} gebucht`, `${num(lang, g.booked)} booked`)}</span> : null}
                  </Cell>
                  <Cell align="right" className="!pr-7">
                    <RowActions label={t(`Aktionen: ${g.name}`, `Actions: ${g.name}`)} {...actionsOf(g)} />
                  </Cell>
                </TableRow>
              );
              }),
            ])}
          </Table>
        )}
      </Card>

      <Pagination basePath="/admin/groups" page={page} total={total} params={params} />
    </>
  );
}
