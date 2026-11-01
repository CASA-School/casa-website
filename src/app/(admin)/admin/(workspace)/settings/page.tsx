import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Icon } from '@/components/admin/icons';
import { roleLabel } from '@/components/admin/shell';
import { Card, DetailList, PageHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { getStaffUser } from '@/lib/admin/auth';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * Settings: the way into what is set once and left for a season — prices, lists, rooms — and into Technik,
 * where the deployment's technical state and logs live (2026-11-01). Your own account beside it.
 */
export default async function SettingsPage() {
  const user = await getStaffUser();
  if (!user) {
    redirect('/admin/sign-in');
  }
  const { t, lang } = await getI18n();
  const items = [
    ...(canAccess(user, 'prices') ? [{ href: '/admin/settings/prices', label: t('Preise', 'Prices') }] : []),
    { href: '/admin/settings/setup', label: t('Listen', 'Lists') },
    ...(canAccess(user, 'rooms') ? [{ href: '/admin/settings/rooms', label: t('Räume', 'Rooms') }] : []),
    { href: '/admin/settings/system', label: t('Technik', 'Technical') },
  ];

  return (
    <>
      <PageHeader title={t('Einstellungen', 'Settings')} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Card title={t('Einrichtung', 'Setup')} icon={Icon.catalogue} tint="ink" bleed>
          <ul className="divide-y divide-ws-line-soft">
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-[#f7f9fc]">
                  <span className="min-w-0 text-sm font-semibold text-[var(--casa-ink)]">{item.label}</span>
                  <span aria-hidden="true" className="text-[var(--casa-text-subtle)]">
                    {Icon.chevronRight}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={t('Dein Konto', 'Your account')} icon={Icon.person} tint="green">
          <DetailList
            items={[
              { label: t('Name', 'Name'), value: user.name },
              { label: t('Rolle', 'Role'), value: roleLabel(user.role, lang) },
              { label: t('E-Mail', 'Email'), value: user.email, wide: true },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
