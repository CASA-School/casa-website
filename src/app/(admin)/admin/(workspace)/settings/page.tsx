import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Icon } from '@/components/admin/icons';
import { roleLabel } from '@/components/admin/shell';
import { Status } from '@/components/admin/list';
import { Card, DetailList, PageHeader } from '@/components/admin/ui';
import { canAccess } from '@/lib/admin/access';
import { getStaffUser } from '@/lib/admin/auth';
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

  const integrations = [
    {
      label: 'Contact form fan-out',
      variable: 'CONTACT_WEBHOOK_URL',
      configured: hasEnv('CONTACT_WEBHOOK_URL'),
    },
    {
      label: 'Group and company briefs',
      variable: 'GROUP_INQUIRY_WEBHOOK_URL',
      configured: hasEnv('GROUP_INQUIRY_WEBHOOK_URL'),
    },
    {
      label: 'Course registrations',
      variable: 'COURSE_REGISTRATION_WEBHOOK_URL',
      configured: hasEnv('COURSE_REGISTRATION_WEBHOOK_URL'),
    },
    {
      label: 'Exam registrations',
      variable: 'EXAM_REGISTRATION_WEBHOOK_URL',
      configured: hasEnv('EXAM_REGISTRATION_WEBHOOK_URL'),
    },
    {
      label: 'Career applications',
      variable: 'CAREERS_APPLICATION_WEBHOOK_URL',
      configured: hasEnv('CAREERS_APPLICATION_WEBHOOK_URL'),
    },
    {
      label: 'Placement result hand-off',
      variable: 'PLACEMENT_RESULT_WEBHOOK_URL',
      configured: hasEnv('PLACEMENT_RESULT_WEBHOOK_URL'),
    },
  ];

  const microsoftMail =
    hasEnv('FORM_MAIL_FROM') && hasEnv('IDENTITY_ENDPOINT') && hasEnv('IDENTITY_HEADER');

  return (
    <>
      <PageHeader title="Settings" />

      {/*
       * The deployment's connections in the wide column, the facts that are
       * read at a glance — who you are, the placement engine, the way into
       * setup — in the narrow one, the record screens' split.
       */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <Card title="Website email" icon={Icon.mail} tint="blue">
            <DetailList
              items={[
                {
                  label: 'Delivery mode',
                  value: delivery.test ? (
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Status tone="warning">Testing</Status>
                      Every form goes to admin@casa-bremen.de
                    </span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Status tone="positive">Live</Status>
                      Recipients are set per form
                    </span>
                  ),
                },
                {
                  label: 'Microsoft 365',
                  value: microsoftMail ? 'Configured' : 'Sender connection not configured',
                },
              ]}
            />
          </Card>

          <Card
            title="Integrations"
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
                      <Status tone="warning">Bypassed for testing</Status>
                    ) : (
                      <Status tone="positive">Connected</Status>
                    )
                  ) : (
                    <Status tone="quiet">Not connected</Status>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Your account" icon={Icon.person} tint="green">
            <DetailList
              items={[
                { label: 'Name', value: user.name },
                { label: 'Role', value: roleLabel(user.role) },
                { label: 'Email', value: user.email, wide: true },
              ]}
            />
          </Card>

          <Card title="Placement engine" icon={Icon.placement} tint="red">
            <DetailList
              items={[
                {
                  label: 'Release mode',
                  value: (
                    <Status tone={RELEASE_MODE === 'live' ? 'positive' : 'warning'}>
                      {RELEASE_MODE.charAt(0).toUpperCase() + RELEASE_MODE.slice(1)}
                    </Status>
                  ),
                },
                { label: 'Cut score version', value: `Policy version ${POLICY_VERSION}` },
                {
                  label: 'Listening',
                  value: LISTENING_AUDIO_AVAILABLE ? 'Measured' : <Status tone="warning">Not measured</Status>,
                },
                { label: 'Item bank', value: <Status tone="warning">Pilot, unreviewed</Status> },
              ]}
            />
          </Card>

          <Card title="Setup" icon={Icon.catalogue} tint="ink" bleed>
            <ul className="divide-y divide-ws-line-soft">
              {[
                ...(canAccess(user, 'prices')
                  ? [{ href: '/admin/settings/prices', label: 'Prices' }]
                  : []),
                { href: '/admin/settings/setup', label: 'Lists' },
                ...(canAccess(user, 'rooms') ? [{ href: '/admin/settings/rooms', label: 'Rooms' }] : []),
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
