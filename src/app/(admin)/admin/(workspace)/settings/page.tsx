import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Icon } from '@/components/admin/icons';
import { roleLabel } from '@/components/admin/shell';
import { Status } from '@/components/admin/list';
import { Card, DetailList, PageHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { getStaffUser } from '@/lib/admin/auth';
import { bridgeStatus, bridgeTime } from '@/lib/admin/bridge';
import { getI18n } from '@/lib/admin/i18n.server';
import { formDeliveryConfig } from '@/lib/notifications/forms.server';
import { LISTENING_AUDIO_AVAILABLE, POLICY_VERSION, RELEASE_MODE } from '@/config/placement/policy';

/**
 * Settings.
 *
 * There is deliberately almost nothing to change here yet, and the screen says
 * so rather than offering toggles that write to nowhere. What it does instead
 * is state, in one place, the facts about this deployment that change how staff
 * should read every other screen — which integrations are live, what the
 * placement engine is currently doing, and what is still on paper.
 *
 * Environment presence is reported as connected / not connected, never as a
 * value. A settings page that echoes a webhook URL puts a credential on a
 * screen in a shared office. The variable's name is a machine value too
 * (docs/ADMIN_WORKSPACE.md rule 5): it is on the row's hover, not on screen.
 */
export default async function SettingsPage() {
  const user = await getStaffUser();
  const delivery = formDeliveryConfig('contact');

  if (!user) {
    redirect('/admin/sign-in');
  }

  const [{ t, lang }, bridge] = await Promise.all([getI18n(), bridgeStatus()]);

  const integrations = [
    {
      label: t('Weiterleitung Kontaktformular', 'Contact form fan-out'),
      variable: 'CONTACT_WEBHOOK_URL',
      configured: hasEnv('CONTACT_WEBHOOK_URL'),
    },
    {
      label: t('Gruppen- und Firmenanfragen', 'Group and company briefs'),
      variable: 'GROUP_INQUIRY_WEBHOOK_URL',
      configured: hasEnv('GROUP_INQUIRY_WEBHOOK_URL'),
    },
    {
      label: t('Kursanmeldungen', 'Course registrations'),
      variable: 'COURSE_REGISTRATION_WEBHOOK_URL',
      configured: hasEnv('COURSE_REGISTRATION_WEBHOOK_URL'),
    },
    {
      label: t('Prüfungsanmeldungen', 'Exam registrations'),
      variable: 'EXAM_REGISTRATION_WEBHOOK_URL',
      configured: hasEnv('EXAM_REGISTRATION_WEBHOOK_URL'),
    },
    {
      label: t('Bewerbungen', 'Career applications'),
      variable: 'CAREERS_APPLICATION_WEBHOOK_URL',
      configured: hasEnv('CAREERS_APPLICATION_WEBHOOK_URL'),
    },
    {
      label: t('Übergabe der Einstufungsergebnisse', 'Placement result hand-off'),
      variable: 'PLACEMENT_RESULT_WEBHOOK_URL',
      configured: hasEnv('PLACEMENT_RESULT_WEBHOOK_URL'),
    },
  ];

  const microsoftMail =
    hasEnv('FORM_MAIL_FROM') && hasEnv('IDENTITY_ENDPOINT') && hasEnv('IDENTITY_HEADER');

  return (
    <>
      <PageHeader title={t('Einstellungen', 'Settings')} />

      {/*
       * The deployment's connections in the wide column, the facts that are
       * read at a glance — who you are, the placement engine, the way into
       * setup — in the narrow one, the record screens' split.
       */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <Card title={t('E-Mails der Website', 'Website email')} icon={Icon.mail} tint="blue">
            <DetailList
              items={[
                {
                  label: t('Versandmodus', 'Delivery mode'),
                  value: delivery.test ? (
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Status tone="warning">{t('Test', 'Testing')}</Status>
                      {t('Jedes Formular geht an admin@casa-bremen.de', 'Every form goes to admin@casa-bremen.de')}
                    </span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Status tone="positive">{t('Live', 'Live')}</Status>
                      {t('Empfänger sind pro Formular festgelegt', 'Recipients are set per form')}
                    </span>
                  ),
                },
                {
                  label: 'Microsoft 365',
                  value: microsoftMail
                    ? t('Eingerichtet', 'Configured')
                    : t('Absenderverbindung nicht eingerichtet', 'Sender connection not configured'),
                },
              ]}
            />
          </Card>

          <Card title="SchoolMan" icon={Icon.clock} tint="ink">
            <DetailList
              items={[
                {
                  label: t('Zuletzt übernommen', 'Last transfer'),
                  value: bridge?.readAt ? bridgeTime(bridge.readAt, t, lang) : t('Noch nicht', 'Not yet'),
                },
                {
                  label: t('Letzte Übernahme', 'Latest transfer'),
                  value: !bridge ? (
                    '—'
                  ) : bridge.lastFailed ? (
                    <Status tone="danger">{t('Fehlgeschlagen', 'Failed')}</Status>
                  ) : (
                    <Status tone="positive">{t('Vollständig', 'Complete')}</Status>
                  ),
                },
              ]}
            />
          </Card>

          <Card
            title={t('Anbindungen', 'Integrations')}
            icon={Icon.external}
            tint="ink"
            bleed
          >
            <ul className="divide-y divide-ws-line-soft">
              {integrations.map((integration) => (
                <li
                  key={integration.variable}
                  title={integration.variable}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3"
                >
                  <span className="min-w-0 text-[0.875rem] font-semibold text-[var(--casa-ink)]">{integration.label}</span>
                  {integration.configured ? (
                    delivery.test ? (
                      <Status tone="warning">{t('Im Test übersprungen', 'Bypassed for testing')}</Status>
                    ) : (
                      <Status tone="positive">{t('Verbunden', 'Connected')}</Status>
                    )
                  ) : (
                    <Status tone="quiet">{t('Nicht verbunden', 'Not connected')}</Status>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title={t('Dein Konto', 'Your account')} icon={Icon.person} tint="green">
            <DetailList
              items={[
                { label: t('Name', 'Name'), value: user.name },
                { label: t('Rolle', 'Role'), value: roleLabel(user.role, lang) },
                { label: t('E-Mail', 'Email'), value: user.email, wide: true },
              ]}
            />
          </Card>

          <Card title={t('Einstufungstest', 'Placement engine')} icon={Icon.placement} tint="red">
            <DetailList
              items={[
                {
                  label: t('Freigabemodus', 'Release mode'),
                  value: (
                    <Status tone={RELEASE_MODE === 'live' ? 'positive' : 'warning'}>
                      {RELEASE_MODE === 'live' ? t('Live', 'Live') : t('Schattenbetrieb', 'Shadow')}
                    </Status>
                  ),
                },
                { label: t('Version der Grenzwerte', 'Cut score version'), value: t(`Version ${POLICY_VERSION}`, `Policy version ${POLICY_VERSION}`) },
                {
                  label: t('Hören', 'Listening'),
                  value: LISTENING_AUDIO_AVAILABLE ? t('Gemessen', 'Measured') : <Status tone="warning">{t('Nicht gemessen', 'Not measured')}</Status>,
                },
                {
                  label: t('Aufgabenpool', 'Item bank'),
                  value: <Status tone="warning">{t('Pilot, nicht geprüft', 'Pilot, unreviewed')}</Status>,
                },
              ]}
            />
          </Card>

          <Card title={t('Einrichtung', 'Setup')} icon={Icon.catalogue} tint="ink" bleed>
            <ul className="divide-y divide-ws-line-soft">
              {[
                ...(canAccess(user, 'prices')
                  ? [{ href: '/admin/settings/prices', label: t('Preise', 'Prices') }]
                  : []),
                { href: '/admin/settings/setup', label: t('Listen', 'Lists') },
                ...(canAccess(user, 'rooms') ? [{ href: '/admin/settings/rooms', label: t('Räume', 'Rooms') }] : []),
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-[#f7f9fc]"
                  >
                    <span className="min-w-0 text-sm font-semibold text-[var(--casa-ink)]">{item.label}</span>
                    <span aria-hidden="true" className="text-[var(--casa-text-subtle)]">
                      {Icon.chevronRight}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

/** Presence only. The value never leaves the server. */
function hasEnv(name: string): boolean {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}
