import { NewStaffForm } from './staff-forms';
import { FormDialog } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { Tally } from '@/components/admin/inbox';
import { ListBar, ListEmpty, RecordName } from '@/components/admin/list';
import { Badge, Card, Cell, PageHeader, Table, TableRow } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { requireModule } from '@/lib/admin/guard';
import { pick } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';
import { CONTRACT_KIND_LABELS, STAFF_VIEW_LABELS, STAFF_VIEWS, type StaffView } from '@/lib/admin/staff-labels';
import { listStaffMembers, staffCounts, staffRoles } from '@/lib/admin/staff-members';

/**
 * Everyone who works at CASA (2026-10-17, migration 0039; docs/ADMIN_WORKSPACE.md §Staff): teachers,
 * the office, management, interns. One row per colleague — their name, the short name on the board,
 * what they do; their contract for those who may see it. The views are who is here (all, teaching,
 * the office) and who has left. SchoolMan kept the leavers in a table of their own (`Hades`); here
 * they are a view.
 */
export default async function StaffPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; error?: string }> }) {
  const [params, user, { t, lang }] = await Promise.all([searchParams, requireModule('staff'), getI18n()]);
  const view: StaffView = (STAFF_VIEWS as readonly string[]).includes(params.view ?? '') ? (params.view as StaffView) : 'active';
  const q = params.q?.slice(0, 80) ?? '';
  const [members, counts, roles] = await Promise.all([listStaffMembers(view, q), staffCounts(), staffRoles()]);
  const roleName = new Map(roles.map((r) => [r.code, pick(lang, r.name)]));
  const seesPrivate = canAccess(user, 'staff_private');
  const href = (v: StaffView) => `/admin/staff${v === 'active' ? '' : `?view=${v}`}`;

  return (
    <>
      <PageHeader
        title={t('Mitarbeitende', 'Staff')}
        actions={
          canAccess(user, 'staff', 'edit') ? (
            <FormDialog icon={Icon.person} tint="ink" trigger={t('Neu', 'New')} title={t('Neue Person im Team', 'A new colleague')} triggerVariant="primary" width="lg">
              <NewStaffForm roles={roles} />
            </FormDialog>
          ) : null
        }
      />
      <p className="-mt-3 mb-6 flex min-h-5 flex-wrap gap-x-5 gap-y-1 text-[0.84rem] text-[var(--casa-muted)]">
        <Tally tone="working" n={counts.teaching} label={t('im Unterricht', 'teaching')} lang={lang} />
        <Tally tone="done" n={counts.office} label={t('im Büro', 'in the office')} lang={lang} />
      </p>
      {params.error ? (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--casa-danger-text)]/30 bg-[var(--casa-danger-text)]/6 px-4 py-3 text-sm text-[var(--casa-danger-text)]">
          {params.error}
        </p>
      ) : null}

      <Card bleed>
        <ListBar
          tabs={STAFF_VIEWS.map((v) => ({ key: v, label: pick(lang, STAFF_VIEW_LABELS[v]), href: href(v), count: counts[v] }))}
          active={view}
          search={{ action: '/admin/staff', value: q, placeholder: t('Name oder Kürzel', 'Name or short name'), keep: { view: view === 'active' ? undefined : view } }}
        />
        {members.length === 0 ? (
          <ListEmpty title={q ? t('Nichts gefunden', 'Nothing found') : t('Hier ist niemand', 'Nobody here')} />
        ) : (
          <Table
            head={[
              t('Name', 'Name'),
              ...(seesPrivate ? [{ label: t('Vertrag', 'Contract'), className: 'hidden w-[12rem] md:table-cell' }] : []),
              { label: t('Zugang', 'Account'), className: 'hidden w-[7rem] md:table-cell' },
            ]}
          >
            {members.map((m) => (
              <TableRow key={m.id} interactive>
                <Cell href={`/admin/staff/${m.id}`} className="max-w-0">
                  <RecordName
                    name={m.name}
                    reference={m.shortName}
                    about={m.roles.map((r) => roleName.get(r) ?? r).join(' · ') || t('Noch keine Aufgabe', 'No role yet')}
                  />
                </Cell>
                {seesPrivate ? (
                  <Cell className="hidden text-[0.84rem] text-[#2b3546] md:table-cell">
                    {m.contractKind ? pick(lang, CONTRACT_KIND_LABELS[m.contractKind]) : <span className="text-[var(--casa-text-subtle)]">—</span>}
                  </Cell>
                ) : null}
                <Cell className="hidden md:table-cell">{m.hasAccount ? <Badge tone="neutral">{t('Konto', 'Account')}</Badge> : null}</Cell>
              </TableRow>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
